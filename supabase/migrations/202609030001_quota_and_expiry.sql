-- Quota individuel de 2 MiB dans le quota global de 50 MiB.
create table if not exists public.user_quotas (
  user_id uuid primary key references auth.users(id) on delete cascade,
  quota_limit_bytes bigint not null default 2097152,
  used_bytes bigint not null default 0,
  window_started_at timestamptz not null default now(),
  blocked_until timestamptz,
  updated_at timestamptz not null default now()
);

create or replace function public.enforce_ten_user_limit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from auth.users) >= 10 then
    raise exception 'Le quota de 10 utilisateurs est atteint';
  end if;
  return new;
end;
$$;

drop trigger if exists limit_portal_users on auth.users;
create trigger limit_portal_users
before insert on auth.users
for each row execute function public.enforce_ten_user_limit();

alter table public.documents add column if not exists size_bytes bigint not null default 0;
alter table public.documents add column if not exists expires_at timestamptz not null default (now() + interval '48 hours');

create or replace function public.ensure_user_quota()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_quotas (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists create_user_quota on auth.users;
create trigger create_user_quota
after insert on auth.users
for each row execute function public.ensure_user_quota();

insert into public.user_quotas (user_id)
select id from auth.users
on conflict (user_id) do nothing;

-- Appliquer la nouvelle limite aux comptes déjà créés.
update public.user_quotas
set quota_limit_bytes = 2097152,
    updated_at = now();

create or replace function public.reserve_document_bytes(requested_bytes bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  quota public.user_quotas;
  current_user_id uuid := auth.uid();
  next_used bigint;
begin
  if current_user_id is null then
    raise exception 'Utilisateur non connecté';
  end if;
  if requested_bytes <= 0 then
    raise exception 'Taille de fichier invalide';
  end if;

  insert into public.user_quotas (user_id)
  values (current_user_id)
  on conflict (user_id) do nothing;

  select * into quota from public.user_quotas
  where user_id = current_user_id for update;

  if quota.blocked_until is not null and quota.blocked_until > now() then
    raise exception 'Quota temporairement bloqué jusqu''au %', quota.blocked_until;
  end if;

  if quota.window_started_at + interval '48 hours' <= now() then
    update public.user_quotas
    set used_bytes = 0, window_started_at = now(), blocked_until = null, updated_at = now()
    where user_id = current_user_id;
    quota.used_bytes := 0;
  end if;

  next_used := quota.used_bytes + requested_bytes;
  if next_used > quota.quota_limit_bytes then
    raise exception 'Quota de 2 Mo dépassé';
  end if;

  update public.user_quotas
  set used_bytes = next_used,
      blocked_until = case when next_used = quota_limit_bytes then now() + interval '7 days' else blocked_until end,
      updated_at = now()
  where user_id = current_user_id;

  return jsonb_build_object(
    'used_bytes', next_used,
    'limit_bytes', quota.quota_limit_bytes,
    'remaining_bytes', quota.quota_limit_bytes - next_used,
    'warning', next_used >= quota.quota_limit_bytes * 0.8
  );
end;
$$;

create or replace function public.release_document_bytes(released_bytes bigint)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.user_quotas
  set used_bytes = greatest(0, used_bytes - released_bytes), updated_at = now()
  where user_id = auth.uid();
end;
$$;

alter table public.user_quotas enable row level security;
drop policy if exists "Users read their quota" on public.user_quotas;
create policy "Users read their quota" on public.user_quotas for select using (user_id = auth.uid());

drop policy if exists "Users read their documents" on public.documents;
create policy "Users read their documents" on public.documents for select using (user_id = auth.uid());

-- À activer dans Supabase Dashboard si pg_cron n'est pas encore actif.
create or replace function public.cleanup_expired_documents()
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from storage.objects
  where bucket_id = 'documents'
    and name in (select path from public.documents where expires_at <= now());
  delete from public.documents where expires_at <= now();
end;
$$;

-- Après activation de pg_cron, exécuter une fois :
-- select cron.schedule('cleanup-expired-documents', '0 * * * *', $$select public.cleanup_expired_documents();$$);
