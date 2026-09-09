alter table public.invoices
  add column if not exists order_number text;
