alter table public.order_requests
  add column if not exists order_number text;

alter table public.invoices
  add column if not exists order_request_id uuid references public.order_requests(id) on delete set null;

create unique index if not exists order_requests_order_number_idx
  on public.order_requests(order_number)
  where order_number is not null;
