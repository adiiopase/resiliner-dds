/**
 * DigitalDocs Solutions - IA & Advanced Semantic Document Classifier
 * 
 * Multi-domain sovereign classification engine supporting:
 * - Commercial & Sales (Invoices, Credit Notes, Quotes, PO, Delivery Slips)
 * - Banking & Finance (Bank Statements, RIB, Tax Notices)
 * - Legal & Contracts (Commercial Contracts, Employment Contracts, NDA, Leases)
 * - Human Resources (Payslips, Proof of Address, Certificates, Resumes)
 * - Identity & Official (ID Cards, Passports, Civil Status Acts - ETATICIEL)
 * - Health & Medical (Medical Files, Prescriptions, Care Slips)
 */

export type DocumentCategory =
  // Commercial & Sales
  | "FACTURE"
  | "AVOIR"
  | "DEVIS"
  | "BON_DE_COMMANDE"
  | "BON_DE_LIVRAISON"
  // Banking & Finance
  | "RELEVE_BANCAIRE"
  | "RIB"
  | "AVIS_IMPOSITION"
  // Legal & Contracts
  | "CONTRAT"
  | "CONTRAT_TRAVAIL"
  | "ACCORD_CONFIDENTIALITE"
  | "BAIL"
  // Human Resources & Admin
  | "BULLETIN_PAIE"
  | "JUSTIFICATIF_DOMICILE"
  | "ATTESTATION"
  | "CV"
  // Identity & Official
  | "PIECE_IDENTITE"
  | "ACTE_ETAT_CIVIL"
  // Health & Medical
  | "DOSSIER_MEDICAL"
  | "ORDONNANCE"
  | "FEUILLE_DE_SOINS"
  // General & Correspondence
  | "EMAIL_CORRESPONDANCE"
  | "DOCUMENT_GENERAL";

export type DomainSector =
  | "COMMERCIAL"
  | "FINANCE"
  | "JURIDIQUE"
  | "RH"
  | "OFFICIEL"
  | "SANTE"
  | "GENERAL";

export interface CategoryMetadata {
  key: DocumentCategory;
  label: string;
  shortLabel: string;
  sector: DomainSector;
  sectorLabel: string;
  icon: string;
  color: string; // Tailwind color class
  description: string;
}

export const DOCUMENT_CATEGORIES: Record<DocumentCategory, CategoryMetadata> = {
  // Commercial
  FACTURE: {
    key: "FACTURE",
    label: "Facture Commerciale / Fournisseur",
    shortLabel: "Facture",
    sector: "COMMERCIAL",
    sectorLabel: "Pôle Commercial & Ventes",
    icon: "🧾",
    color: "blue",
    description: "Facture client ou fournisseur avec montants HT/TVA/TTC et mentions fiscales.",
  },
  AVOIR: {
    key: "AVOIR",
    label: "Facture d'Avoir / Note de Crédit",
    shortLabel: "Avoir",
    sector: "COMMERCIAL",
    sectorLabel: "Pôle Commercial & Ventes",
    icon: "↩️",
    color: "indigo",
    description: "Note de crédit ou annulation de facturation avec référence à la facture d'origine.",
  },
  DEVIS: {
    key: "DEVIS",
    label: "Devis / Proposition Commerciale",
    shortLabel: "Devis",
    sector: "COMMERCIAL",
    sectorLabel: "Pôle Commercial & Ventes",
    icon: "📋",
    color: "sky",
    description: "Offre de prix chiffrée, devis proforma ou estimation commerciale.",
  },
  BON_DE_COMMANDE: {
    key: "BON_DE_COMMANDE",
    label: "Bon de Commande (Purchase Order)",
    shortLabel: "Commande (PO)",
    sector: "COMMERCIAL",
    sectorLabel: "Pôle Commercial & Ventes",
    icon: "🛒",
    color: "cyan",
    description: "Ordre d'achat formalisant la commande de biens ou de prestations.",
  },
  BON_DE_LIVRAISON: {
    key: "BON_DE_LIVRAISON",
    label: "Bon de Livraison / Récépissé de Transport",
    shortLabel: "Livraison (BL)",
    sector: "COMMERCIAL",
    sectorLabel: "Pôle Commercial & Ventes",
    icon: "📦",
    color: "amber",
    description: "Bordereau accompagnant la marchandise avec quantité et émargement.",
  },

  // Finance & Banking
  RELEVE_BANCAIRE: {
    key: "RELEVE_BANCAIRE",
    label: "Relevé de Compte Bancaire",
    shortLabel: "Relevé Bancaire",
    sector: "FINANCE",
    sectorLabel: "Banque & Finance",
    icon: "🏦",
    color: "emerald",
    description: "Extrait bancaire récapitulant les débits, crédits et soldes du compte.",
  },
  RIB: {
    key: "RIB",
    label: "Relevé d'Identité Bancaire (RIB / IBAN)",
    shortLabel: "RIB / IBAN",
    sector: "FINANCE",
    sectorLabel: "Banque & Finance",
    icon: "💳",
    color: "teal",
    description: "Coordonnées bancaires pour virements ou prélèvements SEPA.",
  },
  AVIS_IMPOSITION: {
    key: "AVIS_IMPOSITION",
    label: "Avis d'Imposition (DGFIP / Fiscal)",
    shortLabel: "Avis Fiscal",
    sector: "FINANCE",
    sectorLabel: "Banque & Finance",
    icon: "🏛️",
    color: "orange",
    description: "Avis d'impôt sur le revenu, taxe foncière, CFE ou déclaration fiscale.",
  },

  // Legal & Contracts
  CONTRAT: {
    key: "CONTRAT",
    label: "Contrat Commercial / Prestation de Services",
    shortLabel: "Contrat",
    sector: "JURIDIQUE",
    sectorLabel: "Juridique & Contrats",
    icon: "⚖️",
    color: "violet",
    description: "Accord contractuel cadre, CGV/CGS ou convention de partenariat signée.",
  },
  CONTRAT_TRAVAIL: {
    key: "CONTRAT_TRAVAIL",
    label: "Contrat de Travail (CDI / CDD / Avenant)",
    shortLabel: "Contrat de Travail",
    sector: "JURIDIQUE",
    sectorLabel: "Juridique & Contrats",
    icon: "👔",
    color: "purple",
    description: "Engagement d'embauche stipulant poste, rémunération et période d'essai.",
  },
  ACCORD_CONFIDENTIALITE: {
    key: "ACCORD_CONFIDENTIALITE",
    label: "Accord de Confidentialité (NDA)",
    shortLabel: "NDA / Confidentialité",
    sector: "JURIDIQUE",
    sectorLabel: "Juridique & Contrats",
    icon: "🔒",
    color: "fuchsia",
    description: "Clause ou convention de protection du secret des affaires et savoir-faire.",
  },
  BAIL: {
    key: "BAIL",
    label: "Bail Commercial / Bail d'Habitation",
    shortLabel: "Bail / Location",
    sector: "JURIDIQUE",
    sectorLabel: "Juridique & Contrats",
    icon: "🏢",
    color: "rose",
    description: "Contrat de location immobilière entre bailleur et preneur/locataire.",
  },

  // HR & Admin
  BULLETIN_PAIE: {
    key: "BULLETIN_PAIE",
    label: "Bulletin de Paie / Fiche de Salaire",
    shortLabel: "Bulletin de Paie",
    sector: "RH",
    sectorLabel: "Ressources Humaines",
    icon: "💶",
    color: "emerald",
    description: "Fiche récapitulative des heures, cotisations sociales et salaire net.",
  },
  JUSTIFICATIF_DOMICILE: {
    key: "JUSTIFICATIF_DOMICILE",
    label: "Justificatif de Domicile (Énergie / Télécom / Quittance)",
    shortLabel: "Justificatif Domicile",
    sector: "RH",
    sectorLabel: "Ressources Humaines",
    icon: "🏠",
    color: "amber",
    description: "Facture EDF/Gaz/Internet ou quittance de loyer attestant de la résidence.",
  },
  ATTESTATION: {
    key: "ATTESTATION",
    label: "Attestation / Certificat de Travail",
    shortLabel: "Attestation",
    sector: "RH",
    sectorLabel: "Ressources Humaines",
    icon: "📜",
    color: "lime",
    description: "Certificat employeur, attestation sur l'honneur ou attestation d'assurance.",
  },
  CV: {
    key: "CV",
    label: "Curriculum Vitae (CV)",
    shortLabel: "CV / Profil",
    sector: "RH",
    sectorLabel: "Ressources Humaines",
    icon: "👤",
    color: "blue",
    description: "Parcours professionnel, formations, compétences et coordonnées du candidat.",
  },

  // Official & Identity
  PIECE_IDENTITE: {
    key: "PIECE_IDENTITE",
    label: "Pièce d'Identité (CNI / Passeport / Permis)",
    shortLabel: "Pièce d'Identité",
    sector: "OFFICIEL",
    sectorLabel: "Identité & Titres Officiels",
    icon: "🪪",
    color: "red",
    description: "Document officiel avec photographie, filiation et bande de lecture optique MRZ.",
  },
  ACTE_ETAT_CIVIL: {
    key: "ACTE_ETAT_CIVIL",
    label: "Acte d'État Civil (Naissance / Mariage / Décès - ETATICIEL)",
    shortLabel: "État Civil",
    sector: "OFFICIEL",
    sectorLabel: "Identité & Titres Officiels",
    icon: "🏛️",
    color: "amber",
    description: "Extrait ou copie intégrale du registre d'état civil d'une mairie/commune.",
  },

  // Health & Medical
  DOSSIER_MEDICAL: {
    key: "DOSSIER_MEDICAL",
    label: "Dossier Médical / Compte-Rendu de Consultation",
    shortLabel: "Dossier Médical",
    sector: "SANTE",
    sectorLabel: "Santé & Médical",
    icon: "🩺",
    color: "emerald",
    description: "Bilan clinique, compte-rendu d'examen, d'imagerie ou analyse biologique.",
  },
  ORDONNANCE: {
    key: "ORDONNANCE",
    label: "Ordonnance Médicale / Prescription",
    shortLabel: "Ordonnance",
    sector: "SANTE",
    sectorLabel: "Santé & Médical",
    icon: "💊",
    color: "teal",
    description: "Prescription pharmaceutique établie par un médecin avec posologies.",
  },
  FEUILLE_DE_SOINS: {
    key: "FEUILLE_DE_SOINS",
    label: "Feuille de Soins / Décompte Assurance Maladie",
    shortLabel: "Feuille de Soins",
    sector: "SANTE",
    sectorLabel: "Santé & Médical",
    icon: "🏥",
    color: "cyan",
    description: "Formulaire CERFA ou décompte Ameli pour remboursement des actes médicaux.",
  },

  // General & Correspondence
  EMAIL_CORRESPONDANCE: {
    key: "EMAIL_CORRESPONDANCE",
    label: "E-mail / Courrier de Correspondance",
    shortLabel: "Courrier / E-mail",
    sector: "GENERAL",
    sectorLabel: "Général & Échanges",
    icon: "✉️",
    color: "slate",
    description: "Courrier officiel, réclamation, mise en demeure ou message e-mail structuré.",
  },
  DOCUMENT_GENERAL: {
    key: "DOCUMENT_GENERAL",
    label: "Document Général / Non Catégorisé",
    shortLabel: "Document Général",
    sector: "GENERAL",
    sectorLabel: "Général & Échanges",
    icon: "📄",
    color: "slate",
    description: "Document numérisé standard ne correspondant à aucune catégorie spécifique.",
  },
};

export interface PatternRule {
  term: string;
  weight: number;
  regex?: RegExp;
}

export interface CategoryRuleDefinition {
  category: DocumentCategory;
  primaryIndicators: PatternRule[];
  secondaryIndicators: PatternRule[];
  exclusionIndicators?: string[];
  minimumThreshold: number;
}

/**
 * Weighted rules dictionary for semantic classification
 */
const CLASSIFICATION_RULES: CategoryRuleDefinition[] = [
  // 1. FACTURE
  {
    category: "FACTURE",
    minimumThreshold: 25,
    primaryIndicators: [
      { term: "FACTURE", weight: 30, regex: /\bFACTURE\b/i },
      { term: "INVOICE", weight: 25, regex: /\bINVOICE\b/i },
      { term: "FACTURE N°", weight: 35, regex: /FACTURE\s*(?:N°|NUMERO|NUMBER)/i },
      { term: "NET A PAYER", weight: 25, regex: /NET\s*À\s*PAYER|NET\s*A\s*PAYER/i },
      { term: "TOTAL TTC", weight: 20, regex: /TOTAL\s*TTC/i },
      { term: "TOTAL HT", weight: 15, regex: /TOTAL\s*HT/i },
    ],
    secondaryIndicators: [
      { term: "TVA", weight: 10, regex: /\bTVA\b|\bVAT\b/i },
      { term: "DATE D'ECHEANCE", weight: 12, regex: /DATE\s*D['’]?ÉCHÉANCE|DUE\s*DATE/i },
      { term: "MODE DE REGLEMENT", weight: 10, regex: /MODE\s*DE\s*RÈGLEMENT|PAIEMENT/i },
      { term: "SIRET", weight: 8, regex: /\bSIRET\b/i },
      { term: "IBAN", weight: 8, regex: /\bIBAN\b/i },
      { term: "ESCOMPTE", weight: 8, regex: /\bESCOMPTE\b/i },
    ],
    exclusionIndicators: ["DEVIS", "PROFORMA", "BON DE LIVRAISON", "BULLETIN DE PAIE", "AVIS D'IMPOT"],
  },

  // 2. AVOIR
  {
    category: "AVOIR",
    minimumThreshold: 30,
    primaryIndicators: [
      { term: "AVOIR", weight: 35, regex: /\bAVOIR\s*N°|\bFACTURE\s*D['’]?AVOIR\b/i },
      { term: "CREDIT NOTE", weight: 35, regex: /\bCREDIT\s*NOTE\b/i },
      { term: "NOTE DE CREDIT", weight: 30, regex: /\bNOTE\s*DE\s*CRÉDIT\b/i },
      { term: "NET A DEDUIRE", weight: 25, regex: /NET\s*À\s*DÉDUIRE|REMBOURSEMENT/i },
    ],
    secondaryIndicators: [
      { term: "ANNULE ET REMPLACE", weight: 15, regex: /ANNULE\s*ET\s*REMPLACE/i },
      { term: "REF FACTURE", weight: 12, regex: /RÉF(?:\.|ERENCE)?\s*FACTURE/i },
      { term: "MONTANT CREDITEUR", weight: 15, regex: /CRÉDITEUR|MONTANT\s*NÉGATIF/i },
    ],
  },

  // 3. DEVIS
  {
    category: "DEVIS",
    minimumThreshold: 25,
    primaryIndicators: [
      { term: "DEVIS", weight: 35, regex: /\bDEVIS\b/i },
      { term: "PROFORMA", weight: 35, regex: /\bPROFORMA\b|\bFACTURE\s*PROFORMA\b/i },
      { term: "ESTIMATE", weight: 25, regex: /\bESTIMATE\b|\bQUOTATION\b/i },
      { term: "OFFRE COMMERCIALE", weight: 30, regex: /OFFRE\s*COMMERCIALE|PROPOSITION\s*COMMERCIALE/i },
      { term: "BON POUR ACCORD", weight: 25, regex: /BON\s*POUR\s*ACCORD|DATE\s*ET\s*SIGNATURE/i },
    ],
    secondaryIndicators: [
      { term: "DUREE DE VALIDITE", weight: 15, regex: /DURÉE\s*DE\s*VALIDITÉ|VALABLE\s*(?:JUSQU|PENDANT)/i },
      { term: "CONDITIONS DE PAIEMENT", weight: 10, regex: /ACOMPTE|CONDITIONS\s*DE\s*RÈGLEMENT/i },
      { term: "MONTANT ESTIME", weight: 10, regex: /TOTAL\s*ESTIMÉ/i },
    ],
    exclusionIndicators: ["FACTURE N°", "ACQUITTEE", "BULLETIN DE PAIE"],
  },

  // 4. BON DE COMMANDE
  {
    category: "BON_DE_COMMANDE",
    minimumThreshold: 25,
    primaryIndicators: [
      { term: "BON DE COMMANDE", weight: 40, regex: /BON\s*DE\s*COMMANDE/i },
      { term: "PURCHASE ORDER", weight: 35, regex: /PURCHASE\s*ORDER|\bPO\s*N°/i },
      { term: "COMMANDE N°", weight: 30, regex: /COMMANDE\s*N°/i },
      { term: "ORDRE D'ACHAT", weight: 30, regex: /ORDRE\s*D['’]?ACHAT/i },
    ],
    secondaryIndicators: [
      { term: "ADRESSE DE LIVRAISON", weight: 15, regex: /ADRESSE\s*DE\s*LIVRAISON|LIEU\s*DE\s*LIVRAISON/i },
      { term: "DATE DE COMMANDE", weight: 12, regex: /DATE\s*DE\s*COMMANDE/i },
      { term: "CONDITIONS DE LIVRAISON", weight: 10, regex: /DÉLAI\s*DE\s*LIVRAISON/i },
    ],
  },

  // 5. BON DE LIVRAISON
  {
    category: "BON_DE_LIVRAISON",
    minimumThreshold: 25,
    primaryIndicators: [
      { term: "BON DE LIVRAISON", weight: 40, regex: /BON\s*DE\s*LIVRAISON|\bBL\s*N°/i },
      { term: "DELIVERY NOTE", weight: 35, regex: /DELIVERY\s*NOTE|\bPACKING\s*LIST\b/i },
      { term: "BORDEREAU DE LIVRAISON", weight: 35, regex: /BORDEREAU\s*DE\s*LIVRAISON/i },
      { term: "RECEPISSE DE TRANSPORT", weight: 30, regex: /RÉCÉPISSÉ\s*DE\s*TRANSPORT|LETTRE\s*DE\s*VOITURE/i },
    ],
    secondaryIndicators: [
      { term: "EMARGEMENT", weight: 20, regex: /ÉMARGEMENT|SIGNATURE\s*DU\s*RÉCEPTIONNAIRE|COLIS/i },
      { term: "RESERVES", weight: 15, regex: /RÉSERVES\s*ÉVENTUELLES|NOMBRE\s*DE\s*COLIS|POIDS/i },
      { term: "DATE RECEPTION", weight: 12, regex: /DATE\s*DE\s*RÉCEPTION/i },
    ],
  },

  // 6. RELEVE BANCAIRE
  {
    category: "RELEVE_BANCAIRE",
    minimumThreshold: 25,
    primaryIndicators: [
      { term: "RELEVE DE COMPTE", weight: 40, regex: /RELEVÉ\s*DE\s*COMPTE|EXTRAIT\s*DE\s*COMPTE/i },
      { term: "BANK STATEMENT", weight: 35, regex: /BANK\s*STATEMENT|ACCOUNT\s*STATEMENT/i },
      { term: "ANCIEN SOLDE", weight: 25, regex: /ANCIEN\s*SOLDE|SOLDE\s*PRÉCÉDENT/i },
      { term: "NOUVEAU SOLDE", weight: 25, regex: /NOUVEAU\s*SOLDE|SOLDE\s*AU/i },
    ],
    secondaryIndicators: [
      { term: "COLONNE DEBIT CREDIT", weight: 20, regex: /\bDÉBIT\b.*\bCRÉDIT\b|\bDEBIT\b.*\bCREDIT\b/i },
      { term: "IBAN", weight: 15, regex: /\bIBAN\b/i },
      { term: "VIREMENT", weight: 10, regex: /VIREMENT\s*SEPA|PRÉLÈVEMENT\s*SEPA/i },
      { term: "AGENCE BANCAIRE", weight: 10, regex: /AGENCE\s*BANCAIRE|CODE\s*GUICHET/i },
    ],
  },

  // 7. RIB
  {
    category: "RIB",
    minimumThreshold: 30,
    primaryIndicators: [
      { term: "RELEVE D'IDENTITE BANCAIRE", weight: 45, regex: /RELEVÉ\s*D['’]?IDENTITÉ\s*BANCAIRE|\bRIB\b/i },
      { term: "COORDONNEES BANCAIRES", weight: 30, regex: /COORDONNÉES\s*BANCAIRES|BANK\s*DETAILS/i },
      { term: "CODE BANQUE GUICHET", weight: 25, regex: /CODE\s*BANQUE.*CODE\s*GUICHET/i },
    ],
    secondaryIndicators: [
      { term: "IBAN", weight: 20, regex: /FR\d{2}\s*\d{4}\s*\d{4}/i },
      { term: "BIC SWIFT", weight: 20, regex: /\bBIC\b|\bSWIFT\b/i },
      { term: "TITULAIRE DU COMPTE", weight: 15, regex: /TITULAIRE\s*DU\s*COMPTE|DOMICILIATION/i },
    ],
  },

  // 8. AVIS D'IMPOSITION
  {
    category: "AVIS_IMPOSITION",
    minimumThreshold: 30,
    primaryIndicators: [
      { term: "AVIS D'IMPOT", weight: 45, regex: /AVIS\s*D['’]?IMPÔT|AVIS\s*D['’]?IMPOSITION/i },
      { term: "DGFIP", weight: 35, regex: /DIRECTION\s*GÉNÉRALE\s*DES\s*FINANCES\s*PUBLIQUES|\bDGFIP\b/i },
      { term: "REVENU FISCAL DE REFERENCE", weight: 35, regex: /REVENU\s*FISCAL\s*DE\s*RÉFÉRENCE/i },
      { term: "NUMERO FISCAL", weight: 30, regex: /NUMÉRO\s*FISCAL|NUMÉRO\s*D['’]?ACCÈS\s*EN\s*LIGNE/i },
    ],
    secondaryIndicators: [
      { term: "IMPOT SUR LE REVENU", weight: 20, regex: /IMPÔT\s*SUR\s*LE\s*REVENU|TAXE\s*FONCIÈRE/i },
      { term: "NOMBRE DE PARTS", weight: 15, regex: /NOMBRE\s*DE\s*PARTS|SITUATION\s*DU\s*FOYER/i },
    ],
  },

  // 9. BULLETIN DE PAIE
  {
    category: "BULLETIN_PAIE",
    minimumThreshold: 30,
    primaryIndicators: [
      { term: "BULLETIN DE PAIE", weight: 45, regex: /BULLETIN\s*DE\s*PAIE|BULLETIN\s*DE\s*SALAIRE/i },
      { term: "FICHE DE PAIE", weight: 40, regex: /FICHE\s*DE\s*PAIE|FICHE\s*DE\s*SALAIRE/i },
      { term: "SALAIRE NET A PAYER", weight: 35, regex: /NET\s*À\s*PAYER|NET\s*PAYÉ/i },
      { term: "SALAIRE BRUT", weight: 30, regex: /SALAIRE\s*BRUT|TOTAL\s*BRUT/i },
    ],
    secondaryIndicators: [
      { term: "CUMUL IMPOSABLE", weight: 20, regex: /NET\s*IMPOSABLE|CUMUL\s*IMPOSABLE/i },
      { term: "SECURITE SOCIALE", weight: 20, regex: /N°\s*SÉCURITÉ\s*SOCIALE|\bNIR\b/i },
      { term: "COTISATIONS", weight: 15, regex: /SANTÉ|RETRAITE|CHÔMAGE|CSG|CRDS/i },
      { term: "CONGES PAYES", weight: 12, regex: /CONGÉS\s*PAYÉS|SOLDE\s*CP|RTT/i },
    ],
  },

  // 10. CONTRAT & JURIDIQUE
  {
    category: "CONTRAT",
    minimumThreshold: 25,
    primaryIndicators: [
      { term: "CONTRAT DE PRESTATION", weight: 35, regex: /CONTRAT\s*DE\s*PRESTATION|ACCORD[- ]CADRE/i },
      { term: "CONDITIONS GENERALES", weight: 30, regex: /CONDITIONS\s*GÉNÉRALES\s*DE\s*VENTE|\bCGV\b|\bCGS\b/i },
      { term: "ENTRE LES SOUSSIGNES", weight: 30, regex: /ENTRE\s*LES\s*SOUSSIGNÉS|IL\s*A\s*ÉTÉ\s*CONVENU/i },
      { term: "OBJET DU CONTRAT", weight: 25, regex: /ARTICLE\s*1\s*[-–:]\s*OBJET/i },
    ],
    secondaryIndicators: [
      { term: "CLAUSE DE RESILIATION", weight: 15, regex: /RÉSILIATION|TRIBUNAL\s*COMPÉTENT|LOI\s*APPLICABLE/i },
      { term: "SIGNATURES DES PARTIES", weight: 20, regex: /POUR\s*LE\s*PRESTATAIRE.*POUR\s*LE\s*CLIENT/i },
      { term: "DUREE DU CONTRAT", weight: 15, regex: /DURÉE\s*DU\s*CONTRAT|DATE\s*D['’]?EFFET/i },
    ],
  },

  // 11. CONTRAT DE TRAVAIL
  {
    category: "CONTRAT_TRAVAIL",
    minimumThreshold: 30,
    primaryIndicators: [
      { term: "CONTRAT DE TRAVAIL", weight: 45, regex: /CONTRAT\s*DE\s*TRAVAIL/i },
      { term: "CONTRAT A DUREE INDETERMINEE", weight: 40, regex: /DURÉE\s*INDÉTERMINÉE|\bCDI\b/i },
      { term: "CONTRAT A DUREE DETERMINEE", weight: 40, regex: /DURÉE\s*DÉTERMINÉE|\bCDD\b/i },
      { term: "ENGAGEMENT DU SALARIE", weight: 30, regex: /ENGAGEMENT|FONCTION\s*DE\s*|QUALIFICATION/i },
    ],
    secondaryIndicators: [
      { term: "PERIODE D'ESSAI", weight: 20, regex: /PÉRIODE\s*D['’]?ESSAI/i },
      { term: "REMUNERATION BRUTE", weight: 20, regex: /RÉMUNÉRATION\s*BRUTE|SALAIRE\s*MENSUEL\s*BRUT/i },
      { term: "CONVENTION COLLECTIVE", weight: 15, regex: /CONVENTION\s*COLLECTIVE/i },
    ],
  },

  // 12. ACCORD DE CONFIDENTIALITE (NDA)
  {
    category: "ACCORD_CONFIDENTIALITE",
    minimumThreshold: 30,
    primaryIndicators: [
      { term: "ACCORD DE CONFIDENTIALITE", weight: 45, regex: /ACCORD\s*DE\s*CONFIDENTIALITÉ|ENGAGEMENT\s*DE\s*CONFIDENTIALITÉ/i },
      { term: "NON DISCLOSURE AGREEMENT", weight: 45, regex: /NON[- ]DISCLOSURE\s*AGREEMENT|\bNDA\b/i },
      { term: "INFORMATIONS CONFIDENTIELLES", weight: 30, regex: /INFORMATIONS\s*CONFIDENTIELLES|SECRET\s*DES\s*AFFAIRES/i },
    ],
    secondaryIndicators: [
      { term: "DIVULGATION", weight: 20, regex: /DIVULGATION|PARTIE\s*ÉMETTRICE|PARTIE\s*RÉCEPTRICE/i },
      { term: "DUREE SECRET", weight: 15, regex: /DURÉE\s*DE\s*CONFIDENTIALITÉ/i },
    ],
  },

  // 13. BAIL IMMOBILIER
  {
    category: "BAIL",
    minimumThreshold: 30,
    primaryIndicators: [
      { term: "CONTRAT DE BAIL", weight: 45, regex: /CONTRAT\s*DE\s*BAIL|BAIL\s*COMMERCIAL|BAIL\s*D['’]?HABITATION/i },
      { term: "BAILLEUR ET PRENEUR", weight: 35, regex: /BAILLEUR.*PRENEUR|PROPRIÉTAIRE.*LOCATAIRE/i },
      { term: "DEPOT DE GARANTIE", weight: 25, regex: /DÉPÔT\s*DE\s*GARANTIE|CAUTION/i },
    ],
    secondaryIndicators: [
      { term: "LOYER MENSUEL", weight: 20, regex: /LOYER\s*MENSUEL|CHARGES\s*LOCATIVES/i },
      { term: "DESIGNATION DES LIEUX", weight: 15, regex: /DÉSIGNATION\s*DES\s*LIEUX|SURFACE\s*HABITABLE/i },
    ],
  },

  // 14. JUSTIFICATIF DE DOMICILE
  {
    category: "JUSTIFICATIF_DOMICILE",
    minimumThreshold: 25,
    primaryIndicators: [
      { term: "QUITTANCE DE LOYER", weight: 40, regex: /QUITTANCE\s*DE\s*LOYER/i },
      { term: "FACTURE D'ENERGIE", weight: 35, regex: /EDF|ENGIE|TOTALENERGIES|ENEDIS|FACTURE\s*D['’]?ÉLECTRICITÉ/i },
      { term: "FACTURE INTERNET", weight: 35, regex: /ORANGE|FREEBOX|SFR|BOUYGUES\s*TELECOM|ABONNEMENT\s*INTERNET/i },
      { term: "FACTURE D'EAU", weight: 35, regex: /VEOLIA|SUEZ|DISTRIBUTION\s*D['’]?EAU/i },
    ],
    secondaryIndicators: [
      { term: "ADRESSE DU TITULAIRE", weight: 20, regex: /TITULAIRE\s*DU\s*CONTRAT|ADRESSE\s*DE\s*CONSOMMATION/i },
      { term: "NUMERO DE COMPTE CLIENT", weight: 15, regex: /N°\s*(?:CLIENT|CONTRAT|POINT\s*DE\s*LIVRAISON)/i },
    ],
  },

  // 15. PIECE D'IDENTITE
  {
    category: "PIECE_IDENTITE",
    minimumThreshold: 25,
    primaryIndicators: [
      { term: "CARTE NATIONALE D'IDENTITE", weight: 45, regex: /CARTE\s*NATIONALE\s*D['’]?IDENTIT[ÉE]|\bCNI\b/i },
      { term: "PASSEPORT", weight: 45, regex: /\bPASSEPORT\b|\bPASSPORT\b/i },
      { term: "PERMIS DE CONDUIRE", weight: 40, regex: /PERMIS\s*DE\s*CONDUIRE/i },
      { term: "TITRE DE SEJOUR", weight: 40, regex: /TITRE\s*DE\s*SÉJOUR|CARTE\s*DE\s*SÉJOUR/i },
      { term: "CODE MRZ IDFRA", weight: 40, regex: /IDFRA|\b[A-Z0-9<]{30,}\b/i },
    ],
    secondaryIndicators: [
      { term: "REPUBLIQUE FRANCAISE", weight: 20, regex: /RÉPUBLIQUE\s*FRANÇAISE|UNION\s*EUROPÉENNE/i },
      { term: "NATIONALITE", weight: 20, regex: /NATIONALITÉ|DATE\s*DE\s*NAISSANCE/i },
      { term: "DATE EXPIRATION", weight: 15, regex: /DATE\s*D['’]?EXPIRATION|VALABLE\s*JUSQU/i },
    ],
  },

  // 16. ACTE D'ETAT CIVIL (ETATICIEL)
  {
    category: "ACTE_ETAT_CIVIL",
    minimumThreshold: 25,
    primaryIndicators: [
      { term: "ACTE DE NAISSANCE", weight: 45, regex: /ACTE\s*DE\s*NAISSANCE|EXTRAIT\s*D['’]?ACTE\s*DE\s*NAISSANCE/i },
      { term: "ACTE DE MARIAGE", weight: 45, regex: /ACTE\s*DE\s*MARIAGE/i },
      { term: "ACTE DE DECES", weight: 45, regex: /ACTE\s*DE\s*DÉCÈS|ACTE\s*DE\s*DECES/i },
      { term: "OFFICIER D'ETAT CIVIL", weight: 35, regex: /OFFICIER\s*(?:DE\s*L['’])?ÉTAT\s*CIVIL/i },
    ],
    secondaryIndicators: [
      { term: "REGISTRE DES ACTES", weight: 25, regex: /REGISTRE\s*DES\s*ACTES|MAIRIE\s*DE|COMMUNE\s*DE/i },
      { term: "MENTIONS MARGINALES", weight: 20, regex: /MENTIONS\s*MARGINALES|FILIATION/i },
    ],
  },

  // 17. DOSSIER MEDICAL
  {
    category: "DOSSIER_MEDICAL",
    minimumThreshold: 25,
    primaryIndicators: [
      { term: "COMPTE RENDU MEDICAL", weight: 40, regex: /COMPTE[- ]RENDU\s*(?:MÉDICAL|DE\s*CONSULTATION|OPÉRATOIRE)/i },
      { term: "DOSSIER MEDICAL", weight: 40, regex: /DOSSIER\s*MÉDICAL|DOSSIER\s*PATIENT/i },
      { term: "CERTIFICAT MEDICAL", weight: 35, regex: /CERTIFICAT\s*MÉDICAL/i },
      { term: "EXAMEN CLINIQUE", weight: 30, regex: /EXAMEN\s*CLINIQUE|ANTÉCÉDENTS\s*MÉDICAUX/i },
    ],
    secondaryIndicators: [
      { term: "DOCTEUR PRATICIEN", weight: 20, regex: /\bDR\b|DOCTEUR|CHIRURGIEN|PRATICIEN/i },
      { term: "DIAGNOSTIC", weight: 20, regex: /DIAGNOSTIC|CONCLUSION\s*MÉDICALE/i },
      { term: "PATIENT", weight: 15, regex: /PATIENT\s*[:(]|DATE\s*D['’]?ADMISSION/i },
    ],
  },

  // 18. ORDONNANCE MEDICALE
  {
    category: "ORDONNANCE",
    minimumThreshold: 25,
    primaryIndicators: [
      { term: "ORDONNANCE", weight: 45, regex: /\bORDONNANCE\b|\bPRESCRIPTION\b/i },
      { term: "POSOLOGIE", weight: 35, regex: /POSOLOGIE|COMPRIMÉ|GÉLULE|MATIN.*SOIR/i },
      { term: "DUREE TRAITEMENT", weight: 25, regex: /PENDANT\s*\d+\s*JOURS|DURÉE\s*DU\s*TRAITEMENT/i },
    ],
    secondaryIndicators: [
      { term: "NOM DU MEDECIN", weight: 20, regex: /DR\s+[A-ZÀ-ÿ\s]+|MÉDECIN\s*TRAITANT/i },
      { term: "NON SUBSTITUABLE", weight: 20, regex: /NON\s*SUBSTITUABLE|RENOUVELABLE/i },
      { term: "NUMERO RPPS", weight: 20, regex: /\bRPPS\b|\bADELI\b/i },
    ],
  },

  // 19. FEUILLE DE SOINS
  {
    category: "FEUILLE_DE_SOINS",
    minimumThreshold: 30,
    primaryIndicators: [
      { term: "FEUILLE DE SOINS", weight: 45, regex: /FEUILLE\s*DE\s*SOINS/i },
      { term: "ASSURANCE MALADIE", weight: 40, regex: /ASSURANCE\s*MALADIE|\bAMELI\b/i },
      { term: "CERFA SOINS", weight: 35, regex: /CERFA\s*N°\s*11389|DÉCOMPTE\s*DE\s*REMBOURSEMENT/i },
    ],
    secondaryIndicators: [
      { term: "TARIF CONVENTION", weight: 20, regex: /TARIF\s*DE\s*CONVENTION|BASE\s*DE\s*REMBOURSEMENT/i },
      { term: "CODE ACTE", weight: 20, regex: /CODE\s*ACTE|MONTANT\s*REMBOURSÉ/i },
      { term: "NUMERO IMMATRICULATION", weight: 20, regex: /NUMÉRO\s*D['’]?IMMATRICULATION/i },
    ],
  },

  // 20. CV
  {
    category: "CV",
    minimumThreshold: 25,
    primaryIndicators: [
      { term: "CURRICULUM VITAE", weight: 45, regex: /CURRICULUM\s*VITAE|\bCV\b/i },
      { term: "EXPERIENCES PROFESSIONNELLES", weight: 35, regex: /EXPÉRIENCES\s*PROFESSIONNELLES|PARCOURS\s*PROFESSIONNEL/i },
      { term: "FORMATION DIPLOME", weight: 30, regex: /FORMATIONS?|DIPLÔMES?|ÉDUCATION/i },
    ],
    secondaryIndicators: [
      { term: "COMPETENCES", weight: 20, regex: /COMPÉTENCES|SKILLS|LANGUES/i },
      { term: "CENTRES D'INTERET", weight: 15, regex: /CENTRES\s*D['’]?INTÉRÊT|LOISIRS/i },
    ],
  },

  // 21. EMAIL / CORRESPONDANCE
  {
    category: "EMAIL_CORRESPONDANCE",
    minimumThreshold: 25,
    primaryIndicators: [
      { term: "EN-TETE EMAIL", weight: 40, regex: /DE\s*:\s*.*@.*[\r\n]+À\s*:\s*.*@|FROM\s*:\s*.*@.*[\r\n]+TO\s*:/i },
      { term: "OBJET COURRIER", weight: 25, regex: /OBJET\s*:\s*[A-ZÀ-ÿ\s]+/i },
      { term: "FORMULE POLITESSE", weight: 25, regex: /VEUILLEZ\s*AGRÉER|CORDIALEMENT|BIEN\s*À\s*VOUS/i },
    ],
    secondaryIndicators: [
      { term: "ENVOYE LE", weight: 15, regex: /ENVOYÉ\s*LE\s*:\s*\d{1,2}|SENT\s*:\s*/i },
      { term: "PJ ATTACHEMENT", weight: 15, regex: /PIÈCE\s*JOINTE|ATTACHMENT/i },
    ],
  },
];

export interface ClassificationCandidate {
  category: DocumentCategory;
  score: number;
  confidencePercent: number;
  matchedIndicators: string[];
}

export interface ClassificationResult {
  category: DocumentCategory;
  categoryMetadata: CategoryMetadata;
  confidenceScore: number; // 0 to 100
  sector: DomainSector;
  sectorLabel: string;
  reasoning: string;
  detectedIndicators: string[];
  candidates: ClassificationCandidate[];
  isAmbiguous: boolean; // True if top 2 candidates are very close
}

/**
 * Intelligent Document Classifier
 * Evaluates raw text against all category patterns and returns the best match with confidence scores.
 */
export function classifyDocument(text: string): ClassificationResult {
  if (!text || text.trim().length === 0) {
    const defaultMeta = DOCUMENT_CATEGORIES.DOCUMENT_GENERAL;
    return {
      category: "DOCUMENT_GENERAL",
      categoryMetadata: defaultMeta,
      confidenceScore: 0,
      sector: defaultMeta.sector,
      sectorLabel: defaultMeta.sectorLabel,
      reasoning: "Document vide ou texte illisible.",
      detectedIndicators: [],
      candidates: [],
      isAmbiguous: false,
    };
  }

  const upper = text.toUpperCase();
  const candidates: ClassificationCandidate[] = [];

  for (const rule of CLASSIFICATION_RULES) {
    let score = 0;
    const matched: string[] = [];

    // Check exclusion indicators first
    if (rule.exclusionIndicators) {
      let isExcluded = false;
      for (const exc of rule.exclusionIndicators) {
        if (upper.includes(exc.toUpperCase())) {
          // Penalize if strong exclusion found
          score -= 20;
        }
      }
      if (isExcluded) continue;
    }

    // Check primary indicators
    for (const indicator of rule.primaryIndicators) {
      let found = false;
      if (indicator.regex) {
        found = indicator.regex.test(text);
      } else {
        found = upper.includes(indicator.term.toUpperCase());
      }

      if (found) {
        score += indicator.weight;
        matched.push(indicator.term);
      }
    }

    // Check secondary indicators
    for (const indicator of rule.secondaryIndicators) {
      let found = false;
      if (indicator.regex) {
        found = indicator.regex.test(text);
      } else {
        found = upper.includes(indicator.term.toUpperCase());
      }

      if (found) {
        score += indicator.weight;
        matched.push(indicator.term);
      }
    }

    if (score >= rule.minimumThreshold) {
      // Normalize confidence percent (0 - 100)
      const confidence = Math.min(99, Math.round((score / 80) * 100));
      candidates.push({
        category: rule.category,
        score,
        confidencePercent: confidence,
        matchedIndicators: matched,
      });
    }
  }

  // Sort candidates by highest score
  candidates.sort((a, b) => b.score - a.score);

  if (candidates.length === 0) {
    const meta = DOCUMENT_CATEGORIES.DOCUMENT_GENERAL;
    return {
      category: "DOCUMENT_GENERAL",
      categoryMetadata: meta,
      confidenceScore: 30,
      sector: meta.sector,
      sectorLabel: meta.sectorLabel,
      reasoning: "Aucune signature sémantique forte identifiée. Classé en document général.",
      detectedIndicators: [],
      candidates: [],
      isAmbiguous: false,
    };
  }

  const topMatch = candidates[0];
  const meta = DOCUMENT_CATEGORIES[topMatch.category] || DOCUMENT_CATEGORIES.DOCUMENT_GENERAL;

  // Check ambiguity (if second candidate is within 10 points)
  const isAmbiguous =
    candidates.length > 1 && topMatch.score - candidates[1].score < 15 && topMatch.confidencePercent < 80;

  const reasoning = `Classifié automatiquement comme ${meta.label} (${topMatch.confidencePercent}% de certitude) basé sur les indicateurs : ${topMatch.matchedIndicators.slice(0, 4).join(", ")}.`;

  return {
    category: topMatch.category,
    categoryMetadata: meta,
    confidenceScore: topMatch.confidencePercent,
    sector: meta.sector,
    sectorLabel: meta.sectorLabel,
    reasoning,
    detectedIndicators: topMatch.matchedIndicators,
    candidates,
    isAmbiguous,
  };
}
