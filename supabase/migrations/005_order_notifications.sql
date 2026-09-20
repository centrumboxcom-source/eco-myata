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
