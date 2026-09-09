create table if not exists public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company text not null,
  service text not null,
  message text not null,
  status text not null default 'new' check (status in ('new', 'reviewing', 'quoted', 'closed')),
  created_at timestamptz not null default now()
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  invoice_number text not null unique,
  description text not null,
  amount_cents integer not null check (amount_cents >= 0),
  status text not null default 'draft' check (status in ('draft', 'sent', 'paid', 'cancelled')),
  due_date date,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.quote_requests enable row level security;
alter table public.invoices enable row level security;

create policy "Users create own quote requests" on public.quote_requests
for insert to authenticated with check (user_id = auth.uid());
create policy "Users read own quote requests" on public.quote_requests
for select to authenticated using (user_id = auth.uid());
create policy "Managers manage quote requests" on public.quote_requests
for all to authenticated using ((auth.jwt()->'app_metadata'->>'role') = 'manager')
with check ((auth.jwt()->'app_metadata'->>'role') = 'manager');

create policy "Users read own invoices" on public.invoices
for select to authenticated using (user_id = auth.uid());
create policy "Managers manage invoices" on public.invoices
for all to authenticated using ((auth.jwt()->'app_metadata'->>'role') = 'manager')
with check ((auth.jwt()->'app_metadata'->>'role') = 'manager');
