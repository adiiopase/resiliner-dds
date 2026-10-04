import { supabase } from "./supabaseClient";

export type ProductItem = {
  id: string;
  product_code: string;
  name: string;
  category: string;
  description: string;
  details: string[];
  price: string;
  unit_price_ht: number;
  price_per_page?: number | null;
  price_per_mb?: number | null;
  default_unit: string;
  is_volume_based: boolean;
  min_quantity: number;
  badge?: string | null;
  billing_frequency?: "one-time" | "per-mb" | "monthly" | "yearly";
  sort_order: number;
  is_active: boolean;
};

export const STORAGE_PRICING = {
  PRICE_PER_MB: 0.10, // 0.10 € TTC par Mo
  MONTHLY_PLAN_PRICE: 9.90, // 9.90 € / mois
  YEARLY_PLAN_PRICE: 99.00, // 99.00 € / an
  STANDARD_FREE_QUOTA_BYTES: 2 * 1024 * 1024, // 2 Mo
};

export const FALLBACK_PRODUCTS: ProductItem[] = [
  {
    id: "storage-mb",
    product_code: "STORAGE_MB",
    name: "Recharge Stockage Souverain (au Mo)",
    category: "Stockage & Cloud",
    description: "Paiement direct à la consommation pour les Mo occupés dans votre espace de stockage souverain.",
    details: ["0,10 € TTC par Mo occupé", "Facturation à l'usage réel", "Pas d'engagement de durée"],
    price: "0,10 € / Mo",
    unit_price_ht: 0.0833,
    price_per_mb: 0.10,
    default_unit: "Mo",
    is_volume_based: true,
    min_quantity: 1,
    badge: "À l'usage",
    billing_frequency: "per-mb",
    sort_order: 1,
    is_active: true,
  },
  {
    id: "storage-monthly",
    product_code: "STORAGE_MONTHLY",
    name: "Licence Mensuelle Stockage & Scan Pro",
    category: "Abonnements & Licences",
    description: "Forfait mensuel tout-en-un : 50 Mo de stockage souverain inclus, Scan mobile illimité et OCR IA prioritaire.",
    details: ["50 Mo de stockage souverain inclus", "Dépassement de quota scan autorisé", "OCR IA haute précision illimité", "Prix : 9,90 € TTC / mois"],
    price: "9,90 € / mois",
    unit_price_ht: 8.25,
    default_unit: "mois",
    is_volume_based: false,
    min_quantity: 1,
    badge: "Recommandé",
    billing_frequency: "monthly",
    sort_order: 2,
    is_active: true,
  },
  {
    id: "storage-yearly",
    product_code: "STORAGE_YEARLY",
    name: "Licence Annuelle Stockage & Scan Illimité",
    category: "Abonnements & Licences",
    description: "Forfait annuel entreprise : 1 Go de stockage souverain, scans mobiles illimités, support 24/7 et 2 mois offerts.",
    details: ["1 Go de stockage souverain dédié", "Scan mobile sans restriction de quota", "Support technique prioritaire 24/7", "Prix : 99,00 € TTC / an (2 mois offerts)"],
    price: "99,00 € / an",
    unit_price_ht: 82.50,
    default_unit: "ans",
    is_volume_based: false,
    min_quantity: 1,
    badge: "Économique",
    billing_frequency: "yearly",
    sort_order: 3,
    is_active: true,
  },
  {
    id: "mobile-scan",
    product_code: "MOBILE_SCAN",
    name: "Application mobile de scan sur site",
    category: "Mobilité & Terrain",
    description: "Capturez vos documents sur le terrain depuis smartphone et envoyez-les vers l'OCR, l'IA et le cloud souverain avec dépassement de quota autorisé.",
    details: ["Capture caméra et correction automatique", "Redressement, contraste OCR et découpe", "Mode hors-ligne et synchronisation", "Prix moyen TTC : 2 000 €"],
    price: "2 000 € TTC",
    unit_price_ht: 1666.67,
    default_unit: "postes",
    is_volume_based: false,
    min_quantity: 1,
    badge: "Mobile-First",
    billing_frequency: "one-time",
    sort_order: 4,
    is_active: true,
  },
  {
    id: "ocr",
    product_code: "OCR",
    name: "OCR (Optical Character Recognition)",
    category: "Capture & Numérisation",
    description: "Lisez automatiquement le texte présent dans une image et transformez-le en texte modifiable, recherchable ou analysable.",
    details: ["Factures, scans et PDF", "Texte modifiable et recherchable", "Prix moyen TTC : 2 500 € ou 0,05 € HT / page"],
    price: "2 500 € TTC (0,05 € HT/page)",
    unit_price_ht: 0.05,
    price_per_page: 0.06,
    default_unit: "pages",
    is_volume_based: true,
    min_quantity: 500,
    badge: "Populaire",
    billing_frequency: "one-time",
    sort_order: 5,
    is_active: true,
  },
  {
    id: "ocr-license",
    product_code: "OCR_LICENSE_SOURCE",
    name: "OCR — Licence + code source",
    category: "Cloud & licences acheteurs",
    description: "Licence commerciale OCR pour utilisateur-acheteur souhaitant exploiter notre cloud, avec code source inclus.",
    details: ["Licence commerciale OCR", "Code source inclus", "Usage cloud DDS, intégration et support"],
    price: "4 500 € TTC / licence + sources",
    unit_price_ht: 3750.0,
    default_unit: "licences",
    is_volume_based: false,
    min_quantity: 1,
    badge: "Licence + sources",
    billing_frequency: "one-time",
    sort_order: 6,
    is_active: true,
  },
  {
    id: "scan-license",
    product_code: "SCAN_LICENSE_SOURCE",
    name: "Scan — Licence + code source",
    category: "Cloud & licences acheteurs",
    description: "Licence commerciale Scan pour client acheteur de notre cloud, avec code source inclus.",
    details: ["Licence commerciale Scan", "Code source inclus", "Usage cloud DDS et intégration sans limite"],
    price: "4 000 € TTC / licence + sources",
    unit_price_ht: 3333.33,
    default_unit: "licences",
    is_volume_based: false,
    min_quantity: 1,
    badge: "Licence + sources",
    billing_frequency: "one-time",
    sort_order: 7,
    is_active: true,
  },
  {
    id: "ia-license",
    product_code: "IA_LICENSE_SOURCE",
    name: "IA — Licence + code source",
    category: "Cloud & licences acheteurs",
    description: "Licence commerciale IA pour utilisateur-acheteur souhaitant utiliser notre cloud, avec code source inclus.",
    details: ["Licence commerciale IA", "Code source inclus", "Modèles et intégration cloud DDS"],
    price: "3 500 € TTC / licence + sources",
    unit_price_ht: 2916.67,
    default_unit: "licences",
    is_volume_based: false,
    min_quantity: 1,
    badge: "Licence + sources",
    billing_frequency: "one-time",
    sort_order: 8,
    is_active: true,
  },
  {
    id: "classification",
    product_code: "CLASSIFICATION",
    name: "Classification automatique de documents",
    category: "Intelligence Artificielle",
    description: "Analysez vos PDF, images, e-mails et scans pour déterminer automatiquement leur type et extraire les données clés.",
    details: ["Factures, contrats et pièces d'identité", "Bons de livraison et dossiers clients", "Prix moyen TTC : 1 500 €"],
    price: "1 500 € TTC",
    unit_price_ht: 0.03,
    price_per_page: 0.036,
    default_unit: "pages",
    is_volume_based: true,
    min_quantity: 500,
    badge: "IA",
    billing_frequency: "one-time",
    sort_order: 9,
    is_active: true,
  },
  {
    id: "cloud",
    product_code: "CLOUD",
    name: "Cloud sécurisé & Souverain",
    category: "Infrastructure & Hébergement",
    description: "Stockez vos données en ligne avec chiffrement AES-256, conformité RGPD et infrastructure française souveraine.",
    details: ["Chiffrement des données et transferts", "Stockage redondant", "Prix moyen TTC : 3 500 €"],
    price: "3 500 € TTC",
    unit_price_ht: 10.00,
    default_unit: "Go",
    is_volume_based: true,
    min_quantity: 50,
    billing_frequency: "one-time",
    sort_order: 10,
    is_active: true,
  },
  {
    id: "api",
    product_code: "API",
    name: "API (Application Programming Interface)",
    category: "Intégration Systèmes",
    description: "Faites communiquer automatiquement Digital Docs Solutions avec vos logiciels ERP, CRM et GED via nos endpoints sécurisés.",
    details: ["ERP, CRM et GED", "Envoi et récupération des données", "Prix moyen TTC : 4 000 €"],
    price: "4 000 € TTC",
    unit_price_ht: 3333.33,
    default_unit: "licences",
    is_volume_based: false,
    min_quantity: 1,
    badge: "B2B",
    billing_frequency: "one-time",
    sort_order: 11,
    is_active: true,
  },
  {
    id: "etaticiel-global",
    product_code: "ETATICIEL_GLOBAL",
    name: "ETATICIEL GLOBAL",
    category: "Suite État Civil",
    description: "Solution globale de numérisation, gestion et archivage des données d'état civil pour collectivités territoriales.",
    details: ["Naissance, décès et mariage", "Gestion centralisée pour la collectivité", "Licence globale : 6 000 € TTC"],
    price: "6 000 € TTC",
    unit_price_ht: 5000.00,
    default_unit: "licences",
    is_volume_based: false,
    min_quantity: 1,
    badge: "Complet",
    billing_frequency: "one-time",
    sort_order: 12,
    is_active: true,
  },
  {
    id: "etaticiel-naissance",
    product_code: "ETATICIEL_NAISSANCE",
    name: "ETATICIEL Naissance",
    category: "Suite État Civil",
    description: "Logiciel dédié à la numérisation, gestion et archivage sécurisé des actes de naissance.",
    details: ["Saisie et recherche des actes", "Archivage des données de naissance", "Licence unitaire : 3 000 € TTC"],
    price: "3 000 € TTC",
    unit_price_ht: 2500.00,
    default_unit: "licences",
    is_volume_based: false,
    min_quantity: 1,
    billing_frequency: "one-time",
    sort_order: 13,
    is_active: true,
  },
  {
    id: "etaticiel-deces",
    product_code: "ETATICIEL_DECES",
    name: "ETATICIEL Décès",
    category: "Suite État Civil",
    description: "Logiciel dédié à la numérisation, gestion et archivage sécurisé des actes de décès.",
    details: ["Saisie et recherche des actes", "Archivage des données de décès", "Licence unitaire : 3 000 € TTC"],
    price: "3 000 € TTC",
    unit_price_ht: 2500.00,
    default_unit: "licences",
    is_volume_based: false,
    min_quantity: 1,
    billing_frequency: "one-time",
    sort_order: 14,
    is_active: true,
  },
  {
    id: "etaticiel-mariage",
    product_code: "ETATICIEL_MARIAGE",
    name: "ETATICIEL Mariage",
    category: "Suite État Civil",
    description: "Logiciel dédié à la numérisation, gestion et archivage sécurisé des actes de mariage.",
    details: ["Saisie et recherche des actes", "Archivage des données de mariage", "Licence unitaire : 3 000 € TTC"],
    price: "3 000 € TTC",
    unit_price_ht: 2500.00,
    default_unit: "licences",
    is_volume_based: false,
    min_quantity: 1,
    billing_frequency: "one-time",
    sort_order: 15,
    is_active: true,
  },
];

/**
 * Charge la liste dynamique des produits depuis la table `products` de Supabase
 * avec fallback sur le catalogue structuré si la table est vide ou inaccessible.
 */
export async function fetchDynamicProducts(): Promise<ProductItem[]> {
  try {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error || !data || data.length === 0) {
      return FALLBACK_PRODUCTS;
    }

    return data.map((item) => ({
      id: item.id || item.product_code.toLowerCase(),
      product_code: item.product_code,
      name: item.name,
      category: item.category,
      description: item.description || "",
      details: Array.isArray(item.details) ? item.details : typeof item.details === "string" ? JSON.parse(item.details) : [],
      price: item.price || `${item.unit_price_ht} €`,
      unit_price_ht: Number(item.unit_price_ht) || 0,
      price_per_page: item.price_per_page ? Number(item.price_per_page) : null,
      price_per_mb: item.price_per_mb ? Number(item.price_per_mb) : 0.10,
      default_unit: item.default_unit || "unités",
      is_volume_based: Boolean(item.is_volume_based),
      min_quantity: Number(item.min_quantity) || 1,
      badge: item.badge,
      billing_frequency: item.billing_frequency || "one-time",
      sort_order: item.sort_order || 0,
      is_active: Boolean(item.is_active),
    }));
  } catch (err) {
    console.warn("Erreur chargement dynamique products, utilisation du fallback", err);
    return FALLBACK_PRODUCTS;
  }
}

export function calculateStoragePrice(usedBytes: number) {
  const usedMb = usedBytes / (1024 * 1024);
  const cost = usedMb * STORAGE_PRICING.PRICE_PER_MB;
  return {
    usedMb: parseFloat(usedMb.toFixed(2)),
    pricePerMb: STORAGE_PRICING.PRICE_PER_MB,
    totalCostTtc: parseFloat(cost.toFixed(2)),
    isExceeded: usedBytes > STORAGE_PRICING.STANDARD_FREE_QUOTA_BYTES,
    excessMb: Math.max(0, parseFloat((usedMb - 2).toFixed(2))),
    excessCostTtc: Math.max(0, parseFloat(((usedMb - 2) * STORAGE_PRICING.PRICE_PER_MB).toFixed(2))),
  };
}
