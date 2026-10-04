-- ============================================================================
-- Migration: Table user_licenses & Extension table invoices pour scan mobile
-- Date: 10 Septembre 2026
-- ============================================================================

-- 1. Table user_licenses
create table if not exists public.user_licenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  license_type text not null check (license_type in ('monthly', 'yearly', 'per-mb', 'custom')),
  plan_name text not null,
  valid_from timestamptz not null default now(),
  valid_until timestamptz not null,
  storage_quota_bytes bigint not null default 52428800, -- 50 Mo par défaut pour licence mensuelle
  status text not null default 'active' check (status in ('active', 'expired', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Activation RLS
alter table public.user_licenses enable row level security;

-- Policies user_licenses
drop policy if exists "Users read own licenses" on public.user_licenses;
create policy "Users read own licenses"
on public.user_licenses for select to authenticated
using (user_id = auth.uid());

drop policy if exists "Users insert own licenses" on public.user_licenses;
create policy "Users insert own licenses"
on public.user_licenses for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "Managers manage all licenses" on public.user_licenses;
create policy "Managers manage all licenses"
on public.user_licenses for all to authenticated
using ((auth.jwt()->'app_metadata'->>'role') = 'manager')
with check ((auth.jwt()->'app_metadata'->>'role') = 'manager');

-- 2. Enrichissement de la table invoices
alter table public.invoices
  add column if not exists source text default 'mobile-scan',
  add column if not exists customer_confirmed boolean not null default true,
  add column if not exists validated_by_admin boolean not null default true,
  add column if not exists license_id uuid references public.user_licenses(id) on delete set null,
  add column if not exists metadata jsonb default '{}'::jsonb;

-- Policy pour permettre aux utilisateurs d'insérer leurs factures de scan
drop policy if exists "Users insert own invoices" on public.invoices;
create policy "Users insert own invoices"
on public.invoices for insert to authenticated
with check (user_id = auth.uid());

-- Index pour recherche rapide de licence active
create index if not exists idx_user_licenses_active on public.user_licenses(user_id, status, valid_until);
