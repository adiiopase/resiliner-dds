-- ============================================================================
-- Migration: Table ocr_processed_documents pour stockage et indexation plein texte
-- Date: 17 Septembre 2026
-- ============================================================================

create table if not exists public.ocr_processed_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid references public.documents(id) on delete set null,
  filename text not null,
  classified_type text not null default 'DOCUMENT_GENERAL',
  confidence_score numeric(5,2) default 0.00,
  full_text text not null default '',
  extracted_fields jsonb not null default '{}'::jsonb,
  processing_time_ms integer default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Activation RLS
alter table public.ocr_processed_documents enable row level security;

-- Policies
drop policy if exists "Users read own OCR records" on public.ocr_processed_documents;
create policy "Users read own OCR records"
  on public.ocr_processed_documents for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users insert own OCR records" on public.ocr_processed_documents;
create policy "Users insert own OCR records"
  on public.ocr_processed_documents for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Managers read all OCR records" on public.ocr_processed_documents;
create policy "Managers read all OCR records"
  on public.ocr_processed_documents for select to authenticated
  using (
    (auth.jwt()->'app_metadata'->>'role') = 'manager'
    or (auth.jwt()->>'email') = 'adiiopase@gmail.com'
  );

-- Index pour recherche rapide et plein texte
create index if not exists idx_ocr_documents_user on public.ocr_processed_documents(user_id);
create index if not exists idx_ocr_documents_type on public.ocr_processed_documents(classified_type);
