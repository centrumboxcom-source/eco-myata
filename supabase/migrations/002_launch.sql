-- Apply after 001_store.sql. Safe to re-run.
alter table public.products add column if not exists brand text not null default '';
alter table public.products add column if not exists gtin text not null default '';
alter table public.products add column if not exists mpn text not null default '';
alter table public.products add column if not exists identifier_exists boolean not null default true;
alter table public.products add column if not exists google_category text not null default '';
alter table public.products add column if not exists merchant_enabled boolean not null default false;
alter table public.products add column if not exists additional_images text[] not null default '{}';
alter table public.orders add column if not exists payment_review boolean not null default false;
create unique index if not exists orders_invoice_unique on public.orders(invoice_id) where invoice_id is not null;
-- Serialize tree mutations so concurrent edits cannot create a cycle.
create or replace function public.check_category_cycle() returns trigger language plpgsql set search_path=public as $$
begin
 perform pg_advisory_xact_lock(743925);
 if new.parent_id is not null and exists(with recursive parents as (
 select id,parent_id from categories where id=new.parent_id union select c.id,c.parent_id from categories c join parents p on c.id=p.parent_id
 ) select 1 from parents where id=new.id) then raise exception 'CATEGORY_CYCLE';end if;
 return new;
end $$;
drop trigger if exists category_cycle on public.categories;
create trigger category_cycle before insert or update of parent_id on public.categories for each row execute function public.check_category_cycle();
-- All bank callbacks use a locked, idempotent transition. A late payment on a cancelled order is flagged for reconciliation.
create or replace function public.record_payment(p_id uuid,p_state text) returns void language plpgsql security definer set search_path=public as $$
declare o orders%rowtype;
begin
 if p_state not in ('paid','failed') then raise exception 'INVALID_PAYMENT';end if;
 select * into o from orders where id=p_id for update;
 if not found then raise exception 'NOT_FOUND';end if;
 if o.payment_status in ('paid','refunded') then return;end if;
 update orders set payment_status=p_state,payment_review=(p_state='paid' and status='Скасовано') where id=p_id;
end $$;
revoke all on function public.record_payment(uuid,text) from public,anon,authenticated;
grant execute on function public.record_payment(uuid,text) to service_role;
create or replace function public.set_manual_payment(p_id uuid,p_state text) returns void language plpgsql security definer set search_path=public as $$
declare o orders%rowtype;
begin
 if not is_admin() then raise exception 'FORBIDDEN';end if;
 select * into o from orders where id=p_id for update;
 if not found then raise exception 'NOT_FOUND';end if;
 if p_state='paid' and o.payment in ('cod','bank') and o.status<>'Скасовано' then
 update orders set payment_status='paid' where id=p_id;
 elsif p_state='refunded' and o.payment_status='paid' then
 update orders set payment_status='refunded',payment_review=false where id=p_id;
 else raise exception 'INVALID_PAYMENT_TRANSITION';end if;
end $$;
revoke all on function public.set_manual_payment(uuid,text) from public,anon;
grant execute on function public.set_manual_payment(uuid,text) to authenticated;
alter table public.orders add column if not exists payment_started_at timestamptz;
-- Protect paid/in-flight online orders from premature stock restoration.
create or replace function public.update_order_status(p_id uuid,p_status text,p_ttn text default null) returns void language plpgsql security definer set search_path=public as $$
declare o orders%rowtype;item jsonb;
begin
 if not is_admin() then raise exception 'FORBIDDEN';end if;
 if p_status not in ('Нове','В обробці','Відправлено','Виконано','Скасовано') then raise exception 'INVALID_STATUS';end if;
 select * into o from orders where id=p_id for update;
 if not found then raise exception 'NOT_FOUND';end if;
 if o.status='Скасовано' and p_status<>'Скасовано' then raise exception 'CANCELLED_ORDER_CANNOT_REOPEN';end if;
 if p_status='Скасовано' and o.status<>'Скасовано' then
 if o.payment_status='paid' then raise exception 'REFUND_REQUIRED';end if;
 if o.payment_started_at is not null and o.payment_status='pending' then raise exception 'PAYMENT_PENDING';end if;
 for item in select * from jsonb_array_elements(o.items) order by value->>'id' loop update products set stock=stock+(item->>'quantity')::integer where id=item->>'id';end loop;
 if o.promo_id is not null then update promocodes set uses=greatest(0,uses-1) where id=o.promo_id;end if;
 end if;
 update orders set status=p_status,ttn=coalesce(p_ttn,ttn) where id=p_id;
end $$;
-- General store reviews require a completed purchase; product reviews require that product.
drop policy if exists reviews_insert on public.reviews;
create policy reviews_insert on public.reviews for insert to authenticated with check(user_id=auth.uid() and approved=false and exists(
 select 1 from orders o where o.user_id=auth.uid() and o.status='Виконано' and (reviews.product_id is null or exists(select 1 from jsonb_array_elements(o.items) item where item->>'id'=reviews.product_id))));

create or replace function public.claim_payment_attempt(p_id uuid) returns boolean language plpgsql security definer set search_path=public as $$
declare o orders%rowtype;
begin
 select * into o from orders where id=p_id for update;
 if not found or o.status='Скасовано' or o.payment_status in ('paid','refunded') or o.payment_started_at is not null then return false;end if;
 update orders set payment_started_at=now() where id=p_id;return true;
end $$;
revoke all on function public.claim_payment_attempt(uuid) from public,anon,authenticated;
grant execute on function public.claim_payment_attempt(uuid) to service_role;

create or replace function public.dashboard_stats(p_days integer default 30) returns jsonb language plpgsql security definer set search_path=public as $$
declare first_day date;start_at timestamptz;result jsonb;
begin
 if not is_admin() then raise exception 'FORBIDDEN';end if;
 if p_days not in (1,7,30) then raise exception 'INVALID_PERIOD';end if;
 first_day=(now() at time zone 'Europe/Kyiv')::date-(p_days-1);start_at=first_day::timestamp at time zone 'Europe/Kyiv';
 select jsonb_build_object('orders',count(*),'average',coalesce(avg(total) filter(where status<>'Скасовано'),0),'revenue',coalesce(sum(total) filter(where status<>'Скасовано' and payment_status<>'refunded' and (payment_status='paid' or status='Виконано')),0),'stock_count',(select count(*) from products where active and stock>0),'days',(select jsonb_agg(jsonb_build_object('day',d::date::text,'orders',(select count(*) from orders where (created_at at time zone 'Europe/Kyiv')::date=d::date),'revenue',coalesce((select sum(total) from orders where (created_at at time zone 'Europe/Kyiv')::date=d::date and status<>'Скасовано' and payment_status<>'refunded' and (payment_status='paid' or status='Виконано')),0)) order by d) from generate_series(first_day::timestamp,(now() at time zone 'Europe/Kyiv')::date::timestamp,interval '1 day') d)) into result from orders where created_at>=start_at;
 return result;
end $$;
revoke all on function public.dashboard_stats(integer) from public,anon;
grant execute on function public.dashboard_stats(integer) to authenticated;
