-- ============================================================================
-- Migration: Table active_user_sessions pour suivi en temps réel des usagers
-- Date: 15 Septembre 2026
-- ============================================================================

create table if not exists public.active_user_sessions (
  user_id uuid primary key,
  email text not null,
  role text not null default 'user',
  connected_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  device text,
  location jsonb default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Activation RLS
alter table public.active_user_sessions enable row level security;

-- Policies
drop policy if exists "Authenticated users manage own active session" on public.active_user_sessions;
create policy "Authenticated users manage own active session"
  on public.active_user_sessions for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Managers read all active sessions" on public.active_user_sessions;
create policy "Managers read all active sessions"
  on public.active_user_sessions for select to authenticated
  using (
    (auth.jwt()->'app_metadata'->>'role') = 'manager'
    or (auth.jwt()->>'email') = 'adiiopase@gmail.com'
  );

-- Index pour requêtes rapides de sessions récentes
create index if not exists idx_active_user_sessions_last_seen on public.active_user_sessions(last_seen);
