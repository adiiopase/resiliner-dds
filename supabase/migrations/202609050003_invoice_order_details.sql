alter table public.invoices
  add column if not exists product text,
  add column if not exists quantity numeric(12, 2),
  add column if not exists quantity_unit text,
  add column if not exists amount_ht_cents integer,
  add column if not exists vat_rate numeric(5, 2) not null default 20,
  add column if not exists total_ttc_cents integer;

update public.invoices
set total_ttc_cents = coalesce(total_ttc_cents, amount_cents),
    amount_ht_cents = coalesce(amount_ht_cents, amount_cents)
where total_ttc_cents is null or amount_ht_cents is null;

alter table public.invoices
  alter column total_ttc_cents set default 0;

alter table public.invoices
  add constraint invoices_quantity_check check (quantity is null or quantity > 0),
  add constraint invoices_vat_rate_check check (vat_rate >= 0 and vat_rate <= 100),
  add constraint invoices_total_ttc_check check (total_ttc_cents >= 0);
