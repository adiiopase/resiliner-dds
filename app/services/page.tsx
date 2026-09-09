import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nos Services — Digital Docs Solutions",
  description: "Découvrez notre gamme complète de services de numérisation, archivage et intégration GED.",
};

export default function ServicesPage() {
  const services = [
    {
      title: "Numérisation & OCR Intelligent",
      description:
        "Transformation de vos documents papier en formats numériques indexables grâce à nos technologies de reconnaissance optique de caractères (OCR) de pointe.",
      icon: "📄",
      features: [
        "Indexation automatique plein texte",
        "Extraction automatique de métadonnées",
        "Prise en charge de tous formats (A4, plans, registres)",
        "Contrôle qualité haute résolution",
      ],
    },
    {
      title: "Archivage Électronique & GED",
      description:
        "Système d'archivage sécurisé conforme aux normes réglementaires, garantissant l'intégrité, la traçabilité et la pérennité de vos archives.",
      icon: "🔒",
      features: [
        "Coffre-fort numérique sécurisé",
        "Gestion des droits d'accès fins",
        "Conformité RGPD et conservation à valeur probante",
        "Recherche instantanée multi-critères",
      ],
    },
    {
      title: "Automatisation des Workflows",
      description:
        "Optimisez vos processus documentaires métiers : validation des factures, circuits de signature et traitement automatisé des demandes.",
      icon: "⚡",
      features: [
        "Circuits de validation personnalisables",
        "Notifications en temps réel",
        "Intégration signature électronique",
        "Traçabilité complète des actions",
      ],
    },
    {
      title: "Intégration ERP, CRM & GED",
      description:
        "Connectez vos outils existants à notre plateforme pour une synchronisation fluide de vos données documentaires.",
      icon: "🔄",
      features: [
        "APIs REST complètes et webhooks",
        "Connecteurs standards (SAP, Sage, Salesforce)",
        "Synchronisation bidirectionnelle",
        "Accompagnement technique sur mesure",
      ],
    },
  ];

  return (
    <main className="container py-5">
      <div className="text-center mb-5">
        <h1 className="display-4 fw-bold text-primary mb-3">Nos Services</h1>
        <p className="lead text-muted mx-auto" style={{ maxWidth: "700px" }}>
          Des solutions complètes pour accompagner la transition numérique de
          vos documents et optimiser vos processus d&apos;entreprise.
        </p>
        <div className="mt-3">
          <a href="/" className="btn btn-outline-secondary me-2">
            ← Retour à l&apos;accueil
          </a>
          <a href="/portail-dds/login" className="btn btn-primary">
            Accéder à l&apos;espace client
          </a>
        </div>
      </div>

      <div className="row g-4">
        {services.map((service, index) => (
          <div key={index} className="col-md-6">
            <div className="card h-100 shadow-sm border-0 bg-light p-4">
              <div className="card-body">
                <div className="fs-1 mb-3">{service.icon}</div>
                <h2 className="h4 fw-bold mb-3">{service.title}</h2>
                <p className="text-muted mb-4">{service.description}</p>
                <h3 className="h6 fw-semibold mb-2">Points clés :</h3>
                <ul className="list-unstyled mb-0">
                  {service.features.map((feature, fIndex) => (
                    <li key={fIndex} className="mb-2 text-secondary">
                      ✓ {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>

      <section className="bg-primary text-white rounded p-5 mt-5 text-center shadow">
        <h2 className="fw-bold mb-3">Besoin d&apos;une solution sur mesure ?</h2>
        <p className="lead mb-4">
          Nos experts vous accompagnent dans l&apos;audit et la numérisation de
          votre fonds documentaire.
        </p>
        <a href="/portail-dds/login" className="btn btn-light btn-lg font-weight-bold">
          Demander un devis / Contactez-nous
        </a>
      </section>
    </main>
  );
}
