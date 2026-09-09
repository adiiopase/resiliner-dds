"use client";

import { Suspense, useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type OrderRequest = {
  id: string;
  user_id: string;
  company: string;
  product: string;
  quantity: number;
  quantity_unit: string;
  message?: string | null;
  order_number: string | null;
  status: "new" | "reviewing" | "confirmed" | "cancelled";
  author_confirmed: boolean;
  author_confirmed_at?: string | null;
  created_at: string;
};

type ProductItem = {
  id: string;
  name: string;
  category: string;
  defaultUnit: string;
  unitPriceHt: number;
  isVolumeBased: boolean;
  minQuantity: number;
  description: string;
  badge?: string;
};

const PRODUCTS_CATALOG: ProductItem[] = [
  {
    id: "ocr",
    name: "OCR (Optical Character Recognition)",
    category: "Capture & Numérisation",
    defaultUnit: "pages",
    unitPriceHt: 0.05,
    isVolumeBased: true,
    minQuantity: 500,
    description: "Reconnaissance optique du texte haute précision, extraction de métadonnées et indexation.",
    badge: "Populaire",
  },
  {
    id: "classification",
    name: "Classification automatique de documents",
    category: "Intelligence Artificielle",
    defaultUnit: "pages",
    unitPriceHt: 0.03,
    isVolumeBased: true,
    minQuantity: 500,
    description: "IA d'analyse et de classement automatique pour PDF, scans, contrats et factures.",
    badge: "IA",
  },
  {
    id: "cloud",
    name: "Cloud sécurisé & Souverain",
    category: "Infrastructure & Hébergement",
    defaultUnit: "Go",
    unitPriceHt: 10,
    isVolumeBased: true,
    minQuantity: 50,
    description: "Stockage cloud chiffré de bout en bout, conformité RGPD, haute disponibilité et archivage légal.",
  },
  {
    id: "api",
    name: "API (Application Programming Interface)",
    category: "Intégration Systèmes",
    defaultUnit: "licences",
    unitPriceHt: 3333.33,
    isVolumeBased: false,
    minQuantity: 1,
    description: "Connecteurs API sécurisés pour intégration directe dans vos ERP, CRM et GED existants.",
  },
  {
    id: "mobile-scan",
    name: "Application mobile de scan sur site",
    category: "Mobilité & Terrain",
    defaultUnit: "postes",
    unitPriceHt: 1666.67,
    isVolumeBased: false,
    minQuantity: 1,
    description: "Application mobile intelligente pour numériser et téléverser des documents depuis le terrain.",
  },
  {
    id: "etaticiel-global",
    name: "ETATICIEL GLOBAL",
    category: "Suite État Civil",
    defaultUnit: "licences",
    unitPriceHt: 5000,
    isVolumeBased: false,
    minQuantity: 1,
    description: "Solution complète de numérisation, gestion et archivage des registres d'état civil (tous actes).",
    badge: "Complet",
  },
  {
    id: "etaticiel-naissance",
    name: "ETATICIEL Naissance",
    category: "Suite État Civil",
    defaultUnit: "licences",
    unitPriceHt: 2500,
    isVolumeBased: false,
    minQuantity: 1,
    description: "Module dédié à la gestion, recherche et délivrance des actes de naissance.",
  },
  {
    id: "etaticiel-deces",
    name: "ETATICIEL Décès",
    category: "Suite État Civil",
    defaultUnit: "licences",
    unitPriceHt: 2500,
    isVolumeBased: false,
    minQuantity: 1,
    description: "Module dédié à la gestion, recherche et délivrance des actes de décès.",
  },
  {
    id: "etaticiel-mariage",
    name: "ETATICIEL Mariage",
    category: "Suite État Civil",
    defaultUnit: "licences",
    unitPriceHt: 2500,
    isVolumeBased: false,
    minQuantity: 1,
    description: "Module dédié à la gestion, recherche et délivrance des actes de mariage.",
  },
];

function generateOrderNumber(): string {
  const year = new Date().getFullYear();
  const randomSuffix = Math.floor(10000 + Math.random() * 90000);
  return `BC-${year}-${randomSuffix}`;
}

function BonDeCommandeContent() {
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState<"create" | "history">("create");
  const [currentUser, setCurrentUser] = useState<{ id: string; email?: string } | null>(null);
  const [isManager, setIsManager] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);

  // Form State
  const [orderNumber, setOrderNumber] = useState(generateOrderNumber());
  const [company, setCompany] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<string>(PRODUCTS_CATALOG[0].name);
  const [quantity, setQuantity] = useState<number | string>(PRODUCTS_CATALOG[0].minQuantity);
  const [quantityUnit, setQuantityUnit] = useState<string>(PRODUCTS_CATALOG[0].defaultUnit);
  const [message, setMessage] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);

  // Orders List
  const [orders, setOrders] = useState<OrderRequest[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Interaction feedback
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Printable document preview modal
  const [previewOrder, setPreviewOrder] = useState<OrderRequest | null>(null);

  // 1. Initial Load & Auth
  useEffect(() => {
    async function init() {
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (authData.user) {
          setCurrentUser({
            id: authData.user.id,
            email: authData.user.email,
          });
          setIsManager(authData.user.app_metadata?.role === "manager");

          // Extract company from user metadata if present
          const userMeta = authData.user.user_metadata;
          if (userMeta?.company) {
            setCompany(userMeta.company);
          } else if (authData.user.email) {
            const domain = authData.user.email.split("@")[1];
            if (domain && !["gmail.com", "outlook.com", "hotmail.com", "yahoo.com"].includes(domain)) {
              const compName = domain.split(".")[0];
              setCompany(compName.charAt(0).toUpperCase() + compName.slice(1));
            }
          }
        }
      } catch (err) {
        console.error("Erreur authentification", err);
      } finally {
        setLoadingUser(false);
      }
    }
    void init();
  }, []);

  // 2. Handle URL Search Params for Preselecting Product
  useEffect(() => {
    const productParam = searchParams.get("product");
    if (productParam) {
      const matched = PRODUCTS_CATALOG.find(
        (p) =>
          p.id.toLowerCase() === productParam.toLowerCase() ||
          p.name.toLowerCase().includes(productParam.toLowerCase())
      );
      if (matched) {
        setSelectedProduct(matched.name);
        setQuantity(matched.minQuantity);
        setQuantityUnit(matched.defaultUnit);
      }
    }
  }, [searchParams]);

  // 3. Load Orders List
  async function loadOrders() {
    setLoadingOrders(true);
    try {
      const { data, error } = await supabase
        .from("order_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erreur chargement bons de commande :", error);
      } else {
        setOrders((data as OrderRequest[]) ?? []);
      }
    } catch (err) {
      console.error("Erreur lors de la récupération des commandes :", err);
    } finally {
      setLoadingOrders(false);
    }
  }

  useEffect(() => {
    if (currentUser) {
      void loadOrders();
    }
  }, [currentUser]);

  // 4. Update quantity unit when product changes
  const handleProductChange = (prodName: string) => {
    setSelectedProduct(prodName);
    const prod = PRODUCTS_CATALOG.find((p) => p.name === prodName);
    if (prod) {
      setQuantityUnit(prod.defaultUnit);
      if (Number(quantity) < prod.minQuantity || !quantity) {
        setQuantity(prod.minQuantity);
      }
    }
  };

  // 5. Price Calculations
  const currentProductObj = PRODUCTS_CATALOG.find((p) => p.name === selectedProduct);
  const parsedQty = typeof quantity === "number" ? quantity : parseFloat(quantity) || 0;
  const unitPrice = currentProductObj ? currentProductObj.unitPriceHt : 0;
  const estimatedTotalHt = parsedQty * unitPrice;
  const tvaAmount = estimatedTotalHt * 0.2;
  const estimatedTotalTtc = estimatedTotalHt + tvaAmount;

  // 6. Submit Order Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!currentUser) {
      setErrorMessage("Vous devez être connecté pour valider ce bon de commande.");
      return;
    }

    if (!company.trim()) {
      setErrorMessage("Veuillez renseigner le nom de votre entreprise ou organisation.");
      return;
    }

    if (!parsedQty || parsedQty <= 0) {
      setErrorMessage("Veuillez saisir une quantité valide supérieure à 0.");
      return;
    }

    if (!agreeTerms) {
      setErrorMessage("Veuillez accepter les conditions générales de vente pour confirmer la commande.");
      return;
    }

    setSubmitting(true);

    try {
      const newOrderData = {
        user_id: currentUser.id,
        order_number: orderNumber.trim() || generateOrderNumber(),
        company: company.trim(),
        product: selectedProduct,
        quantity: parsedQty,
        quantity_unit: quantityUnit.trim() || "unités",
        message: message.trim() || null,
        status: "new" as const,
        author_confirmed: true,
        author_confirmed_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("order_requests")
        .insert(newOrderData)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      setSuccessMessage(`Votre bon de commande N° ${newOrderData.order_number} a été validé et enregistré avec succès.`);
      
      // Open preview for the newly created order
      if (data) {
        setPreviewOrder(data as OrderRequest);
      }

      // Reset form & generate new number for next time
      setOrderNumber(generateOrderNumber());
      setMessage("");
      setAgreeTerms(false);

      // Refresh orders list
      await loadOrders();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Une erreur est survenue lors de l'enregistrement.";
      setErrorMessage(`Erreur : ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  // 7. Author Confirm Action (for previously unconfirmed orders)
  const handleConfirmOrder = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from("order_requests")
        .update({
          author_confirmed: true,
          author_confirmed_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (error) throw error;
      await loadOrders();
    } catch (err) {
      alert("Erreur lors de la confirmation du bon de commande.");
      console.error(err);
    }
  };

  // 8. Cancel Order Action
  const handleCancelOrder = async (orderId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir annuler ce bon de commande ?")) return;
    try {
      const { error } = await supabase
        .from("order_requests")
        .update({ status: "cancelled" })
        .eq("id", orderId);

      if (error) throw error;
      await loadOrders();
    } catch (err) {
      alert("Erreur lors de l'annulation du bon de commande.");
      console.error(err);
    }
  };

  // Filter orders
  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      (o.order_number && o.order_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
      o.product.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.company.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "confirmed" && o.status === "confirmed") ||
      (statusFilter === "new" && o.status === "new") ||
      (statusFilter === "reviewing" && o.status === "reviewing") ||
      (statusFilter === "cancelled" && o.status === "cancelled");

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: OrderRequest["status"], authorConfirmed: boolean) => {
    if (status === "confirmed") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
          Validée par DDS
        </span>
      );
    }
    if (status === "cancelled") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
          <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
          Annulée
        </span>
      );
    }
    if (status === "reviewing") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
          En cours d&apos;examen
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
        {authorConfirmed ? "Confirmée par vous (en attente DDS)" : "En attente de confirmation"}
      </span>
    );
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* 1. Header */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center text-lg font-bold shadow-sm">
              📝
            </span>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 m-0">
                Bon de commande officiel
              </h1>
              <p className="mt-1 text-sm text-slate-500 mb-0">
                Émettez, signez et suivez vos bons de commande de prestations et licences logicielles DDS.
              </p>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="flex items-center bg-slate-100 p-1.5 rounded-xl border border-slate-200 shrink-0 self-start md:self-auto">
          <button
            type="button"
            onClick={() => {
              startTransition(() => setActiveTab("create"));
            }}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition cursor-pointer ${
              activeTab === "create"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            ✍️ Nouveau bon
          </button>
          <button
            type="button"
            onClick={() => {
              startTransition(() => setActiveTab("history"));
              void loadOrders();
            }}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition flex items-center gap-2 cursor-pointer ${
              activeTab === "history"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            📋 Historique
            {orders.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[11px] bg-blue-100 text-blue-800 font-bold">
                {orders.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-xl">✅</span>
            <span className="text-sm font-medium">{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage("")}
            className="text-emerald-700 hover:text-emerald-950 text-sm font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 flex items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            <span className="text-sm font-medium">{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage("")}
            className="text-red-700 hover:text-red-950 text-sm font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. TAB: Créer un bon de commande */}
      {activeTab === "create" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Form (8 cols) */}
          <div className="lg:col-span-8 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 m-0">
                  Détails de la commande
                </h2>
                <p className="text-xs text-slate-500 mt-1 mb-0">
                  Remplissez les informations contractuelles pour valider votre engagement de commande.
                </p>
              </div>
              <span className="px-3 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-mono font-bold">
                {orderNumber}
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Reference & Client */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    N° Bon de commande
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={orderNumber}
                      onChange={(e) => setOrderNumber(e.target.value)}
                      required
                      placeholder="Ex: BC-2026-001"
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-mono focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
                    />
                    <button
                      type="button"
                      onClick={() => setOrderNumber(generateOrderNumber())}
                      title="Générer une nouvelle référence"
                      className="absolute right-2.5 top-2.5 text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                    >
                      🔄 Auto
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Nom de l&apos;entreprise / Organisation <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    required
                    placeholder="Ex: Mairie de Paris, Cabinet Dupond, etc."
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
                  />
                </div>
              </div>

              {/* Produit / Solution */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Produit ou Solution logicielle <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={selectedProduct}
                    onChange={(e) => handleProductChange(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm font-medium bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition appearance-none cursor-pointer"
                  >
                    {PRODUCTS_CATALOG.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name} — {p.category}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                    ▼
                  </div>
                </div>

                {currentProductObj && (
                  <p className="mt-2 text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    💡 <strong>Description :</strong> {currentProductObj.description}
                  </p>
                )}
              </div>

              {/* Quantité & Unité */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Quantité / Volume <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={currentProductObj?.minQuantity || 1}
                      step="any"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      required
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition font-semibold"
                    />
                    <span className="absolute right-3 top-2.5 text-xs font-semibold text-slate-400">
                      {quantityUnit}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Unité de mesure
                  </label>
                  <input
                    type="text"
                    value={quantityUnit}
                    onChange={(e) => setQuantityUnit(e.target.value)}
                    required
                    placeholder="pages, Go, licences, etc."
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
                  />
                </div>
              </div>

              {/* Message / Instructions */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Précisions / Référence client / Instructions particulières (optionnel)
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  placeholder="Indiquez ici les détails complémentaires de livraison, le numéro d'engagement comptable ou les besoins techniques spécifiques..."
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
                />
              </div>

              {/* Engagement & Accord */}
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    required
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="text-xs text-blue-950 leading-relaxed">
                    <strong>Bon pour accord et confirmation de commande :</strong> Je confirme l&apos;exactitude des informations fournies et valide l&apos;émission de ce bon de commande auprès de Digital Docs Solutions conformément aux conditions générales de vente.
                  </span>
                </label>
              </div>

              {/* Action button */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-4">
                <div className="text-xs text-slate-500">
                  {loadingUser ? "Vérification utilisateur..." : currentUser ? `Connecté : ${currentUser.email}` : "Non connecté"}
                </div>

                <button
                  type="submit"
                  disabled={submitting || !agreeTerms}
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-xl shadow-sm transition text-sm cursor-pointer disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <span className="text-base">⏳</span>
                      <span>Enregistrement en cours...</span>
                    </>
                  ) : (
                    <>
                      <span>📄</span>
                      <span>Valider & Générer le Bon de Commande</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Price Summary & Details Card (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-md space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <h3 className="font-bold text-base m-0 text-white flex items-center gap-2">
                  <span>💶</span> Estimation financière
                </h3>
                <span className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider">
                  Devise : EUR (€)
                </span>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-slate-300">
                  <span>Prestation</span>
                  <span className="font-medium text-white text-right max-w-[150px] truncate">
                    {selectedProduct}
                  </span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Volume commandé</span>
                  <span className="font-medium text-white">
                    {parsedQty} {quantityUnit}
                  </span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Prix unitaire indicatif</span>
                  <span className="font-medium text-white">
                    {unitPrice.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € HT
                  </span>
                </div>

                <div className="pt-3 border-t border-slate-800 space-y-2">
                  <div className="flex justify-between text-slate-300">
                    <span>Total HT</span>
                    <span className="font-semibold text-white">
                      {estimatedTotalHt.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>TVA estimée (20%)</span>
                    <span className="font-semibold text-white">
                      {tvaAmount.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                    </span>
                  </div>
                  <div className="pt-3 border-t border-slate-800 flex justify-between items-baseline">
                    <span className="font-bold text-base text-white">Total TTC</span>
                    <span className="font-black text-2xl text-blue-400">
                      {estimatedTotalTtc.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-400 space-y-1.5">
                <p>✓ Règlement à 30 jours à réception de facture.</p>
                <p>✓ Facturation conforme émise par le service comptabilité.</p>
                <p>✓ Support technique et accompagnement inclus.</p>
              </div>
            </div>

            {/* Support Info */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-2.5">
              <h4 className="font-bold text-slate-900 text-sm m-0 flex items-center gap-2">
                <span>🛡️</span> Engagement Digital Docs Solutions
              </h4>
              <p>
                Toutes les commandes sont traitées et validées par nos gestionnaires sous 24h ouvrées. Vous recevrez une notification par email dès la confirmation.
              </p>
              <div className="pt-2 flex items-center justify-between text-slate-500">
                <span>Besoin d&apos;un devis sur mesure ?</span>
                <a href="/devis" className="text-blue-600 font-semibold hover:underline">
                  Demande de devis →
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. TAB: Historique des Bons de Commande */}
      {activeTab === "history" && (
        <div className="space-y-6">
          {/* Filters & Search */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="w-full sm:w-80 relative">
              <input
                type="text"
                placeholder="Rechercher un bon, un produit, une entreprise..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-300 pl-9 pr-4 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
              />
              <span className="absolute left-3 top-2.5 text-slate-400 text-sm">🔍</span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  statusFilter === "all"
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Tous ({orders.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("new")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  statusFilter === "new"
                    ? "bg-amber-600 text-white"
                    : "bg-amber-50 text-amber-800 hover:bg-amber-100"
                }`}
              >
                Nouveaux ({orders.filter((o) => o.status === "new").length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("confirmed")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  statusFilter === "confirmed"
                    ? "bg-emerald-600 text-white"
                    : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                }`}
              >
                Validés DDS ({orders.filter((o) => o.status === "confirmed").length})
              </button>
            </div>
          </div>

          {/* Orders Table / Cards */}
          {loadingOrders ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-500">
              <div className="text-3xl mb-3">⏳</div>
              <p className="text-sm font-medium">Chargement des bons de commande...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-4">
              <span className="text-4xl">📭</span>
              <div>
                <h3 className="text-base font-bold text-slate-900 m-0">
                  Aucun bon de commande trouvé
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  {orders.length === 0
                    ? "Vous n'avez pas encore émis de bon de commande. Utilisez l'onglet 'Nouveau bon' pour en créer un."
                    : "Aucun bon ne correspond à vos filtres de recherche."}
                </p>
              </div>
              {orders.length === 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab("create")}
                  className="inline-flex items-center gap-2 bg-blue-600 text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-blue-700 transition cursor-pointer"
                >
                  ✍️ Émettre mon premier bon
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-700 font-semibold text-xs uppercase tracking-wider">
                  <tr>
                    <th className="p-4">N° Commande</th>
                    <th className="p-4">Entreprise & Date</th>
                    <th className="p-4">Produit & Volume</th>
                    <th className="p-4">Statut</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-4 font-mono font-bold text-slate-900">
                        {order.order_number ?? "BC-SANS-NUMERO"}
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-slate-900">{order.company}</div>
                        <div className="text-xs text-slate-500">
                          {new Date(order.created_at).toLocaleDateString("fr-FR", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-slate-800">{order.product}</div>
                        <div className="text-xs font-medium text-blue-700">
                          {order.quantity} {order.quantity_unit}
                        </div>
                      </td>
                      <td className="p-4">
                        {getStatusBadge(order.status, order.author_confirmed)}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setPreviewOrder(order)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold transition cursor-pointer"
                            title="Voir et imprimer le bon de commande officiel"
                          >
                            <span>📄</span>
                            <span>Afficher / Imprimer</span>
                          </button>

                          {!order.author_confirmed && order.status !== "cancelled" && (
                            <button
                              type="button"
                              onClick={() => handleConfirmOrder(order.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold transition cursor-pointer"
                              title="Confirmer la commande"
                            >
                              <span>✍️</span>
                              <span>Confirmer</span>
                            </button>
                          )}

                          {order.status === "new" && (
                            <button
                              type="button"
                              onClick={() => handleCancelOrder(order.id)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 text-xs font-semibold transition cursor-pointer"
                              title="Annuler la commande"
                            >
                              <span>✕</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 4. MODAL: Official Printable Bon de Commande Document View */}
      {previewOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white print:fixed print:inset-0">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-300 print:border-none print:shadow-none print:max-w-none">
            {/* Modal Actions Bar (hidden on print) */}
            <div className="bg-slate-900 text-white px-6 py-3.5 flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <span className="text-lg">📄</span>
                <span className="font-bold text-sm">
                  Document Officiel — {previewOrder.order_number ?? "Bon de commande"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                >
                  <span>🖨️</span>
                  <span>Imprimer / Télécharger en PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewOrder(null)}
                  className="text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg text-sm font-bold transition cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Document Body (Printed Sheet) */}
            <div id="printable-bon-de-commande" className="p-8 sm:p-12 text-slate-900 space-y-8 bg-white print:p-0">
              {/* Header: DDS & Document Title */}
              <div className="flex justify-between items-start border-b-2 border-blue-600 pb-6">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-lg">
                      DDS
                    </div>
                    <div>
                      <h2 className="text-xl font-black tracking-tight text-slate-900 m-0">
                        DIGITAL DOCS SOLUTIONS
                      </h2>
                      <p className="text-xs text-slate-500 font-medium">
                        Solutions de Numérisation & Gestion Sécurisée
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-slate-600 space-y-0.5">
                    <p>contact@digitaldocssolutions.fr • www.digitaldocssolutions.fr</p>
                    <p>Paris, France • RCS Paris 892 415 789 • N° TVA : FR 82 892415789</p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="inline-block bg-blue-50 border border-blue-200 px-4 py-2 rounded-xl text-right">
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-blue-700">
                      Bon de Commande
                    </span>
                    <span className="block font-mono font-black text-lg text-slate-900">
                      {previewOrder.order_number ?? "BC-2026-XXXX"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Date : {new Date(previewOrder.created_at).toLocaleDateString("fr-FR")}
                  </p>
                </div>
              </div>

              {/* Client & Provider Details */}
              <div className="grid grid-cols-2 gap-8 text-xs">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                  <p className="font-bold uppercase tracking-wider text-slate-500 text-[10px]">
                    Fournisseur & Prestataire
                  </p>
                  <p className="font-bold text-slate-900 text-sm">DIGITAL DOCS SOLUTIONS SAS</p>
                  <p className="text-slate-600">Plateforme Sécurisée Cloud & IA</p>
                  <p className="text-slate-600">Service Facturation & Déploiement</p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                  <p className="font-bold uppercase tracking-wider text-slate-500 text-[10px]">
                    Client / Donneur d&apos;ordre
                  </p>
                  <p className="font-bold text-slate-900 text-sm">{previewOrder.company}</p>
                  <p className="text-slate-600">Compte Client ID : {previewOrder.user_id.slice(0, 8)}...</p>
                  <p className="text-slate-600">
                    Statut : {previewOrder.status === "confirmed" ? "Validé par DDS" : "Engagé par le client"}
                  </p>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 border-b border-slate-200 font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3">Désignation de la prestation / Licence</th>
                      <th className="p-3 text-center">Quantité</th>
                      <th className="p-3 text-center">Unité</th>
                      <th className="p-3 text-right">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="p-3">
                        <p className="font-bold text-slate-900 text-sm">{previewOrder.product}</p>
                        {previewOrder.message && (
                          <p className="text-[11px] text-slate-500 mt-1 italic">
                            Notes : {previewOrder.message}
                          </p>
                        )}
                      </td>
                      <td className="p-3 text-center font-bold text-slate-900">
                        {previewOrder.quantity}
                      </td>
                      <td className="p-3 text-center text-slate-600">
                        {previewOrder.quantity_unit}
                      </td>
                      <td className="p-3 text-right">
                        <span className="px-2 py-0.5 rounded font-semibold text-[10px] bg-slate-100 text-slate-800">
                          {previewOrder.status === "confirmed" ? "Confirmé" : "Enregistré"}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Conditions & Signatures Zone */}
              <div className="grid grid-cols-2 gap-8 pt-4">
                <div className="text-[11px] text-slate-500 space-y-1.5">
                  <p className="font-bold text-slate-700">Conditions de règlement & Exécution :</p>
                  <p>• Règlement par virement bancaire ou carte à 30 jours net.</p>
                  <p>• Mise à disposition des accès et licences dès validation administrative.</p>
                  <p>• Tout retard de paiement entraîne l&apos;application des pénalités légales en vigueur.</p>
                </div>

                <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center space-y-3 bg-slate-50/50">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                    Bon pour accord & Signature
                  </p>
                  <div className="h-14 flex items-center justify-center text-xs font-serif italic text-blue-800">
                    {previewOrder.author_confirmed ? (
                      <span className="font-bold">
                        ✍️ Signé et validé électroniquement par {previewOrder.company}
                        <br />
                        <span className="text-[10px] text-slate-500 font-sans">
                          {previewOrder.author_confirmed_at
                            ? new Date(previewOrder.author_confirmed_at).toLocaleDateString("fr-FR")
                            : "Date d'émission"}
                        </span>
                      </span>
                    ) : (
                      <span className="text-slate-400">Signature du client</span>
                    )}
                  </div>
                  <p className="text-[9px] text-slate-400">
                    Cachet commercial et signature autorisée
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-6 border-t border-slate-200 text-center text-[10px] text-slate-400">
                Digital Docs Solutions • Société par actions simplifiée • Document contractuel de commande
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BonDeCommande() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Chargement du bon de commande...</div>}>
      <BonDeCommandeContent />
    </Suspense>
  );
}
