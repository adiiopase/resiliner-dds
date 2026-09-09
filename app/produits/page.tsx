import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nos Produits — Digital Docs Solutions",
  description: "Découvrez notre suite logicielle pour la gestion documentaire et l'archivage intelligent.",
};

export default function ProduitsPage() {
  const products = [
    {
      name: "DDS Scanner & OCR Pro",
      tag: "Acquisition & Traitement",
      description:
        "Solution de capture multi-sources (scanners industriels, mobile, email) avec reconnaissance automatique des métadonnées et intelligence artificielle intégrée.",
      badge: "Inclus",
    },
    {
      name: "DDS Cloud Vault",
      tag: "Stockage & Archivage",
      description:
        "Plateforme cloud ultra-sécurisée d'archivage électronique avec chiffrement de bout en bout, conformité réglementaire et recherche instantanée.",
      badge: "SaaS",
    },
    {
      name: "DDS Workflow Engine",
      tag: "Processus & Validation",
      description:
        "Moteur de modélisation de workflows pour automatiser le circuit d'approbation de factures, contrats, et documents administratifs.",
      badge: "Entreprise",
    },
  ];

  return (
    <main className="container py-5">
      <div className="text-center mb-5">
        <h1 className="display-4 fw-bold text-primary mb-3">Nos Produits</h1>
        <p className="lead text-muted mx-auto" style={{ maxWidth: "700px" }}>
          Une gamme logicielle moderne pour transformer la gestion de vos documents.
        </p>
        <div className="mt-3">
          <a href="/" className="btn btn-outline-secondary me-2">
            ← Retour à l&apos;accueil
          </a>
          <a href="/portail-dds/login" className="btn btn-primary">
            Tester la plateforme
          </a>
        </div>
      </div>

      <div className="row g-4">
        {products.map((prod, index) => (
          <div key={index} className="col-lg-4 col-md-6">
            <div className="card h-100 shadow-sm border-0 bg-light p-4">
              <div className="card-body d-flex flex-column">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1">
                    {prod.tag}
                  </span>
                  <span className="badge bg-secondary">{prod.badge}</span>
                </div>
                <h2 className="h4 fw-bold mb-3">{prod.name}</h2>
                <p className="text-muted flex-grow-1">{prod.description}</p>
                <div className="mt-4">
                  <a
                    href="/portail-dds/login"
                    className="btn btn-outline-primary w-100"
                  >
                    En savoir plus
                  </a>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
