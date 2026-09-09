create table if not exists public.order_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company text not null,
  product text not null,
  quantity numeric(12, 2) not null check (quantity > 0),
  quantity_unit text not null,
  message text,
  status text not null default 'new' check (status in ('new', 'reviewing', 'confirmed', 'cancelled')),
  created_at timestamptz not null default now()
);

alter table public.order_requests enable row level security;

create policy "Users create own order requests" on public.order_requests
for insert to authenticated with check (user_id = auth.uid());
create policy "Users read own order requests" on public.order_requests
for select to authenticated using (user_id = auth.uid());
create policy "Managers manage order requests" on public.order_requests
for all to authenticated using ((auth.jwt()->'app_metadata'->>'role') = 'manager')
with check ((auth.jwt()->'app_metadata'->>'role') = 'manager');
