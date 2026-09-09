"use client";

import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="d-flex flex-column min-vh-100">
      {/* Navigation Header */}
      <nav className="navbar navbar-expand-lg navbar-light bg-white border-bottom shadow-sm sticky-top">
        <div className="container">
          <Link className="navbar-brand fw-bold text-primary fs-4 text-decoration-none" href="/">
            Digital Docs Solutions
          </Link>
          <div className="d-flex align-items-center gap-3">
            <Link href="/services" className="nav-link text-secondary fw-medium">
              Services
            </Link>
            <Link href="/produits" className="nav-link text-secondary fw-medium">
              Produits
            </Link>
            <Link href="/about" className="nav-link text-secondary fw-medium">
              À propos
            </Link>
            <Link href="/pricing" className="nav-link text-secondary fw-medium">
              Tarifs
            </Link>
            <Link
              href="/login"
              className="btn btn-primary btn-sm px-3 font-semibold"
            >
              Portail Client
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-grow-1">
        {/* Hero Section */}
        <section className="py-5 text-center bg-light border-bottom">
          <div className="container py-4">
            <h1 className="display-4 fw-bold text-dark">
              Digital Docs Solutions — Digitalisation & Archivage
            </h1>

            <p className="lead mt-3 text-muted mx-auto" style={{ maxWidth: "800px" }}>
              Digitalisation – Archivage – Stockage sécurisé<br />
              Transformez vos documents papier en données exploitables et accélérez votre transformation numérique.
            </p>

            <div className="mt-4 d-flex justify-content-center gap-3">
              <Link href="/services" className="btn btn-primary btn-lg px-4 font-semibold">
                Découvrir nos services
              </Link>

              <Link
                href="/login"
                className="btn btn-outline-primary btn-lg px-4 font-semibold"
              >
                Accéder au Portail SaaS
              </Link>
            </div>
          </div>
        </section>

        {/* Banner Section */}
        <div className="container my-5 text-center">
          <Image
            src="/images/bannieredds.png"
            alt="Digital Docs Solutions"
            width={1200}
            height={500}
            className="img-fluid rounded shadow"
            priority
          />
        </div>

        {/* Problème Section */}
        <section className="container my-5">
          <div className="p-4 p-md-5 bg-light rounded-3 shadow-sm border">
            <h2 className="fw-bold mb-4 text-danger">Le problème</h2>
            <p className="lead text-secondary">
              70 % des entreprises dépendent encore du papier : perte de temps,
              erreurs humaines, archivage coûteux, partage difficile, conformité
              complexe…
            </p>

            <div className="row g-3 mt-2">
              <div className="col-md-6">
                <ul className="list-group list-group-flush bg-transparent">
                  <li className="list-group-item bg-transparent text-secondary">❌ Recherche de documents lente et laborieuse</li>
                  <li className="list-group-item bg-transparent text-secondary">❌ Erreurs humaines et pertes de justificatifs</li>
                  <li className="list-group-item bg-transparent text-secondary">❌ Coûts d&apos;archivage physique et de stockage élevés</li>
                  <li className="list-group-item bg-transparent text-secondary">❌ Difficulté à partager l’information en équipe</li>
                </ul>
              </div>
              <div className="col-md-6">
                <ul className="list-group list-group-flush bg-transparent">
                  <li className="list-group-item bg-transparent text-secondary">❌ Conformité réglementaire et RGPD complexe</li>
                  <li className="list-group-item bg-transparent text-secondary">❌ Processus industriels ralentis par le papier</li>
                  <li className="list-group-item bg-transparent text-secondary">❌ Tracasseries administratives récurrentes</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Solution Section */}
        <section className="container my-5">
          <div className="p-4 p-md-5 bg-primary text-white rounded-3 shadow">
            <h2 className="fw-bold mb-4">Notre solution</h2>

            <div className="row g-3">
              <div className="col-md-6">
                <ul className="list-unstyled">
                  <li className="mb-2">✓ <strong>Numérisation intelligente</strong> (OCR haute précision, indexation automatique)</li>
                  <li className="mb-2">✓ <strong>Plateforme logicielle GED</strong> pour gérer, rechercher et partager vos documents</li>
                  <li className="mb-2">✓ <strong>Intégration transparente</strong> avec vos ERP, CRM et systèmes métiers</li>
                </ul>
              </div>
              <div className="col-md-6">
                <ul className="list-unstyled">
                  <li className="mb-2">✓ <strong>Sécurisation avancée</strong> (chiffrement de bout en bout, RGPD, coffre-fort)</li>
                  <li className="mb-2">✓ <strong>Automatisation des workflows</strong> et circuits de validation en temps réel</li>
                </ul>
              </div>
            </div>

            <p className="mt-4 fw-bold fs-5 mb-0 text-light border-top pt-3">
              💡 Nous transformons le papier en données exploitables pour votre entreprise.
            </p>
          </div>
        </section>

        {/* Secteurs Cibles */}
        <section className="container my-5">
          <h2 className="fw-bold mb-4 text-center">Nos secteurs d&apos;accompagnement</h2>

          <div className="row g-4 mt-2">
            <div className="col-md-4">
              <div className="card h-100 border shadow-sm p-4">
                <h3 className="h4 fw-bold text-primary mb-3">🏭 Industrie</h3>
                <ul className="text-secondary mb-0">
                  <li>Bons de commande</li>
                  <li>Fiches de production</li>
                  <li>Rapports de maintenance</li>
                  <li>Plans et schémas techniques</li>
                </ul>
              </div>
            </div>

            <div className="col-md-4">
              <div className="card h-100 border shadow-sm p-4">
                <h3 className="h4 fw-bold text-primary mb-3">🛒 Commerce</h3>
                <ul className="text-secondary mb-0">
                  <li>Factures et devis</li>
                  <li>Contrats et avenants</li>
                  <li>Bons de livraison</li>
                  <li>Dossiers clients & fournisseurs</li>
                </ul>
              </div>
            </div>

            <div className="col-md-4">
              <div className="card h-100 border shadow-sm p-4">
                <h3 className="h4 fw-bold text-primary mb-3">🏛️ Administration</h3>
                <ul className="text-secondary mb-0">
                  <li>Numérisation et archivage légal</li>
                  <li>Délivrance de certificats</li>
                  <li>Gestion de l’état civil</li>
                  <li>Registres et courriers entrants</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="text-center mt-5 p-4 bg-light rounded border">
            <p className="lead mb-0 text-dark fw-medium">
              Scan mobile → OCR & IA → Cloud sécurisé → Intégration ERP/CRM
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-dark text-white py-4 mt-5">
        <div className="container d-flex flex-column flex-md-row justify-content-between align-items-center">
          <div className="mb-3 mb-md-0">
            <span className="fw-bold fs-5">Digital Docs Solutions</span>
            <p className="text-muted small mb-0">© {new Date().getFullYear()} — Tous droits réservés.</p>
          </div>
          <div className="d-flex gap-3">
            <Link href="/services" className="text-light text-decoration-none small">
              Services
            </Link>
            <Link href="/produits" className="text-light text-decoration-none small">
              Produits
            </Link>
            <Link href="/about" className="text-light text-decoration-none small">
              À propos
            </Link>
            <Link href="/privacy" className="text-light text-decoration-none small">
              Confidentialité
            </Link>
            <Link href="/pricing" className="text-light text-decoration-none small">
              Tarifs
            </Link>
            <Link href="/login" className="text-primary text-decoration-none small fw-bold">
              Portail SaaS
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
