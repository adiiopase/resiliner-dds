/**
 * DigitalDocs Solutions - Module de Souveraineté Numérique & Résidence des Données
 * 
 * Support des juridictions souveraines :
 * - Afrique de l'Ouest (Sénégal - CDP, Côte d'Ivoire - ARTCI)
 * - Afrique du Nord (Maroc - CNDP)
 * - Espace OHADA (Droit commercial & archivage probant)
 * - Europe (France / UE - RGPD)
 * - Infrastructure Déconnectée On-Premise (Mairies, Banques, Ministères)
 */

export type SovereignRegion =
  | "SN_DAKAR"
  | "CI_ABIDJAN"
  | "MA_CASABLANCA"
  | "EU_PARIS"
  | "ON_PREMISE_PRIVATE";

export interface SovereignRegionInfo {
  id: SovereignRegion;
  country: string;
  flag: string;
  datacenterName: string;
  location: string;
  legalFramework: string;
  complianceBadges: string[];
  description: string;
  isImmuneToCloudAct: boolean;
}

export const SOVEREIGN_REGIONS: Record<SovereignRegion, SovereignRegionInfo> = {
  SN_DAKAR: {
    id: "SN_DAKAR",
    country: "Sénégal",
    flag: "🇸🇳",
    datacenterName: "Datacenter Souverain National (Diamniadio)",
    location: "Dakar / Diamniadio, Sénégal",
    legalFramework: "Loi n° 2008-12 relative à la protection des données (CDP) & OHADA",
    complianceBadges: ["CDP Sénégal", "Norme OHADA", "Souveraineté UEMOA/CEDEAO"],
    description: "Hébergement 100% local sur le sol sénégalais. Immunité juridique et stricte souveraineté nationale.",
    isImmuneToCloudAct: true,
  },
  CI_ABIDJAN: {
    id: "CI_ABIDJAN",
    country: "Côte d'Ivoire",
    flag: "🇨🇮",
    datacenterName: "Datacenter Tier III National (Abidjan)",
    location: "Abidjan, Côte d'Ivoire",
    legalFramework: "Loi n° 2013-450 sur la protection des données (ARTCI) & OHADA",
    complianceBadges: ["ARTCI RCI", "Norme OHADA", "Zone UEMOA"],
    description: "Hébergement souverain ivoirien. Données confinées sur le territoire national.",
    isImmuneToCloudAct: true,
  },
  MA_CASABLANCA: {
    id: "MA_CASABLANCA",
    country: "Maroc",
    flag: "🇲🇦",
    datacenterName: "Datacenter Souverain Régional (Casablanca)",
    location: "Casablanca, Maroc",
    legalFramework: "Loi n° 09-08 (CNDP) & Souveraineté Maghreb",
    complianceBadges: ["CNDP Maroc", "Norme ISO 27001", "Confidentialité Bancaire"],
    description: "Hébergement haute sécurité en Afrique du Nord conforme aux directives CNDP.",
    isImmuneToCloudAct: true,
  },
  EU_PARIS: {
    id: "EU_PARIS",
    country: "France / UE",
    flag: "🇪🇺",
    datacenterName: "Datacenter SecNumCloud / Souverain UE (Paris)",
    location: "Paris / Francfort, Union Européenne",
    legalFramework: "Règlement Général sur la Protection des Données (RGPD)",
    complianceBadges: ["RGPD UE", "SecNumCloud", "ISO 27001"],
    description: "Hébergement européen certifié avec chiffrement au repos et conformité RGPD.",
    isImmuneToCloudAct: true,
  },
  ON_PREMISE_PRIVATE: {
    id: "ON_PREMISE_PRIVATE",
    country: "On-Premise / Datacenter Privé Client",
    flag: "🏢",
    datacenterName: "Serveurs Internes & Réseau Isolé de l'Institution",
    location: "Sur site propre (Mairie, Banque, Entreprise)",
    legalFramework: "Contrôle 100% Interne & Souveraineté Absolue",
    complianceBadges: ["Autonomie Totale", "Air-Gap Réseau Privé", "Zéro Dépendance Externe"],
    description: "Déploiement direct sur les serveurs physiques du client. Fonctionnement autonome même sans Internet.",
    isImmuneToCloudAct: true,
  },
};
