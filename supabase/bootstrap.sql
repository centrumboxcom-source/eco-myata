begin;
-- Run once in a new Supabase project's SQL editor.
create extension if not exists pgcrypto;
create table public.profiles(id uuid primary key references auth.users on delete cascade, role text not null default 'customer' check(role in ('customer','admin')));
create function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from profiles where id=auth.uid() and role='admin') $$;
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$ begin insert into profiles(id) values(new.id);return new;end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
create table public.categories(id text primary key,name text not null,parent_id text references categories(id) on delete restrict,sort_order integer not null default 0,check(parent_id is distinct from id));
create table public.products(id text primary key,slug text not null unique,name text not null,category text not null references categories(id),price numeric(12,2) not null check(price>0),old_price numeric(12,2),weight text not null,stock integer not null default 0 check(stock>=0),tags text[] not null default '{}',image text not null,description text not null default '',ingredients text not null default '',nutrition jsonb not null default '{"kcal":0,"protein":0,"fat":0,"carbs":0}',featured boolean not null default false,active boolean not null default true,created_at timestamptz not null default now());
create table public.promocodes(id uuid primary key default gen_random_uuid(),code text not null unique,type text not null check(type in ('percent','fixed')),value numeric(12,2) not null check(value>0 and (type<>'percent' or value<=100)),min_order numeric(12,2) not null default 0,max_uses integer check(max_uses>0),uses integer not null default 0,expires_at timestamptz,active boolean not null default true);
create table public.orders(id uuid primary key default gen_random_uuid(),request_id uuid not null unique,user_id uuid references auth.users on delete set null,name text not null,last_name text not null,phone text not null,email text not null,city text not null,address text not null,city_ref text,warehouse_ref text,delivery text not null,payment text not null,payment_status text not null default 'pending' check(payment_status in ('pending','paid','failed','refunded')),status text not null default 'Нове' check(status in ('Нове','В обробці','Відправлено','Виконано','Скасовано')),subtotal numeric(12,2) not null,total numeric(12,2) not null,discount numeric(12,2) not null default 0,promo_id uuid references promocodes(id) on delete set null,items jsonb not null,comment text,ttn text,invoice_id text,payment_url text,created_at timestamptz not null default now());
create index orders_created_at on public.orders(created_at desc);
create index orders_user_id on public.orders(user_id);
create table public.posts(id uuid primary key default gen_random_uuid(),slug text not null unique,title text not null,excerpt text not null default '',content text not null default '',image text not null default '',published boolean not null default false,created_at timestamptz not null default now());
create table public.settings(id text primary key,value jsonb not null);
create table public.subscribers(email text primary key,created_at timestamptz not null default now());
create table public.reviews(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users on delete set null,product_id text references products(id),name text not null,rating integer not null check(rating between 1 and 5),body text not null,approved boolean not null default false,created_at timestamptz not null default now());
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.promocodes enable row level security;
alter table public.orders enable row level security;
alter table public.posts enable row level security;
alter table public.settings enable row level security;
alter table public.subscribers enable row level security;
alter table public.reviews enable row level security;
create policy own_profile on profiles for select to authenticated using(id=auth.uid() or is_admin());
-- Role assignment is deliberately restricted to the SQL editor/service role.
create policy categories_read on categories for select using(true);
create policy categories_admin on categories for all to authenticated using(is_admin()) with check(is_admin());
create policy products_read on products for select using(active or is_admin());
create policy products_admin on products for all to authenticated using(is_admin()) with check(is_admin());
create policy coupons_admin on promocodes for all to authenticated using(is_admin()) with check(is_admin());
create policy orders_read on orders for select to authenticated using(user_id=auth.uid() or is_admin());
-- Orders are created server-side only, through place_order. Status through update_order_status.
create policy posts_read on posts for select using(published or is_admin());
create policy posts_admin on posts for all to authenticated using(is_admin()) with check(is_admin());
create policy settings_admin on settings for all to authenticated using(is_admin()) with check(is_admin());
create policy subscribers_admin on subscribers for select to authenticated using(is_admin());
create policy reviews_read on reviews for select using(approved or is_admin());
create policy reviews_admin on reviews for all to authenticated using(is_admin()) with check(is_admin());
create policy reviews_insert on reviews for insert to authenticated with check(user_id=auth.uid() and approved=false and exists(select 1 from orders where user_id=auth.uid() and status='Виконано'));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('products','products',true,5242880,array['image/jpeg','image/png','image/webp']) on conflict do nothing;
create policy product_images_read on storage.objects for select using(bucket_id='products');
create policy product_images_admin on storage.objects for all to authenticated using(bucket_id='products' and public.is_admin()) with check(bucket_id='products' and public.is_admin());
create function public.quote_cart(p_items jsonb,p_code text default '') returns jsonb language plpgsql security definer set search_path=public as $$
declare item record; prod products%rowtype; coupon promocodes%rowtype; subtotal numeric:=0; discount numeric:=0;
begin
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 or jsonb_array_length(p_items)>100 then raise exception 'INVALID_CART';end if;
 for item in select x->>'id' as id,sum((x->>'quantity')::integer) as qty from jsonb_array_elements(p_items) x group by x->>'id' loop
  if item.qty<1 or item.qty>100 then raise exception 'INVALID_QUANTITY';end if;
  select * into prod from products where id=item.id and active;
  if not found or prod.stock<item.qty then raise exception 'STOCK_CHANGED';end if;
  subtotal:=subtotal+prod.price*item.qty;
 end loop;
 if trim(p_code)<>'' then
  select * into coupon from promocodes where code=upper(trim(p_code)) and active and (expires_at is null or expires_at>now()) and (max_uses is null or uses<max_uses);
  if not found or subtotal<coupon.min_order then raise exception 'PROMO_INVALID';end if;
  discount:=least(subtotal,case when coupon.type='percent' then round(subtotal*coupon.value/100,2) else coupon.value end);
 end if;
 return jsonb_build_object('subtotal',subtotal,'discount',discount,'total',subtotal-discount,'promo_id',coupon.id);
end $$;
create function public.place_order(p_payload jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare result orders%rowtype; item record; prod products%rowtype; quote jsonb; snapshots jsonb:='[]'; ipromo uuid;
begin
 -- Same request key serializes double submissions before inventory is touched.
 perform pg_advisory_xact_lock(hashtextextended(p_payload->>'requestId',0));
 select * into result from orders where request_id=(p_payload->>'requestId')::uuid;
 if found then return jsonb_build_object('id',result.id,'total',result.total);end if;
 -- Stable lock order prevents overselling and minimizes deadlocks.
 perform 1 from products where id in(select x->>'id' from jsonb_array_elements(p_payload->'items') x) order by id for update;
 if coalesce(p_payload->>'promo','')<>'' then perform 1 from promocodes where code=upper(trim(p_payload->>'promo')) for update;end if;
 quote:=quote_cart(p_payload->'items',coalesce(p_payload->>'promo',''));
 ipromo:=(quote->>'promo_id')::uuid;
 for item in select x->>'id' as id,sum((x->>'quantity')::integer) as qty from jsonb_array_elements(p_payload->'items') x group by x->>'id' loop
  select * into prod from products where id=item.id;
  update products set stock=stock-item.qty where id=item.id;
  snapshots:=snapshots||jsonb_build_array(jsonb_build_object('id',prod.id,'name',prod.name,'price',prod.price,'quantity',item.qty,'weight',prod.weight));
 end loop;
 if ipromo is not null then update promocodes set uses=uses+1 where id=ipromo;end if;
 insert into orders(request_id,user_id,name,last_name,phone,email,city,address,city_ref,warehouse_ref,delivery,payment,subtotal,total,discount,promo_id,items,comment)
 values((p_payload->>'requestId')::uuid,(p_payload->>'user_id')::uuid,p_payload->>'name',p_payload->>'lastName',p_payload->>'phone',p_payload->>'email',p_payload->>'city',p_payload->>'address',p_payload->>'cityRef',p_payload->>'warehouseRef',p_payload->>'delivery',p_payload->>'payment',(quote->>'subtotal')::numeric,(quote->>'total')::numeric,(quote->>'discount')::numeric,ipromo,snapshots,p_payload->>'comment') returning * into result;
 return jsonb_build_object('id',result.id,'total',result.total);
end $$;
create function public.update_order_status(p_id uuid,p_status text,p_ttn text default null) returns void language plpgsql security definer set search_path=public as $$
declare current_order orders%rowtype;item jsonb;
begin
 if not is_admin() then raise exception 'FORBIDDEN';end if;
 if p_status not in ('Нове','В обробці','Відправлено','Виконано','Скасовано') then raise exception 'INVALID_STATUS';end if;
 select * into current_order from orders where id=p_id for update;
 if not found then raise exception 'NOT_FOUND';end if;
 if current_order.status='Скасовано' and p_status<>'Скасовано' then raise exception 'CANCELLED_ORDER_CANNOT_REOPEN';end if;
 if p_status='Скасовано' and current_order.status<>'Скасовано' then
  if current_order.payment_status='paid' then raise exception 'REFUND_REQUIRED';end if;
  for item in select * from jsonb_array_elements(current_order.items) loop update products set stock=stock+(item->>'quantity')::integer where id=item->>'id';end loop;
  if current_order.promo_id is not null then update promocodes set uses=greatest(0,uses-1) where id=current_order.promo_id;end if;
 end if;
 update orders set status=p_status,ttn=coalesce(p_ttn,ttn) where id=p_id;
end $$;
revoke all on function quote_cart(jsonb,text),place_order(jsonb) from public,anon,authenticated;
grant execute on function quote_cart(jsonb,text),place_order(jsonb) to service_role;
revoke all on function update_order_status(uuid,text,text) from public,anon;
grant execute on function update_order_status(uuid,text,text) to authenticated;
insert into settings(id,value) values('store','{"name":"ЕКО М’ЯТА","description":"Крамниця природної користі","email":"","phone":"","instagram":"","iban":"","recipient":"","seo_visible":false,"np":true,"ukr":true,"courier":true,"cod":true,"mono":false,"liqpay":false,"bank":false,"free_shipping":1500}');

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

-- Apply after 001 and 002. Catalog editor, private notes, SEO and independent SKU variants.
alter table public.products add column if not exists sku text not null default '';
alter table public.products add column if not exists badge text not null default '';
alter table public.products add column if not exists seo_title text not null default '';
alter table public.products add column if not exists seo_description text not null default '';
alter table public.products add column if not exists search_keywords text not null default '';
alter table public.products add column if not exists noindex boolean not null default false;
alter table public.products add column if not exists category_ids text[] not null default '{}';
alter table public.products add column if not exists attributes jsonb not null default '[]';
alter table public.products add column if not exists attachments jsonb not null default '[]';
alter table public.products add column if not exists related_mode text not null default 'auto' check(related_mode in ('auto','manual','off'));
alter table public.products add column if not exists related_ids text[] not null default '{}';
alter table public.products add column if not exists related_category text not null default '';
alter table public.products add column if not exists related_limit integer not null default 4 check(related_limit between 1 and 12);
alter table public.products add column if not exists variant_group text not null default '';
alter table public.products add column if not exists variant_label text not null default '';
alter table public.products add column if not exists track_stock boolean not null default true;
alter table public.products add column if not exists available boolean not null default true;
alter table public.products add column if not exists updated_at timestamptz not null default now();
alter table public.categories add column if not exists description text not null default '';
alter table public.categories add column if not exists image text not null default '';
alter table public.categories add column if not exists seo_title text not null default '';
alter table public.categories add column if not exists seo_description text not null default '';
alter table public.categories add column if not exists noindex boolean not null default false;

create unique index if not exists products_sku_unique on public.products(lower(sku)) where sku<>'';
create index if not exists products_variant_group on public.products(variant_group) where variant_group<>'';
create table if not exists public.product_private(product_id text primary key references public.products(id) on delete cascade,internal_note text not null default '',tax_codes text not null default '');
alter table public.product_private enable row level security;
drop policy if exists private_admin on public.product_private;
create policy private_admin on public.product_private for all to authenticated using(is_admin()) with check(is_admin());
grant select,insert,update,delete on public.product_private to authenticated;
create table if not exists public.product_slug_history(slug text primary key,product_id text not null references public.products(id) on delete cascade);
alter table public.product_slug_history enable row level security;
drop policy if exists slug_history_read on public.product_slug_history;
create policy slug_history_read on public.product_slug_history for select using(exists(select 1 from products where id=product_id and active));
grant select on public.product_slug_history to anon,authenticated;
create or replace function public.catalog_product_guard() returns trigger language plpgsql security definer set search_path=public as $$
begin
 perform pg_advisory_xact_lock(743926);
 if exists(select 1 from product_slug_history where slug=new.slug and product_id<>new.id) then raise exception 'SLUG_RESERVED';end if;
 if exists(select 1 from unnest(new.category_ids) c where not exists(select 1 from categories where id=c)) then raise exception 'INVALID_CATEGORY';end if;
 if new.related_category<>'' and not exists(select 1 from categories where id=new.related_category) then raise exception 'INVALID_CATEGORY';end if;
 if exists(select 1 from unnest(new.related_ids) r where r=new.id or not exists(select 1 from products where id=r)) then raise exception 'INVALID_RELATED';end if;
 if tg_op='UPDATE' and old.slug<>new.slug then insert into product_slug_history(slug,product_id) values(old.slug,new.id) on conflict(slug) do nothing;end if;
 new.updated_at=clock_timestamp();return new;
end $$;
drop trigger if exists catalog_product_guard on public.products;
create trigger catalog_product_guard before insert or update on public.products for each row execute function public.catalog_product_guard();
create or replace function public.category_usage_guard() returns trigger language plpgsql set search_path=public as $$
begin
 if exists(select 1 from products where old.id=any(category_ids) or related_category=old.id) then raise exception 'CATEGORY_IN_USE';end if;return old;
end $$;
drop trigger if exists category_usage_guard on public.categories;
create trigger category_usage_guard before delete on public.categories for each row execute function public.category_usage_guard();

create or replace function public.save_catalog_product(p_product jsonb,p_internal_note text default '',p_tax_codes text default '') returns jsonb language plpgsql security definer set search_path=public as $$
declare old_product products%rowtype;saved products%rowtype;
begin
 if not is_admin() then raise exception 'FORBIDDEN';end if;
 select * into old_product from products where id=p_product->>'id' for update;
 if found and (p_product->>'updated_at' is null or old_product.updated_at<>(p_product->>'updated_at')::timestamptz) then raise exception 'PRODUCT_CHANGED';end if;
 insert into products(id,slug,name,category,price,old_price,weight,stock,tags,image,description,ingredients,nutrition,featured,active,brand,gtin,mpn,identifier_exists,google_category,merchant_enabled,additional_images,sku,badge,seo_title,seo_description,search_keywords,noindex,category_ids,attributes,attachments,related_mode,related_ids,related_category,related_limit,variant_group,variant_label,track_stock,available) select r.id,r.slug,r.name,r.category,r.price,r.old_price,r.weight,r.stock,r.tags,r.image,r.description,r.ingredients,r.nutrition,r.featured,r.active,r.brand,r.gtin,r.mpn,r.identifier_exists,r.google_category,r.merchant_enabled,r.additional_images,r.sku,r.badge,r.seo_title,r.seo_description,r.search_keywords,r.noindex,r.category_ids,r.attributes,r.attachments,r.related_mode,r.related_ids,r.related_category,r.related_limit,r.variant_group,r.variant_label,r.track_stock,r.available from jsonb_populate_record(null::products,p_product) r
 on conflict(id) do update set slug=excluded.slug,name=excluded.name,category=excluded.category,price=excluded.price,old_price=excluded.old_price,weight=excluded.weight,stock=excluded.stock,tags=excluded.tags,image=excluded.image,description=excluded.description,ingredients=excluded.ingredients,nutrition=excluded.nutrition,featured=excluded.featured,active=excluded.active,brand=excluded.brand,gtin=excluded.gtin,mpn=excluded.mpn,identifier_exists=excluded.identifier_exists,google_category=excluded.google_category,merchant_enabled=excluded.merchant_enabled,additional_images=excluded.additional_images,sku=excluded.sku,badge=excluded.badge,seo_title=excluded.seo_title,seo_description=excluded.seo_description,search_keywords=excluded.search_keywords,noindex=excluded.noindex,category_ids=excluded.category_ids,attributes=excluded.attributes,attachments=excluded.attachments,related_mode=excluded.related_mode,related_ids=excluded.related_ids,related_category=excluded.related_category,related_limit=excluded.related_limit,variant_group=excluded.variant_group,variant_label=excluded.variant_label,track_stock=excluded.track_stock,available=excluded.available returning * into saved;
 insert into product_private(product_id,internal_note,tax_codes) values(saved.id,p_internal_note,p_tax_codes) on conflict(product_id) do update set internal_note=excluded.internal_note,tax_codes=excluded.tax_codes;
 return to_jsonb(saved)||jsonb_build_object('internal_note',p_internal_note,'tax_codes',p_tax_codes);
end $$;
revoke all on function public.save_catalog_product(jsonb,text,text) from public,anon;
grant execute on function public.save_catalog_product(jsonb,text,text) to authenticated;

create or replace function public.quote_cart(p_items jsonb,p_code text default '') returns jsonb language plpgsql security definer set search_path=public as $$
declare item record; prod products%rowtype; coupon promocodes%rowtype; subtotal numeric:=0; discount numeric:=0;
begin
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 or jsonb_array_length(p_items)>100 then raise exception 'INVALID_CART';end if;
 for item in select x->>'id' as id,sum((x->>'quantity')::integer) as qty from jsonb_array_elements(p_items) x group by x->>'id' loop
  if item.qty<1 or item.qty>100 then raise exception 'INVALID_QUANTITY';end if;
  select * into prod from products where id=item.id and active;
  if not found or not prod.available or (prod.track_stock and prod.stock<item.qty) then raise exception 'STOCK_CHANGED';end if;
  subtotal:=subtotal+prod.price*item.qty;
 end loop;
 if trim(p_code)<>'' then
  select * into coupon from promocodes where code=upper(trim(p_code)) and active and (expires_at is null or expires_at>now()) and (max_uses is null or uses<max_uses);
  if not found or subtotal<coupon.min_order then raise exception 'PROMO_INVALID';end if;
  discount:=least(subtotal,case when coupon.type='percent' then round(subtotal*coupon.value/100,2) else coupon.value end);
 end if;
 return jsonb_build_object('subtotal',subtotal,'discount',discount,'total',subtotal-discount,'promo_id',coupon.id);
end $$;

create or replace function public.place_order(p_payload jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare result orders%rowtype; item record; prod products%rowtype; quote jsonb; snapshots jsonb:='[]'; ipromo uuid;
begin
 -- Same request key serializes double submissions before inventory is touched.
 perform pg_advisory_xact_lock(hashtextextended(p_payload->>'requestId',0));
 select * into result from orders where request_id=(p_payload->>'requestId')::uuid;
 if found then return jsonb_build_object('id',result.id,'total',result.total);end if;
 -- Stable lock order prevents overselling and minimizes deadlocks.
 perform 1 from products where id in(select x->>'id' from jsonb_array_elements(p_payload->'items') x) order by id for update;
 if coalesce(p_payload->>'promo','')<>'' then perform 1 from promocodes where code=upper(trim(p_payload->>'promo')) for update;end if;
 quote:=quote_cart(p_payload->'items',coalesce(p_payload->>'promo',''));
 ipromo:=(quote->>'promo_id')::uuid;
 for item in select x->>'id' as id,sum((x->>'quantity')::integer) as qty from jsonb_array_elements(p_payload->'items') x group by x->>'id' loop
  select * into prod from products where id=item.id;
  if prod.track_stock then update products set stock=stock-item.qty where id=item.id;end if;
  snapshots:=snapshots||jsonb_build_array(jsonb_build_object('id',prod.id,'name',prod.name,'price',prod.price,'quantity',item.qty,'weight',prod.weight,'sku',prod.sku,'variant_label',prod.variant_label,'track_stock',prod.track_stock));
 end loop;
 if ipromo is not null then update promocodes set uses=uses+1 where id=ipromo;end if;
 insert into orders(request_id,user_id,name,last_name,phone,email,city,address,city_ref,warehouse_ref,delivery,payment,subtotal,total,discount,promo_id,items,comment)
 values((p_payload->>'requestId')::uuid,(p_payload->>'user_id')::uuid,p_payload->>'name',p_payload->>'lastName',p_payload->>'phone',p_payload->>'email',p_payload->>'city',p_payload->>'address',p_payload->>'cityRef',p_payload->>'warehouseRef',p_payload->>'delivery',p_payload->>'payment',(quote->>'subtotal')::numeric,(quote->>'total')::numeric,(quote->>'discount')::numeric,ipromo,snapshots,p_payload->>'comment') returning * into result;
 return jsonb_build_object('id',result.id,'total',result.total);
end $$;

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
 for item in select * from jsonb_array_elements(o.items) order by value->>'id' loop if coalesce((item->>'track_stock')::boolean,true) then update products set stock=stock+(item->>'quantity')::integer where id=item->>'id';end if;end loop;
 if o.promo_id is not null then update promocodes set uses=greatest(0,uses-1) where id=o.promo_id;end if;
 end if;
 update orders set status=p_status,ttn=coalesce(p_ttn,ttn) where id=p_id;
end $$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('product-files','product-files',true,10485760,array['application/pdf']) on conflict do nothing;
drop policy if exists product_documents_read on storage.objects;
create policy product_documents_read on storage.objects for select using(bucket_id='product-files');
drop policy if exists product_documents_admin on storage.objects;
create policy product_documents_admin on storage.objects for all to authenticated using(bucket_id='product-files' and public.is_admin()) with check(bucket_id='product-files' and public.is_admin());

-- Configurable checkout. Snapshots preserve field labels on historical orders.
alter table public.orders add column if not exists custom_fields jsonb not null default '{}'::jsonb;
create or replace function public.place_order(p_payload jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare result orders%rowtype; item record; prod products%rowtype; quote jsonb; snapshots jsonb:='[]'; ipromo uuid; cfg jsonb; fld jsonb; val text; extras jsonb:='{}';
begin
 -- Same request key serializes double submissions before inventory is touched.
 perform pg_advisory_xact_lock(hashtextextended(p_payload->>'requestId',0));
 select * into result from orders where request_id=(p_payload->>'requestId')::uuid;
 if found then return jsonb_build_object('id',result.id,'total',result.total);end if;
 select coalesce(value->'commerce','{}'::jsonb) into cfg from settings where id='store';
 for fld in select * from jsonb_array_elements(coalesce(cfg->'extra_fields','[]'::jsonb)) loop
  val:=trim(coalesce(p_payload->'custom_fields'->>(fld->>'id'),''));
  if length(val)>1000 or ((fld->>'required')::boolean and (val='' or (fld->>'type'='checkbox' and val<>'on'))) then raise exception 'CHECKOUT_FIELD_REQUIRED';end if;
  if fld->>'type'='select' and val<>'' and not (fld->'options' ? val) then raise exception 'CHECKOUT_FIELD_INVALID';end if;
  if fld->>'type'='checkbox' and val not in ('','on') then raise exception 'CHECKOUT_FIELD_INVALID';end if;
  extras:=extras||jsonb_build_object(fld->>'id',jsonb_build_object('label',fld->>'label','value',case when fld->>'type'='checkbox' then case when val='on' then 'Так' else 'Ні' end else val end));
 end loop;
 -- Stable lock order prevents overselling and minimizes deadlocks.
 perform 1 from products where id in(select x->>'id' from jsonb_array_elements(p_payload->'items') x) order by id for update;
 if coalesce(p_payload->>'promo','')<>'' then perform 1 from promocodes where code=upper(trim(p_payload->>'promo')) for update;end if;
 quote:=quote_cart(p_payload->'items',coalesce(p_payload->>'promo',''));
 if (quote->>'total')::numeric<coalesce((cfg->>'minimum_order')::numeric,0) then raise exception 'MINIMUM_ORDER';end if;
 ipromo:=(quote->>'promo_id')::uuid;
 for item in select x->>'id' as id,sum((x->>'quantity')::integer) as qty from jsonb_array_elements(p_payload->'items') x group by x->>'id' loop
  select * into prod from products where id=item.id;
  if prod.track_stock then update products set stock=stock-item.qty where id=item.id;end if;
  snapshots:=snapshots||jsonb_build_array(jsonb_build_object('id',prod.id,'name',prod.name,'price',prod.price,'quantity',item.qty,'weight',prod.weight,'sku',prod.sku,'variant_label',prod.variant_label,'track_stock',prod.track_stock));
 end loop;
 if ipromo is not null then update promocodes set uses=uses+1 where id=ipromo;end if;
 insert into orders(request_id,user_id,name,last_name,phone,email,city,address,city_ref,warehouse_ref,delivery,payment,subtotal,total,discount,promo_id,items,comment,custom_fields)
 values((p_payload->>'requestId')::uuid,(p_payload->>'user_id')::uuid,p_payload->>'name',p_payload->>'lastName',p_payload->>'phone',p_payload->>'email',p_payload->>'city',p_payload->>'address',p_payload->>'cityRef',p_payload->>'warehouseRef',p_payload->>'delivery',p_payload->>'payment',(quote->>'subtotal')::numeric,(quote->>'total')::numeric,(quote->>'discount')::numeric,ipromo,snapshots,p_payload->>'comment',extras) returning * into result;
 return jsonb_build_object('id',result.id,'total',result.total);
end $$;


create table if not exists public.order_notifications(
id uuid primary key default gen_random_uuid(),order_id uuid not null references public.orders(id) on delete cascade,
channel text not null check(channel in ('telegram','staff_email','customer_email')),
recipient text not null,sender text not null default '',subject text not null,body text not null,
status text not null default 'pending' check(status in ('pending','sending','sent','failed','uncertain')),
attempts integer not null default 0,claim_id uuid,claimed_at timestamptz,sent_at timestamptz,error text not null default '',
created_at timestamptz not null default now(),unique(order_id,channel));
alter table public.order_notifications enable row level security;
create policy notification_admin_read on public.order_notifications for select to authenticated using(public.is_admin());
grant select on public.order_notifications to authenticated;
grant all on public.order_notifications to service_role;
create index notification_pending on public.order_notifications(status,created_at);
create or replace function public.queue_order_notifications() returns trigger language plpgsql security definer set search_path=public as $$
declare cfg jsonb;shop text;summary text;title text;
begin
select value->'notifications',coalesce(value->>'name','Магазин') into cfg,shop from settings where id='store';
title:='Замовлення '||left(new.id::text,8)||' · '||coalesce(shop,'Магазин');
summary:=title||E'\nСума: '||new.total::text||' UAH'||E'\nОплата: '||new.payment||E'\nСтатус оплати перевіряйте в адмінці.';
if coalesce((cfg->>'telegram_enabled')::boolean,false) then
insert into order_notifications(order_id,channel,recipient,subject,body) values(new.id,'telegram',cfg->>'telegram_chat_id',title,summary);
end if;
if coalesce((cfg->>'staff_email_enabled')::boolean,false) then
insert into order_notifications(order_id,channel,recipient,sender,subject,body) values(new.id,'staff_email',cfg->>'staff_email',cfg->>'sender_email',title,summary);
end if;
if coalesce((cfg->>'customer_email_enabled')::boolean,false) then
insert into order_notifications(order_id,channel,recipient,sender,subject,body) values(new.id,'customer_email',new.email,cfg->>'sender_email',title,
coalesce(cfg->>'email_heading','Дякуємо за замовлення!')||E'\n'||title||E'\nСума: '||new.total::text||' UAH'||E'\n'||coalesce((select string_agg((x->>'name')||' × '||(x->>'quantity'),E'\n') from jsonb_array_elements(new.items) x),'')||E'\n\nЗамовлення отримано. Цей лист не є підтвердженням оплати.'||E'\n'||coalesce(cfg->>'email_footer',''));
end if;
return new;
end $$;
create trigger queue_order_notifications after insert on public.orders for each row execute function public.queue_order_notifications();
create or replace function public.claim_order_notifications() returns setof public.order_notifications language plpgsql security definer set search_path=public as $$
begin
update order_notifications set status='uncertain',error='Обробку перервано. Перевірте доставку перед повтором.' where status='sending' and claimed_at<now()-interval '5 minutes';
return query with picked as(select id from order_notifications where status='pending' and attempts<5 order by created_at for update skip locked limit 5)
update order_notifications n set status='sending',claim_id=gen_random_uuid(),claimed_at=now(),attempts=attempts+1 from picked where n.id=picked.id returning n.*;
end $$;
revoke all on function public.claim_order_notifications() from public,anon,authenticated;
grant execute on function public.claim_order_notifications() to service_role;
revoke all on function public.queue_order_notifications() from public,anon,authenticated;

commit;
