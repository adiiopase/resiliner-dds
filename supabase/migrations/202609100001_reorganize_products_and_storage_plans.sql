-- ============================================================================
-- Migration: Reorganisation de la table products et gestion des forfaits stockage
-- Date: 10 Septembre 2026
-- ============================================================================

create table if not exists public.products (
  id text primary key,
  product_code text unique not null,
  name text not null,
  category text not null,
  description text,
  details jsonb default '[]'::jsonb,
  price text,
  unit_price_ht numeric(12, 2) not null default 0,
  price_per_page numeric(10, 4),
  price_per_mb numeric(10, 4) default 0.10,
  default_unit text not null default 'unités',
  is_volume_based boolean not null default false,
  min_quantity numeric(12, 2) not null default 1,
  badge text,
  billing_frequency text default 'one-time', -- 'one-time', 'per-mb', 'monthly', 'yearly'
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Activation RLS
alter table public.products enable row level security;

-- Policy lecture pour tous
drop policy if exists "Tout le monde peut lire les produits actifs" on public.products;
create policy "Tout le monde peut lire les produits actifs"
on public.products for select
using (is_active = true);

-- Policy admin pour insertion / mise à jour
drop policy if exists "Managers can modify products" on public.products;
create policy "Managers can modify products"
on public.products for all
using (auth.uid() in (select id from auth.users where raw_app_meta_data->>'role' = 'manager'));

-- Peuplement et Réorganisation des Produits
insert into public.products (
  id, product_code, name, category, description, details, price,
  unit_price_ht, price_per_page, price_per_mb, default_unit, is_volume_based,
  min_quantity, badge, billing_frequency, sort_order, is_active
) values
  (
    'storage-mb',
    'STORAGE_MB',
    'Recharge Stockage Souverain (au Mo)',
    'Stockage & Cloud',
    'Paiement direct à la consommation pour les Mo occupés dans votre espace de stockage souverain.',
    '["0,10 € TTC par Mo occupé", "Facturation à l''usage réel", "Pas d''engagement de durée"]'::jsonb,
    '0,10 € / Mo',
    0.0833,
    null,
    0.10,
    'Mo',
    true,
    1,
    'À l''usage',
    'per-mb',
    1,
    true
  ),
  (
    'storage-monthly',
    'STORAGE_MONTHLY',
    'Licence Mensuelle Stockage & Scan Pro',
    'Abonnements & Licences',
    'Forfait mensuel tout-en-un : 50 Mo de stockage souverain inclus, Scan mobile illimité et OCR IA prioritaire.',
    '["50 Mo de stockage souverain inclus", "Dépassement de quota scan autorisé", "OCR IA haute précision illimité", "Prix : 9,90 € TTC / mois"]'::jsonb,
    '9,90 € / mois',
    8.25,
    null,
    0.08,
    'mois',
    false,
    1,
    'Recommandé',
    'monthly',
    2,
    true
  ),
  (
    'storage-yearly',
    'STORAGE_YEARLY',
    'Licence Annuelle Stockage & Scan Illimité',
    'Abonnements & Licences',
    'Forfait annuel entreprise : 1 Go de stockage souverain, scans mobiles illimités, support 24/7 et 2 mois offerts.',
    '["1 Go de stockage souverain dédié", "Scan mobile sans restriction de quota", "Support technique prioritaire 24/7", "Prix : 99,00 € TTC / an (2 mois offerts)"]'::jsonb,
    '99,00 € / an',
    82.50,
    null,
    0.05,
    'ans',
    false,
    1,
    'Économique',
    'yearly',
    3,
    true
  ),
  (
    'mobile-scan',
    'MOBILE_SCAN',
    'Application mobile de scan sur site',
    'Mobilité & Terrain',
    'Capturez vos documents sur le terrain depuis smartphone et envoyez-les vers l''OCR, l''IA et le cloud souverain avec dépassement de quota autorisé.',
    '["Capture caméra et correction automatique", "Redressement, contraste OCR et découpe", "Mode hors-ligne et synchronisation", "Prix moyen TTC : 2 000 €"]'::jsonb,
    '2 000 € TTC',
    1666.67,
    null,
    null,
    'postes',
    false,
    1,
    'Mobile-First',
    'one-time',
    4,
    true
  ),
  (
    'ocr',
    'OCR',
    'OCR (Optical Character Recognition)',
    'Capture & Numérisation',
    'Lisez automatiquement le texte présent dans une image et transformez-le en texte modifiable, recherchable ou analysable.',
    '["Factures, scans et PDF", "Texte modifiable et recherchable", "Prix moyen TTC : 2 500 € ou 0,05 € HT / page"]'::jsonb,
    '2 500 € TTC (0,05 € HT/page)',
    0.05,
    0.06,
    null,
    'pages',
    true,
    500,
    'Populaire',
    'one-time',
    5,
    true
  ),
  (
    'classification',
    'CLASSIFICATION',
    'Classification automatique de documents',
    'Intelligence Artificielle',
    'Analysez vos PDF, images, e-mails et scans pour déterminer automatiquement leur type et extraire les données clés.',
    '["Factures, contrats et pièces d''identité", "Bons de livraison et dossiers clients", "Prix moyen TTC : 1 500 €"]'::jsonb,
    '1 500 € TTC',
    0.03,
    0.036,
    null,
    'pages',
    true,
    500,
    'IA',
    'one-time',
    6,
    true
  ),
  (
    'cloud',
    'CLOUD',
    'Cloud sécurisé & Souverain',
    'Infrastructure & Hébergement',
    'Stockez vos données en ligne avec chiffrement AES-256, conformité RGPD et infrastructure française souveraine.',
    '["Chiffrement des données et transferts", "Stockage redondant", "Prix moyen TTC : 3 500 €"]'::jsonb,
    '3 500 € TTC',
    10.00,
    null,
    null,
    'Go',
    true,
    50,
    null,
    'one-time',
    7,
    true
  ),
  (
    'api',
    'API',
    'API (Application Programming Interface)',
    'Intégration Systèmes',
    'Faites communiquer automatiquement Digital Docs Solutions avec vos logiciels ERP, CRM et GED via nos endpoints sécurisés.',
    '["ERP, CRM et GED", "Envoi et récupération des données", "Prix moyen TTC : 4 000 €"]'::jsonb,
    '4 000 € TTC',
    3333.33,
    null,
    null,
    'licences',
    false,
    1,
    'B2B',
    'one-time',
    8,
    true
  ),
  (
    'etaticiel-global',
    'ETATICIEL_GLOBAL',
    'ETATICIEL GLOBAL',
    'Suite État Civil',
    'Solution globale de numérisation, gestion et archivage des données d''état civil pour collectivités territoriales.',
    '["Naissance, décès et mariage", "Gestion centralisée pour la collectivité", "Licence globale : 6 000 € TTC"]'::jsonb,
    '6 000 € TTC',
    5000.00,
    null,
    null,
    'licences',
    false,
    1,
    'Complet',
    'one-time',
    9,
    true
  ),
  (
    'etaticiel-naissance',
    'ETATICIEL_NAISSANCE',
    'ETATICIEL Naissance',
    'Suite État Civil',
    'Logiciel dédié à la numérisation, gestion et archivage sécurisé des actes de naissance.',
    '["Saisie et recherche des actes", "Archivage des données de naissance", "Licence unitaire : 3 000 € TTC"]'::jsonb,
    '3 000 € TTC',
    2500.00,
    null,
    null,
    'licences',
    false,
    1,
    null,
    'one-time',
    10,
    true
  ),
  (
    'etaticiel-deces',
    'ETATICIEL_DECES',
    'ETATICIEL Décès',
    'Suite État Civil',
    'Logiciel dédié à la numérisation, gestion et archivage sécurisé des actes de décès.',
    '["Saisie et recherche des actes", "Archivage des données de décès", "Licence unitaire : 3 000 € TTC"]'::jsonb,
    '3 000 € TTC',
    2500.00,
    null,
    null,
    'licences',
    false,
    1,
    null,
    'one-time',
    11,
    true
  ),
  (
    'etaticiel-mariage',
    'ETATICIEL_MARIAGE',
    'ETATICIEL Mariage',
    'Suite État Civil',
    'Logiciel dédié à la numérisation, gestion et archivage sécurisé des actes de mariage.',
    '["Saisie et recherche des actes", "Archivage des données de mariage", "Licence unitaire : 3 000 € TTC"]'::jsonb,
    '3 000 € TTC',
    2500.00,
    null,
    null,
    'licences',
    false,
    1,
    null,
    'one-time',
    12,
    true
  )
on conflict (product_code) do update set
  name = excluded.name,
  category = excluded.category,
  description = excluded.description,
  details = excluded.details,
  price = excluded.price,
  unit_price_ht = excluded.unit_price_ht,
  price_per_page = excluded.price_per_page,
  price_per_mb = excluded.price_per_mb,
  default_unit = excluded.default_unit,
  is_volume_based = excluded.is_volume_based,
  min_quantity = excluded.min_quantity,
  badge = excluded.badge,
  billing_frequency = excluded.billing_frequency,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

-- RPC Flexible pour réserver les octets avec autorisation de dépassement pour le Scan Mobile
create or replace function public.reserve_document_bytes_flexible(
  requested_bytes bigint,
  is_mobile_scan boolean default false
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  quota public.user_quotas;
  current_user_id uuid := auth.uid();
  next_used bigint;
  is_exceeded boolean := false;
  excess_bytes bigint := 0;
begin
  if current_user_id is null then
    raise exception 'Utilisateur non connecté';
  end if;
  if requested_bytes <= 0 then
    raise exception 'Taille de fichier invalide';
  end if;

  insert into public.user_quotas (user_id)
  values (current_user_id)
  on conflict (user_id) do nothing;

  select * into quota from public.user_quotas
  where user_id = current_user_id for update;

  if quota.blocked_until is not null and quota.blocked_until > now() then
    raise exception 'Quota temporairement bloqué jusqu''au %', quota.blocked_until;
  end if;

  if quota.window_started_at + interval '48 hours' <= now() then
    update public.user_quotas
    set used_bytes = 0, window_started_at = now(), blocked_until = null, updated_at = now()
    where user_id = current_user_id;
    quota.used_bytes := 0;
  end if;

  next_used := quota.used_bytes + requested_bytes;

  -- Règle : Seul le scan mobile est autorisé à dépasser les 2 Mo
  if next_used > quota.quota_limit_bytes then
    if not is_mobile_scan then
      raise exception 'Quota de 2 Mo dépassé. Seuls les scans mobiles peuvent dépasser cette limite ou souscrivez à une licence.';
    else
      is_exceeded := true;
      excess_bytes := next_used - quota.quota_limit_bytes;
    end if;
  end if;

  update public.user_quotas
  set used_bytes = next_used,
      updated_at = now()
  where user_id = current_user_id;

  return jsonb_build_object(
    'used_bytes', next_used,
    'limit_bytes', quota.quota_limit_bytes,
    'remaining_bytes', greatest(0, quota.quota_limit_bytes - next_used),
    'is_exceeded', is_exceeded,
    'excess_bytes', excess_bytes,
    'excess_mb', round((excess_bytes::numeric / 1048576.0), 2),
    'estimated_excess_cost_eur', round((excess_bytes::numeric / 1048576.0) * 0.10, 2),
    'warning', is_exceeded or next_used >= quota.quota_limit_bytes * 0.8
  );
end;
$$;
