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

