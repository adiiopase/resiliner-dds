alter table public.quote_requests
  add column if not exists quantity numeric(12, 2),
  add column if not exists quantity_unit text;

alter table public.documents
  add column if not exists category text not null default 'Autre';

alter table public.quote_requests
  drop constraint if exists quote_requests_quantity_check;

alter table public.quote_requests
  add constraint quote_requests_quantity_check
  check (quantity is null or quantity > 0);
