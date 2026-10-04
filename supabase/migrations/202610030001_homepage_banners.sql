create table if not exists public.homepage_banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  alt_text text not null default '',
  image_url text not null unique,
  storage_path text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.homepage_banners enable row level security;

drop policy if exists "Public can read active homepage banners" on public.homepage_banners;
create policy "Public can read active homepage banners"
  on public.homepage_banners for select
  using (is_active = true);

grant select on public.homepage_banners to anon, authenticated;
grant all on public.homepage_banners to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'home-carousel',
  'home-carousel',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

insert into public.homepage_banners (title, alt_text, image_url, sort_order)
values
  ('Bannière d’accueil', 'Digital Docs Solutions', '/images/carousel/bannieredds.png', 0),
  ('Gestion documentaire', 'Gestion numérique des documents', '/images/carousel/marvin-meyer-SYTO3xs06fU-unsplash.jpg', 1),
  ('Solution numérique', 'Solution numérique pour les entreprises', '/images/carousel/photo-1773332598451-8a0a59941912.avif', 2)
on conflict (image_url) do update
set title = excluded.title,
    alt_text = excluded.alt_text,
    sort_order = excluded.sort_order,
    is_active = true,
    updated_at = now();
