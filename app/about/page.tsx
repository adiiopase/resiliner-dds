import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "À propos — Digital Docs Solutions",
  description: "À propos de Digital Docs Solutions : notre vision, notre mission et notre engagement.",
};

export default function AboutPage() {
  return (
    <main className="container py-5">
      <div className="text-center mb-5">
        <h1 className="display-4 fw-bold text-primary mb-3">À propos de Digital Docs Solutions</h1>
        <p className="lead text-muted mx-auto" style={{ maxWidth: "700px" }}>
          Pionniers de la transformation numérique documentaire et de l&apos;archivage à valeur probante.
        </p>
        <div className="mt-3">
          <a href="/" className="btn btn-outline-secondary">
            ← Retour à l&apos;accueil
          </a>
        </div>
      </div>

      <div className="row g-5 align-items-center mb-5">
        <div className="col-lg-6">
          <h2 className="fw-bold mb-3">Notre Mission</h2>
          <p className="text-secondary leading-relaxed">
            Digital Docs Solutions a été créée pour libérer les entreprises et les administrations
            du fardeau du papier. Nous combinons intelligence artificielle, OCR de haute précision
            et technologies cloud sécurisées pour convertir vos flux papier en véritables données d&apos;aide à la décision.
          </p>
          <p className="text-secondary leading-relaxed">
            Notre engagement : garantir la sécurité, la confidentialité et l&apos;intégrité
            absolue de vos informations tout en réduisant drastiquement vos coûts opérationnels.
          </p>
        </div>
        <div className="col-lg-6">
          <div className="card border-0 bg-primary text-white p-4 shadow">
            <h3 className="h4 fw-bold mb-3">Nos Valeurs Clés</h3>
            <ul className="list-unstyled mb-0">
              <li className="mb-2">🔒 <strong>Sécurité & Confidentialité</strong> : Chiffrement et conformité aux standards les plus stricts.</li>
              <li className="mb-2">⚡ <strong>Efficacité & Rapidité</strong> : Accès instantané à vos informations en un clic.</li>
              <li className="mb-2">🌱 <strong>Éco-responsabilité</strong> : Réduction massive de l&apos;empreinte papier.</li>
              <li>🤝 <strong>Accompagnement</strong> : Support et conseil personnalisé à chaque étape.</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
