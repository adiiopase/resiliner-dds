import type { NextConfig } from "next";

const securityHeaders = [
  // 1. Empêcher l'ouverture de votre site dans des iframes externes (Anti-Clickjacking)
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  // 2. Empêcher l'interprétation de fichiers malicieux comme des scripts (Anti-MIME Sniffing)
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  // 3. Bloquer les attaques XSS
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  // 4. Protéger les données de référence et jetons
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  // 5. Restreindre l'accès matériel uniquement aux besoins autorisés (Caméra pour le scan)
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(), geolocation=(), interest-cohort=()",
  },
  // 6. Forcer le chiffrement HTTPS strict (HSTS)
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // 7. Politique de Sécurité du Contenu (Anti-Injection / Anti-Virus / Anti-Contamination de scripts)
  {
    key: "Content-Security-Policy",
    value: `
      default-src 'self';
      script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://rkpjjwapbjommuhphscx.supabase.co;
      style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
      font-src 'self' https://fonts.gstatic.com data:;
      img-src 'self' blob: data: https://*.supabase.co https://api.qrserver.com https://images.unsplash.com https://*.stripe.com;
      media-src 'self' blob: data:;
      connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://js.stripe.com https://api.qrserver.com;
      frame-src 'self' https://js.stripe.com https://hooks.stripe.com;
      object-src 'none';
      base-uri 'self';
      form-action 'self' https://*.stripe.com;
      frame-ancestors 'self';
    `.replace(/\s{2,}/g, " ").trim(),
  },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "rkpjjwapbjommuhphscx.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/home-carousel/**",
        search: "",
      },
    ],
  },

  // Masquer la signature serveur Next.js pour empêcher les scanners de vulnérabilités
  poweredByHeader: false,

  // Désactiver formellement les Source Maps en production pour masquer 100% des fichiers sources (.ts / .tsx)
  productionBrowserSourceMaps: false,

  // Compression automatique des paquets
  compress: true,

  // En-têtes HTTP de sécurité renforcée
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;

