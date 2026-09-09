const products = [
  {
    name: "OCR (Optical Character Recognition)",
    description: "Lisez automatiquement le texte présent dans une image et transformez-le en texte modifiable, recherchable ou analysable.",
    details: ["Factures, scans et PDF", "Texte modifiable et recherchable", "Prix moyen TTC : 2 500 €"],
  },
  {
    name: "Classification automatique de documents",
    description: "Analysez vos PDF, images, e-mails et scans pour déterminer automatiquement leur type.",
    details: ["Factures, contrats et pièces d'identité", "Bons de livraison et dossiers clients", "Prix moyen TTC : 1 500 €"],
  },
  {
    name: "Cloud sécurisé",
    description: "Stockez vos données en ligne avec chiffrement, conformité RGPD et infrastructure sécurisée.",
    details: ["Chiffrement des données et transferts", "Stockage redondant", "Prix moyen TTC : 3 500 €"],
  },
  {
    name: "API (Application Programming Interface)",
    description: "Faites communiquer automatiquement Digital Docs Solutions avec vos autres logiciels.",
    details: ["ERP, CRM et GED", "Envoi et récupération des données", "Prix moyen TTC : 4 000 €"],
  },
  {
    name: "Application mobile de scan sur site",
    description: "Capturez vos documents sur le terrain et envoyez-les vers l'OCR, l'IA et le cloud sécurisé.",
    details: ["Capture caméra et correction automatique", "Redressement, contraste et découpe", "Prix moyen TTC : 2 000 €"],
  },
  {
    name: "ETATICIEL GLOBAL",
    description: "Solution globale de numérisation, gestion et archivage des données d'état civil.",
    details: ["Naissance, décès et mariage", "Gestion centralisée pour la collectivité", "Licence globale : 6 000 €"],
  },
  {
    name: "ETATICIEL Naissance",
    description: "Logiciel dédié à la numérisation et à l'archivage des données de naissance.",
    details: ["Saisie et recherche des actes", "Archivage des données de naissance", "Licence unitaire : 3 000 €"],
  },
  {
    name: "ETATICIEL Décès",
    description: "Logiciel dédié à la numérisation et à l'archivage des données de décès.",
    details: ["Saisie et recherche des actes", "Archivage des données de décès", "Licence unitaire : 3 000 €"],
  },
  {
    name: "ETATICIEL Mariage",
    description: "Logiciel dédié à la numérisation et à l'archivage des données de mariage.",
    details: ["Saisie et recherche des actes", "Archivage des données de mariage", "Licence unitaire : 3 000 €"],
  },
];

export default function NosProduitsPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Notre offre</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Nos produits & solutions</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Une chaîne complète : capture, OCR, IA, cloud sécurisé, état civil et intégration à votre système d&apos;information.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => (
          <article key={product.name} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{product.name}</h2>
              <p className="mt-3 text-slate-600 text-sm">{product.description}</p>
              <ul className="mt-5 space-y-2 text-sm text-slate-700">
                {product.details.map((detail) => (
                  <li key={detail} className="flex items-center gap-2">
                    <span className="text-blue-600">✓</span> {detail}
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <a href="/commande" className="text-sm font-semibold text-blue-700 hover:underline">
                Commander
              </a>
              <a href="/devis" className="text-sm font-medium text-slate-600 hover:text-slate-900">
                Devis sur mesure →
              </a>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
