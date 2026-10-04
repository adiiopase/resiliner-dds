-- ============================================================================
-- Migration: Ajout du numéro de licence (license_number) et index
-- Date: 10 Septembre 2026
-- ============================================================================

alter table public.user_licenses
  add column if not exists license_number text;

-- Index pour recherche rapide par numéro de licence
create index if not exists idx_user_licenses_number on public.user_licenses(license_number);
