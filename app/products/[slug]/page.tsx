import { notFound } from "next/navigation";
import ProductActions from "../ProductActions";

const products: Record<
  string,
  { name: string; price: string; summary: string; features: string[] }
> = {
  ocr: {
    name: "OCR (Optical Character Recognition)",
    price: "2 500 € TTC",
    summary: "Rendez vos documents numérisés recherchables et exploitables.",
    features: [
      "Reconnaissance optique du texte haute précision",
      "Extraction automatique des informations et métadonnées",
      "Format texte modifiable, indexable et analysable",
    ],
  },
  classification: {
    name: "Classification automatique de documents",
    price: "1 500 € TTC",
    summary: "Déterminez automatiquement le type de vos PDF, images, e-mails et scans.",
    features: [
      "Factures et contrats",
      "Pièces d'identité et bons de livraison",
      "Classement automatique dans vos dossiers",
    ],
  },
  cloud: {
    name: "Cloud sécurisé",
    price: "3 500 € TTC",
    summary: "Protégez vos données avec un stockage en ligne sécurisé et souverain.",
    features: [
      "Chiffrement des données en transit et au repos",
      "Stockage redondant haute disponibilité",
      "Conformité RGPD garantie",
    ],
  },
  api: {
    name: "API (Application Programming Interface)",
    price: "4 000 € TTC",
    summary: "Faites communiquer automatiquement vos logiciels avec Digital Docs Solutions.",
    features: [
      "Connexion ERP, CRM et GED",
      "Envoi et récupération automatisés des données",
      "Automatisation complète des flux documentaires",
    ],
  },
  "mobile-scan": {
    name: "Application mobile de scan sur site",
    price: "2 000 € TTC",
    summary: "Capturez vos documents sur le terrain et envoyez-les vers vos services digitaux.",
    features: [
      "Capture par caméra intelligente",
      "Correction automatique des perspectives et du contraste",
      "Envoi direct vers OCR, IA et cloud sécurisé",
    ],
  },
  "etaticiel-global": {
    name: "ETATICIEL GLOBAL",
    price: "6 000 € / licence",
    summary: "Une solution globale pour numériser et archiver les données d'état civil.",
    features: [
      "Données de naissance, décès et mariage",
      "Gestion centralisée pour la collectivité",
      "Archivage légal et recherche instantanée des actes",
    ],
  },
  "etaticiel-naissance": {
    name: "ETATICIEL Naissance",
    price: "3 000 € / licence",
    summary: "Le logiciel dédié à la gestion des données de naissance.",
    features: [
      "Numérisation des actes de naissance",
      "Recherche et consultation rapides",
      "Archivage sécurisé à long terme",
    ],
  },
  "etaticiel-deces": {
    name: "ETATICIEL Décès",
    price: "3 000 € / licence",
    summary: "Le logiciel dédié à la gestion des données de décès.",
    features: [
      "Numérisation des actes de décès",
      "Recherche et délivrance d'extraits",
      "Archivage sécurisé",
    ],
  },
  "etaticiel-mariage": {
    name: "ETATICIEL Mariage",
    price: "3 000 € / licence",
    summary: "Le logiciel dédié à la gestion des données de mariage.",
    features: [
      "Numérisation des actes de mariage",
      "Recherche et consultation",
      "Archivage sécurisé",
    ],
  },
};

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = products[slug];
  if (!product) notFound();

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-3xl">
        <a href="/pricing" className="text-sm font-semibold text-blue-400 hover:underline">
          ← Retour aux tarifs
        </a>
        <p className="mt-12 text-sm font-semibold uppercase tracking-wide text-blue-400">
          Service DDS
        </p>
        <h1 className="mt-2 text-4xl md:text-5xl font-bold">{product.name}</h1>
        <p className="mt-4 text-xl text-slate-300">{product.summary}</p>
        <p className="mt-6 text-3xl font-bold text-blue-400">{product.price}</p>

        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-bold mb-4">Ce qui est inclus</h2>
          <ul className="space-y-3 text-slate-300">
            {product.features.map((feature) => (
              <li key={feature} className="flex items-start gap-2">
                <span className="text-blue-400 font-bold">✓</span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <ProductActions />
      </div>
    </main>
  );
}
