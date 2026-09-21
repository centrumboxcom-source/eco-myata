-- Ciphertext only. No authenticated/anonymous policy or table grant.
create table public.integration_secrets(
id text primary key check(id in ('NOVA_POSHTA_API_KEY','MONOBANK_TOKEN','LIQPAY_PUBLIC_KEY','LIQPAY_PRIVATE_KEY','TELEGRAM_BOT_TOKEN','RESEND_API_KEY')),
encrypted_value text not null,version uuid not null default gen_random_uuid(),updated_at timestamptz not null default now(),updated_by uuid);
alter table public.integration_secrets enable row level security;
revoke all on public.integration_secrets from public,anon,authenticated;
grant all on public.integration_secrets to service_role;
create table public.integration_secret_audit(id bigint generated always as identity primary key,integration_id text not null,action text not null,actor uuid not null,created_at timestamptz not null default now());
alter table public.integration_secret_audit enable row level security;
revoke all on public.integration_secret_audit from public,anon,authenticated;
grant all on public.integration_secret_audit to service_role;
grant usage,select on sequence public.integration_secret_audit_id_seq to service_role;
create function public.write_integration_secret(p_id text,p_encrypted text,p_expected_version uuid,p_actor uuid) returns void language plpgsql security definer set search_path=public as $$
declare previous uuid;verb text;
begin
if p_id not in ('NOVA_POSHTA_API_KEY','MONOBANK_TOKEN','LIQPAY_PUBLIC_KEY','LIQPAY_PRIVATE_KEY','TELEGRAM_BOT_TOKEN','RESEND_API_KEY') then raise exception 'INVALID_INTEGRATION';end if;
if not exists(select 1 from profiles where id=p_actor and role='admin') then raise exception 'FORBIDDEN';end if;
perform pg_advisory_xact_lock(hashtextextended('integration:'||p_id,0));
select version into previous from integration_secrets where id=p_id;
if previous is distinct from p_expected_version then raise exception 'SECRET_CHANGED';end if;
if p_encrypted is null then
delete from integration_secrets where id=p_id;verb:='deleted';
else
if length(p_encrypted)>15000 or length(p_encrypted)<40 then raise exception 'INVALID_SECRET';end if;
insert into integration_secrets(id,encrypted_value,updated_by) values(p_id,p_encrypted,p_actor)
on conflict(id) do update set encrypted_value=excluded.encrypted_value,version=gen_random_uuid(),updated_at=now(),updated_by=p_actor;
verb:=case when previous is null then 'created' else 'replaced' end;
end if;
insert into integration_secret_audit(integration_id,action,actor) values(p_id,verb,p_actor);
end $$;
revoke all on function public.write_integration_secret(text,text,uuid,uuid) from public,anon,authenticated;
grant execute on function public.write_integration_secret(text,text,uuid,uuid) to service_role;
