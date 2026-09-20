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
