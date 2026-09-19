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
