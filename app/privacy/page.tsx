import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politique de Confidentialité — Digital Docs Solutions",
  description: "Politique de confidentialité et protection des données personnelles (RGPD).",
};

export default function PrivacyPage() {
  return (
    <main className="container py-5">
      <div className="text-center mb-5">
        <h1 className="display-4 fw-bold text-primary mb-3">Politique de Confidentialité</h1>
        <p className="lead text-muted">
          Protection de vos données personnelles et conformité réglementaire.
        </p>
        <div className="mt-3">
          <a href="/" className="btn btn-outline-secondary">
            ← Retour à l&apos;accueil
          </a>
        </div>
      </div>

      <div className="card shadow-sm border-0 p-4 bg-light mb-4">
        <div className="card-body">
          <h2 className="h4 fw-bold mb-3">1. Collecte des données</h2>
          <p className="text-secondary">
            Digital Docs Solutions collecte uniquement les données nécessaires au bon fonctionnement
            des services de numérisation, archivage et gestion de compte client. Ces données incluent
            les adresses email, noms, coordonnées d&apos;entreprise et documents confiés pour traitement.
          </p>

          <h2 className="h4 fw-bold mt-4 mb-3">2. Sécurité et Chiffrement</h2>
          <p className="text-secondary">
            Tous les documents et échanges sont protégés par un chiffrement de bout en bout
            (en transit via SSL/TLS et au repos via AES-256). L&apos;accès à vos archives est strictement
            restreint aux utilisateurs autorisés de votre organisation.
          </p>

          <h2 className="h4 fw-bold mt-4 mb-3">3. Conformité RGPD</h2>
          <p className="text-secondary">
            Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez
            d&apos;un droit d&apos;accès, de rectification et de suppression de vos données personnelles.
          </p>

          <h2 className="h4 fw-bold mt-4 mb-3">4. Contact DPO</h2>
          <p className="text-secondary mb-0">
            Pour toute question relative à vos données ou pour exercer vos droits, vous pouvez
            contacter notre délégué à la protection des données via le portail client.
          </p>
        </div>
      </div>
    </main>
  );
}
