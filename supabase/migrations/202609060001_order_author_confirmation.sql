alter table public.order_requests
  add column if not exists author_confirmed boolean not null default false,
  add column if not exists author_confirmed_at timestamptz;

drop policy if exists "Users confirm own order requests" on public.order_requests;

create policy "Users confirm own order requests" on public.order_requests
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
