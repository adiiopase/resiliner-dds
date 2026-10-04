"use client";

import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type FilterMode = "original" | "sharpen" | "high-contrast" | "ocr-bw";
type SourceMode = "computer-cam" | "mobile-cam" | "file-import";
type BillingMode = "direct" | "license";
type DeviceType = "computer" | "mobile";

interface ScannedDocumentItem {
  id: string;
  dataUrl: string;
  name: string;
  category: string;
  sizeBytes: number;
  filter: FilterMode;
  rotation: number;
  contrast: number;
  brightness: number;
}

interface VerifiedLicense {
  id: string;
  license_number: string;
  plan_name: string;
  license_type: string;
  valid_until: string;
  valid_until_formatted: string;
  remaining_days: number;
  storage_quota_mb: number;
  status: string;
}

function SmartScanStudioContent() {
  const searchParams = useSearchParams();

  // Workflow: 'capture' -> 'review-batch' -> 'pricing-payment' -> 'completed-invoice'
  const [currentStep, setCurrentStep] = useState<
    "capture" | "review-batch" | "pricing-payment" | "completed-invoice"
  >("capture");

  // Terminal / Device Detection
  const [deviceType, setDeviceType] = useState<DeviceType>("computer");

  // Billing Mode Selection (2 choices: direct or license)
  const [billingChoice, setBillingChoice] = useState<BillingMode>("direct");
  const [licenseInput, setLicenseInput] = useState("");
  const [verifiedLicense, setVerifiedLicense] = useState<VerifiedLicense | null>(null);
  const [licenseError, setLicenseError] = useState<string | null>(null);
  const [isCheckingLicense, setIsCheckingLicense] = useState(false);

  // Source selection
  const [sourceMode, setSourceMode] = useState<SourceMode>("computer-cam");

  // Camera & Stream Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const motionCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<"environment" | "user">("user");
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Camera Status & Diagnostic
  const [cameraStatusMsg, setCameraStatusMsg] = useState<string>("Capteur prêt et libéré.");
  const [isReleasingCamera, setIsReleasingCamera] = useState<boolean>(false);

  // Auto-capture (Stability Detection)
  const [autoCaptureEnabled, setAutoCaptureEnabled] = useState(true);
  const [stabilityScore, setStabilityScore] = useState(0);
  const [isAutoCapturing, setIsAutoCapturing] = useState(false);
  const prevFrameDataRef = useRef<Uint8ClampedArray | null>(null);
  const stableFramesCountRef = useRef(0);

  // Batch of Scanned Documents
  const [scannedBatch, setScannedBatch] = useState<ScannedDocumentItem[]>([]);
  const [selectedItemIndex, setSelectedItemIndex] = useState(0);

  // Incrustation d'écran (Picture-in-Picture / HD Preview Modal)
  const [showIncrustationModal, setShowIncrustationModal] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // Processing & Invoice State
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  const [stripeNotice, setStripeNotice] = useState<string | null>(null);
  const [invoiceResult, setInvoiceResult] = useState<{
    id?: string;
    invoice_number: string;
    description: string;
    total_ttc_eur: string;
    status: string;
    created_at: string;
    license_applied?: string | null;
  } | null>(null);

  // 1. Detect Terminal / Device & Check Stripe Return Callbacks
  useEffect(() => {
    if (typeof window !== "undefined") {

      const ua = navigator.userAgent || "";
      const isMobile =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) ||
        (window.matchMedia && window.matchMedia("(max-width: 768px)").matches) ||
        (navigator.maxTouchPoints > 1 && window.innerWidth < 1024);

      if (isMobile) {
        setDeviceType("mobile");
        setSourceMode("mobile-cam");
        setCameraFacing("environment");
      } else {
        setDeviceType("computer");
        setSourceMode("computer-cam");
        setCameraFacing("user");
      }
    }

    const paymentStatus = searchParams.get("payment");
    const sessionId = searchParams.get("session_id");

    if (paymentStatus === "success" && sessionId) {
      setStripeNotice("Paiement Stripe validé ! Finalisation de votre facture enregistrée...");
      async function verifyStripe() {
        try {
          const res = await fetch("/api/scan/verify-stripe-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId }),
          });
          const data = await res.json();
          if (data.success && data.invoice) {
            setInvoiceResult({
              id: data.invoice.id,
              invoice_number: data.invoice.invoice_number,
              description: data.invoice.description,
              total_ttc_eur:
                data.invoice.total_ttc_cents !== undefined
                  ? (data.invoice.total_ttc_cents / 100).toFixed(2)
                  : data.invoice.total_ttc_eur || "0.00",
              status: "Validée par l'administrateur & Confirmée client",
              created_at: data.invoice.created_at || new Date().toISOString(),
              license_applied: null,
            });
            setCurrentStep("completed-invoice");
            setStripeNotice(null);
          }
        } catch (err) {
          console.warn("Erreur vérification session Stripe", err);
        }
      }
      void verifyStripe();
    } else if (paymentStatus === "cancelled") {
      setStripeNotice("Paiement annulé. Aucune facture n'a été émise.");
    }
  }, [searchParams]);

  // Guarantee Video Stream is bound to DOM <video> element immediately on first mount/click
  useEffect(() => {
    if (cameraActive && stream && videoRef.current) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
      }
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn("Auto video play handled:", err);
        });
      }
    }
  }, [cameraActive, stream]);

  // 2. License Verification Handler
  const handleVerifyLicense = async (keyToVerify?: string) => {
    const key = (keyToVerify || licenseInput).trim();
    if (!key) {
      setLicenseError("Veuillez saisir votre numéro de licence (ex: LIC-PRO-2026-001).");
      setVerifiedLicense(null);
      return;
    }

    setIsCheckingLicense(true);
    setLicenseError(null);

    try {
      const res = await fetch("/api/scan/verify-license", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ licenseNumber: key }),
      });

      const data = await res.json();

      if (!res.ok || !data.valid) {
        setLicenseError(data.message || data.error || "Numéro de licence introuvable ou expiré.");
        setVerifiedLicense(null);
      } else {
        setVerifiedLicense(data.license);
        setLicenseError(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur de connexion";
      setLicenseError("Impossible de vérifier la licence : " + msg);
      setVerifiedLicense(null);
    } finally {
      setIsCheckingLicense(false);
    }
  };

  // Check if scanning is permitted
  const isScanPermitted = billingChoice === "direct" || (billingChoice === "license" && verifiedLicense !== null);

  // 3. Force Release & Resilient Camera Controls
  const releaseAllCameraTracks = useCallback(() => {
    setIsReleasingCamera(true);
    setCameraStatusMsg("Libération des verrous du capteur...");

    if (stream) {
      stream.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {
          // ignore
        }
      });
      setStream(null);
    }

    if (videoRef.current && videoRef.current.srcObject) {
      const currentSrcStream = videoRef.current.srcObject as MediaStream;
      if (currentSrcStream && typeof currentSrcStream.getTracks === "function") {
        currentSrcStream.getTracks().forEach((t) => {
          try {
            t.stop();
          } catch {
            // ignore
          }
        });
      }
      videoRef.current.srcObject = null;
    }

    setCameraActive(false);
    setStabilityScore(0);
    setIsAutoCapturing(false);
    setTimeout(() => {
      setIsReleasingCamera(false);
      setCameraStatusMsg("Capteur libéré et prêt.");
    }, 200);
  }, [stream]);

  const stopCamera = useCallback(() => {
    releaseAllCameraTracks();
  }, [releaseAllCameraTracks]);

  // Robust Progressive Fallback Camera Opener
  const startCamera = useCallback(
    async (facing?: "environment" | "user") => {
      setCameraError(null);
      setCameraStatusMsg("Initialisation du flux vidéo...");

      releaseAllCameraTracks();
      await new Promise((r) => setTimeout(r, 150));

      const targetFacing = facing || (deviceType === "mobile" ? "environment" : "user");

      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Accès caméra non supporté par ce navigateur.");
        }

        const facingConstraint = deviceType === "computer" ? "user" : { ideal: targetFacing };
        let newStream: MediaStream | null = null;

        // Cascade 1: High Quality
        try {
          newStream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: facingConstraint,
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            },
            audio: false,
          });
        } catch {
          // fallback
        }

        // Cascade 2: Standard 720p
        if (!newStream) {
          try {
            newStream = await navigator.mediaDevices.getUserMedia({
              video: {
                facingMode: facingConstraint,
                width: { ideal: 1280 },
                height: { ideal: 720 },
              },
              audio: false,
            });
          } catch {
            // fallback
          }
        }

        // Cascade 3: Universal Native Video
        if (!newStream) {
          newStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }

        if (!newStream) {
          throw new Error("Impossible d'obtenir le flux vidéo de la caméra.");
        }

        setStream(newStream);
        setCameraActive(true);
        setCameraStatusMsg("🟢 Caméra active et connectée.");

        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
          videoRef.current.play().catch(() => {});
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Erreur caméra";
        console.error("Camera access error:", err);

        let userMsg = "Caméra introuvable ou déjà utilisée par une autre application.";
        if (msg.includes("Permission") || msg.includes("NotAllowedError") || msg.includes("PermissionDeniedError")) {
          userMsg = "Permission refusée. Veuillez autoriser l'accès à la caméra dans votre navigateur.";
        } else if (msg.includes("NotReadableError") || msg.includes("TrackStartError") || msg.includes("Device in use")) {
          userMsg = "Le capteur caméra est actuellement occupé par une autre application (Teams, Zoom, Skype). Fermez-la ou importez un document.";
        } else if (msg.includes("NotFoundError") || msg.includes("DevicesNotFoundError")) {
          userMsg = "Aucune caméra détectée. Vous pouvez importer un fichier image ou PDF.";
        }

        setCameraError(userMsg);
        setCameraStatusMsg("⚠️ Erreur d'accès caméra.");
        setCameraActive(false);
      }
    },
    [deviceType, releaseAllCameraTracks]
  );

  // Stop camera when unmounting
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [stream]);

  // Handle source switch (Never auto-starts without explicit button click)
  const handleSelectSource = (mode: SourceMode) => {
    setSourceMode(mode);
    stopCamera();
    if (mode === "file-import") {
      if (isScanPermitted) {
        fileInputRef.current?.click();
      }
    }
  };

  // 4. Stability Detection & Auto-Capture Loop
  useEffect(() => {
    if (!cameraActive || !autoCaptureEnabled || isAutoCapturing || currentStep !== "capture" || !isScanPermitted) {
      return;
    }

    const interval = setInterval(() => {
      if (!videoRef.current || !videoRef.current.videoWidth) return;
      const video = videoRef.current;

      const motionCanvas = motionCanvasRef.current || document.createElement("canvas");
      motionCanvas.width = 160;
      motionCanvas.height = 120;
      const ctx = motionCanvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, 160, 120);
      const currentFrame = ctx.getImageData(30, 20, 100, 80).data;

      if (prevFrameDataRef.current) {
        let diff = 0;
        const prev = prevFrameDataRef.current;
        for (let i = 0; i < currentFrame.length; i += 8) {
          diff += Math.abs(currentFrame[i] - prev[i]);
        }
        const motionLevel = diff / (currentFrame.length / 8);

        if (motionLevel < 8.0) {
          stableFramesCountRef.current += 1;
          const score = Math.min(100, stableFramesCountRef.current * 20);
          setStabilityScore(score);

          if (stableFramesCountRef.current >= 5) {
            setIsAutoCapturing(true);
            setTimeout(() => {
              triggerCapture("original");
              stableFramesCountRef.current = 0;
              setStabilityScore(0);
              setIsAutoCapturing(false);
            }, 300);
          }
        } else {
          stableFramesCountRef.current = Math.max(0, stableFramesCountRef.current - 2);
          setStabilityScore(Math.min(100, stableFramesCountRef.current * 15));
        }
      }

      prevFrameDataRef.current = currentFrame;
    }, 180);

    return () => clearInterval(interval);
  }, [cameraActive, autoCaptureEnabled, isAutoCapturing, currentStep, isScanPermitted]);

  // 5. Crystal-Clear Image Capture with Natural Real Colors
  const triggerCapture = (initialFilter: FilterMode = "original") => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement("canvas");

    const naturalWidth = video.videoWidth || 1920;
    const naturalHeight = video.videoHeight || 1080;
    canvas.width = naturalWidth;
    canvas.height = naturalHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(video, 0, 0, naturalWidth, naturalHeight);

    const rawDataUrl = canvas.toDataURL("image/jpeg", 0.95);
    const estBytes = Math.round((rawDataUrl.length * 3) / 4);

    const pageIndex = scannedBatch.length + 1;
    const newItem: ScannedDocumentItem = {
      id: `scan-${Date.now()}-${pageIndex}`,
      dataUrl: rawDataUrl,
      name: `Document_Couleur_Page_${pageIndex}.jpg`,
      category: "Facture",
      sizeBytes: estBytes,
      filter: initialFilter,
      rotation: 0,
      contrast: 100,
      brightness: 100,
    };

    const newBatch = [...scannedBatch, newItem];
    setScannedBatch(newBatch);
    setSelectedItemIndex(newBatch.length - 1);

    setShowIncrustationModal(true);
    setZoomLevel(100);
    stopCamera();
  };

  // 6. Multiple Files Import Handler (Supports 1 or multiple images at once)
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const filesArray = Array.from(files);
    let loadedCount = 0;
    const newItems: ScannedDocumentItem[] = [];

    filesArray.forEach((file, fIdx) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        const pageIndex = scannedBatch.length + fIdx + 1;
        newItems.push({
          id: `import-${Date.now()}-${fIdx}`,
          dataUrl,
          name: file.name.replace(/\.[^/.]+$/, "") + `_P${pageIndex}.jpg`,
          category: "Facture",
          sizeBytes: file.size,
          filter: "original",
          rotation: 0,
          contrast: 100,
          brightness: 100,
        });

        loadedCount++;
        if (loadedCount === filesArray.length) {
          const updated = [...scannedBatch, ...newItems];
          setScannedBatch(updated);
          setSelectedItemIndex(updated.length - 1);
          setShowIncrustationModal(true);
          setZoomLevel(100);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // 7. Item Adjustments
  const applyFilterToCurrentItem = (filter: FilterMode) => {
    setScannedBatch((prev) =>
      prev.map((item, idx) => (idx === selectedItemIndex ? { ...item, filter } : item))
    );
  };

  const rotateCurrentItem = () => {
    setScannedBatch((prev) =>
      prev.map((item, idx) =>
        idx === selectedItemIndex ? { ...item, rotation: (item.rotation + 90) % 360 } : item
      )
    );
  };

  const removeBatchItem = (index: number) => {
    const updated = scannedBatch.filter((_, idx) => idx !== index);
    setScannedBatch(updated);
    if (updated.length === 0) {
      setShowIncrustationModal(false);
      setCurrentStep("capture");
      if (isScanPermitted) {
        void startCamera(cameraFacing);
      }
    } else {
      setSelectedItemIndex(Math.max(0, index - 1));
    }
  };

  // Metrics: STRICTLY WHOLE INTEGERS (NOMBRES ENTIERS SANS DÉCIMALES)
  const totalBatchBytes = scannedBatch.reduce((sum, item) => sum + item.sizeBytes, 0);
  const totalBatchMb = Math.max(1, Math.ceil(totalBatchBytes / (1024 * 1024))); // Nombre ENTIER de Mo
  const directPriceTtc = (totalBatchMb * 0.10).toFixed(2); // 0.10 € TTC par Mo entier

  // 8. Finalize Checkout & Stripe Redirection / License Validation
  const handleFinalizeAndCheckout = async () => {
    if (scannedBatch.length === 0) return;

    setIsProcessingCheckout(true);
    try {
      const uploadedDocIds: string[] = [];

      for (const item of scannedBatch) {
        const res = await fetch(item.dataUrl);
        const blob = await res.blob();

        const formData = new FormData();
        formData.append("file", blob, item.name);
        formData.append("category", item.category);
        formData.append("fileName", item.name);

        const uploadRes = await fetch("/api/mobile-upload", {
          method: "POST",
          body: formData,
        });

        if (uploadRes.ok) {
          const upData = await uploadRes.json();
          if (upData?.document?.id) {
            uploadedDocIds.push(upData.document.id);
          }
        }
      }

      const checkoutRes = await fetch("/api/scan/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethod: billingChoice,
          licenseNumber: verifiedLicense ? verifiedLicense.license_number : licenseInput,
          licenseId: verifiedLicense ? verifiedLicense.id : null,
          totalBytes: totalBatchBytes,
          scanCount: scannedBatch.length,
          documentIds: uploadedDocIds,
        }),
      });

      const checkoutData = await checkoutRes.json();

      if (!checkoutRes.ok) {
        throw new Error(checkoutData.message || checkoutData.error || "Erreur lors de la facturation.");
      }

      if (checkoutData.stripeCheckout && checkoutData.checkoutUrl) {
        window.location.assign(checkoutData.checkoutUrl);
        return;
      }

      setInvoiceResult({
        id: checkoutData.invoice.id,
        invoice_number: checkoutData.invoice.invoice_number,
        description: checkoutData.invoice.description,
        total_ttc_eur:
          checkoutData.invoice.total_ttc_cents !== undefined
            ? (checkoutData.invoice.total_ttc_cents / 100).toFixed(2)
            : checkoutData.invoice.total_ttc_eur || "0.00",
        status: "Validée par l'administrateur & Confirmée client",
        created_at: checkoutData.invoice.created_at || new Date().toISOString(),
        license_applied: checkoutData.license?.plan_name || (verifiedLicense ? verifiedLicense.plan_name : null),
      });

      setCurrentStep("completed-invoice");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur inattendue";
      alert(msg);
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  const currentItem = scannedBatch[selectedItemIndex];

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-20">
      {/* Top Header with Identified Terminal */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-0.5 text-xs font-semibold text-blue-800">
              <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span>
              Studio Intelligent • DigitalDocs Souverain
            </span>
            <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[11px] font-bold text-indigo-900">
              {deviceType === "mobile" ? "📱 Terminal : Smartphone Détecté" : "💻 Terminal : Ordinateur Détecté"}
            </span>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
              0,10 € TTC / Mo (Entier)
            </span>
          </div>
          <h1 className="mt-1.5 text-2xl font-black text-slate-900 sm:text-3xl flex items-center gap-2">
            <span>📸</span> Studio de Numérisation Haute Définition
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/billing"
            className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl hover:bg-slate-200 inline-flex items-center gap-1"
          >
            💳 Mes factures
          </Link>
          <Link
            href="/documents"
            className="text-xs font-bold text-blue-700 hover:underline inline-flex items-center gap-1"
          >
            ← Mes documents
          </Link>
        </div>
      </div>

      {/* Stripe Notice */}
      {stripeNotice && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-xs font-medium text-blue-900 flex items-center gap-2">
          <span>ℹ️</span> {stripeNotice}
        </div>
      )}

      {/* Hidden processing elements */}
      <canvas ref={canvasRef} className="hidden" />
      <canvas ref={motionCanvasRef} className="hidden" />
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,application/pdf"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* SECTION 1: CHOIX DU RÈGLEMENT (DIRECT AVEC STRIPE OU AVEC LICENCE PRÉALABLE) */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <span>💳</span> Mode de Règlement du Scan
          </h3>
          <span className="text-xs text-slate-500 font-medium">2 options disponibles</span>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          {/* Choix 1 : Paiement direct après validation */}
          <label
            onClick={() => {
              setBillingChoice("direct");
              setLicenseError(null);
            }}
            className={`flex flex-col justify-between p-4 rounded-2xl border-2 cursor-pointer transition ${
              billingChoice === "direct"
                ? "border-blue-600 bg-blue-50/50 shadow-sm"
                : "border-slate-200 bg-slate-50/60 hover:border-slate-300"
            }`}
          >
            <div className="flex items-start gap-3">
              <input
                type="radio"
                name="billingMode"
                checked={billingChoice === "direct"}
                onChange={() => setBillingChoice("direct")}
                className="mt-1 text-blue-600"
              />
              <div>
                <p className="text-sm font-bold text-slate-900">1. Paiement direct par Carte (Stripe) après validation</p>
                <p className="text-xs text-slate-500 mt-1">
                  Règlement direct au tarif souverain de <strong>0,10 € TTC par Mo entier</strong> calculé sur le volume réel.
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
              <span className="text-slate-500">Paiement :</span>
              <span className="font-bold text-blue-700">Sécurisé Stripe (CB, Visa, Mastercard)</span>
            </div>
          </label>

          {/* Choix 2 : Paiement avec licence */}
          <label
            onClick={() => setBillingChoice("license")}
            className={`flex flex-col justify-between p-4 rounded-2xl border-2 cursor-pointer transition ${
              billingChoice === "license"
                ? "border-blue-600 bg-blue-50/50 shadow-sm"
                : "border-slate-200 bg-slate-50/60 hover:border-slate-300"
            }`}
          >
            <div className="flex items-start gap-3">
              <input
                type="radio"
                name="billingMode"
                checked={billingChoice === "license"}
                onChange={() => setBillingChoice("license")}
                className="mt-1 text-blue-600"
              />
              <div>
                <p className="text-sm font-bold text-slate-900">2. Paiement avec une licence après validation</p>
                <p className="text-xs text-slate-500 mt-1">
                  Utilisation d&apos;une licence mensuelle ou annuelle active. Vérification de la clé obligatoire avant de scanner.
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
              <span className="text-slate-500">Statut licence :</span>
              <span className={`font-bold ${verifiedLicense ? "text-emerald-700" : "text-amber-700"}`}>
                {verifiedLicense ? "✓ Vérifiée" : "Clé requise"}
              </span>
            </div>
          </label>
        </div>

        {/* Input & Verification de Licence */}
        {billingChoice === "license" && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={licenseInput}
                  onChange={(e) => {
                    setLicenseInput(e.target.value);
                    if (licenseError) setLicenseError(null);
                  }}
                  placeholder="Saisissez votre numéro de licence (ex: LIC-PRO-2026-001, LIC-ANNUEL-2026...)"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-900 shadow-inner focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <button
                type="button"
                onClick={() => handleVerifyLicense()}
                disabled={isCheckingLicense || !licenseInput.trim()}
                className="rounded-xl bg-blue-700 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-800 transition disabled:opacity-50 flex items-center justify-center gap-1.5 shrink-0"
              >
                {isCheckingLicense ? <span>Vérification...</span> : <><span>🔍</span> Vérifier la licence</>}
              </button>
            </div>

            {licenseError && (
              <div className="rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-200 flex items-start gap-2">
                <span>⚠️</span>
                <div>
                  <p className="font-bold">Licence non valide</p>
                  <p>{licenseError}</p>
                </div>
              </div>
            )}

            {verifiedLicense && (
              <div className="rounded-xl bg-emerald-50 p-3.5 text-xs text-emerald-900 border border-emerald-300 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold inline-flex items-center gap-1 text-emerald-800">
                    <span>✅</span> Licence Validée : {verifiedLicense.plan_name}
                  </span>
                  <span className="rounded bg-emerald-200 px-2 py-0.5 text-[10px] font-extrabold uppercase text-emerald-900">
                    {verifiedLicense.license_type === "yearly" ? "Annuelle" : "Mensuelle"}
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-between text-slate-700 pt-1 border-t border-emerald-200 text-[11px]">
                  <span>N° Licence : <strong>{verifiedLicense.license_number}</strong></span>
                  <span>Validité : jusqu&apos;au <strong>{verifiedLicense.valid_until_formatted}</strong> ({verifiedLicense.remaining_days} jours restants)</span>
                  <span>Quota : <strong>{verifiedLicense.storage_quota_mb} Mo</strong></span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* STEP 1: CAPTURE AVEC BOUTONS ADAPTÉS AU TERMINAL IDENTIFIÉ */}
      {currentStep === "capture" && (
        <div className="space-y-5">
          {/* Source Selection Toolbar: Filtered dynamically per device type */}
          <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-slate-100 border border-slate-200">
            {deviceType === "computer" ? (
              <>
                <button
                  onClick={() => handleSelectSource("computer-cam")}
                  className={`flex items-center justify-center gap-2 py-3 px-2 rounded-xl text-xs font-bold transition ${
                    sourceMode === "computer-cam"
                      ? "bg-white text-blue-700 shadow-sm border border-slate-200"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span>💻</span>
                  <span>Scanner avec la Webcam PC</span>
                </button>

                <button
                  onClick={() => handleSelectSource("file-import")}
                  className={`flex items-center justify-center gap-2 py-3 px-2 rounded-xl text-xs font-bold transition ${
                    sourceMode === "file-import"
                      ? "bg-white text-blue-700 shadow-sm border border-slate-200"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span>📁</span>
                  <span>Importer image(s) PC</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => handleSelectSource("mobile-cam")}
                  className={`flex items-center justify-center gap-2 py-3 px-2 rounded-xl text-xs font-bold transition ${
                    sourceMode === "mobile-cam"
                      ? "bg-white text-blue-700 shadow-sm border border-slate-200"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span>📱</span>
                  <span>Scanner avec Smartphone</span>
                </button>

                <button
                  onClick={() => handleSelectSource("file-import")}
                  className={`flex items-center justify-center gap-2 py-3 px-2 rounded-xl text-xs font-bold transition ${
                    sourceMode === "file-import"
                      ? "bg-white text-blue-700 shadow-sm border border-slate-200"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span>📁</span>
                  <span>Importer image(s) mobile</span>
                </button>
              </>
            )}
          </div>

          {/* Gating Alert if License not verified */}
          {!isScanPermitted && (
            <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-6 text-center text-amber-900 space-y-3">
              <span className="text-3xl">🔒</span>
              <h4 className="text-base font-bold">Numérisation verrouillée</h4>
              <p className="text-xs text-amber-800 max-w-md mx-auto">
                Veuillez d&apos;abord renseigner et <strong>vérifier votre numéro de licence</strong> ci-dessus, ou sélectionner le mode <strong>&quot;Paiement direct après validation&quot;</strong> pour déverrouiller la caméra.
              </p>
            </div>
          )}

          {/* Camera Viewfinder Studio */}
          {isScanPermitted && (
            <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 shadow-2xl relative">
              {cameraActive ? (
                <div className="relative aspect-[4/3] sm:aspect-[16/10] flex items-center justify-center bg-black">
                  <video
                    ref={(el) => {
                      videoRef.current = el;
                      if (el && stream && el.srcObject !== stream) {
                        el.srcObject = stream;
                        el.play().catch(() => {});
                      }
                    }}
                    autoPlay
                    playsInline
                    muted
                    onLoadedMetadata={(e) => {
                      const el = e.currentTarget;
                      el.play().catch(() => {});
                    }}
                    className="h-full w-full object-cover"
                  />

                  {/* Document Guide Overlay */}
                  <div className="pointer-events-none absolute inset-6 sm:inset-12 rounded-2xl border-2 border-dashed border-blue-400/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]">
                    <div className="absolute -top-1 -left-1 h-6 w-6 border-t-4 border-l-4 border-blue-400"></div>
                    <div className="absolute -top-1 -right-1 h-6 w-6 border-t-4 border-r-4 border-blue-400"></div>
                    <div className="absolute -bottom-1 -left-1 h-6 w-6 border-b-4 border-l-4 border-blue-400"></div>
                    <div className="absolute -bottom-1 -right-1 h-6 w-6 border-b-4 border-r-4 border-blue-400"></div>

                    <div className="absolute top-4 inset-x-0 text-center">
                      <span className="rounded-full bg-black/80 px-4 py-1.5 text-xs font-semibold text-white backdrop-blur-md">
                        {stabilityScore > 40
                          ? `🎯 Document stable (${stabilityScore}%) - Prise imminente`
                          : "Stabilisez votre document dans le cadre pour déclencher le scan"}
                      </span>
                    </div>

                    {autoCaptureEnabled && stabilityScore > 20 && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="rounded-full bg-blue-600/30 p-4 backdrop-blur-md animate-pulse">
                          <span className="text-white text-xs font-black">
                            {stabilityScore >= 80 ? "📸 SCAN AUTOMATIQUE !" : "STABILISATION..."}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Viewfinder Bottom Controls */}
                  <div className="absolute bottom-5 inset-x-0 flex items-center justify-around px-6">
                    <button
                      onClick={() => setAutoCaptureEnabled(!autoCaptureEnabled)}
                      className={`rounded-full px-3.5 py-2 text-xs font-bold backdrop-blur-md transition ${
                        autoCaptureEnabled
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-600/50"
                          : "bg-black/60 text-slate-300"
                      }`}
                    >
                      ⚡ Auto-scan : {autoCaptureEnabled ? "ON" : "OFF"}
                    </button>

                    <button
                      onClick={() => triggerCapture("original")}
                      className="group flex h-20 w-20 items-center justify-center rounded-full bg-white/30 p-1.5 backdrop-blur-md active:scale-95 transition"
                      title="Déclencher la capture en couleurs réelles"
                    >
                      <div className="h-full w-full rounded-full bg-white shadow-2xl transition group-hover:scale-90"></div>
                    </button>

                    <button
                      onClick={() => stopCamera()}
                      className="rounded-full bg-red-600/90 px-3.5 py-2 text-xs font-bold text-white backdrop-blur-md hover:bg-red-700 transition flex items-center gap-1 shadow-md"
                      title="Arrêter la caméra"
                    >
                      <span>🛑</span>
                      <span className="hidden sm:inline">Arrêter</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Camera Inactive Screen */
                <div className="p-8 sm:p-12 text-center text-white space-y-6">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-600/30 text-4xl shadow-inner">
                    {deviceType === "mobile" ? "📱" : "💻"}
                  </div>

                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold">
                      {deviceType === "mobile"
                        ? "Numérisation par Caméra Smartphone"
                        : "Numérisation par Caméra Ordinateur"}
                    </h3>
                    <p className="mt-2 text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
                      {deviceType === "mobile"
                        ? "Prenez le contrôle direct de la caméra arrière de votre smartphone pour numériser vos documents en couleurs réelles."
                        : "Activez votre webcam pour numériser vos documents avec auto-déclenchement dès stabilisation."}
                    </p>
                  </div>

                  {/* Diagnostic bar */}
                  <div className="rounded-2xl border border-slate-700 bg-slate-900/90 p-4 max-w-lg mx-auto text-left space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <span className={`h-2.5 w-2.5 rounded-full ${isReleasingCamera ? "bg-amber-400 animate-ping" : "bg-emerald-400"}`}></span>
                        État du capteur vidéo :
                      </span>
                      <button
                        type="button"
                        onClick={releaseAllCameraTracks}
                        disabled={isReleasingCamera}
                        className="rounded-lg bg-slate-800 px-2.5 py-1 text-[11px] font-bold text-slate-300 hover:bg-slate-700 hover:text-white transition flex items-center gap-1"
                        title="Réinitialiser et forcer l'arrêt"
                      >
                        <span>🔄</span> {isReleasingCamera ? "Libération..." : "Forcer l'arrêt / Libérer"}
                      </button>
                    </div>
                    <p className="text-xs font-medium text-slate-300">{cameraStatusMsg}</p>
                  </div>

                  {cameraError && (
                    <div className="rounded-xl bg-red-900/60 p-3.5 text-xs text-red-200 border border-red-800 text-left max-w-lg mx-auto">
                      ⚠️ {cameraError}
                    </div>
                  )}

                  <div className="flex justify-center pt-2">
                    {deviceType === "computer" ? (
                      <button
                        onClick={() => startCamera("user")}
                        className="rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg hover:bg-blue-500 transition flex items-center gap-2"
                      >
                        <span>💻</span> Activer la Webcam PC
                      </button>
                    ) : (
                      <button
                        onClick={() => startCamera("environment")}
                        className="rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg hover:bg-blue-500 transition flex items-center gap-2"
                      >
                        <span>📱</span> Activer la caméra Smartphone
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* STEP 2: REVUE DU LOT DE DOCUMENTS SCANNÉS */}
      {currentStep === "review-batch" && currentItem && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-900">
                Lot de scans : {scannedBatch.length} document(s)
              </span>
              <span className="text-xs text-slate-700 font-bold bg-slate-100 px-2.5 py-1 rounded-lg">
                Volume facturé : {totalBatchMb} Mo (Entier)
              </span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowIncrustationModal(true)}
                className="rounded-xl border border-blue-300 bg-blue-50 px-3.5 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 transition flex items-center gap-1.5"
              >
                <span>🔍</span> Incrustation HD (Agrandir)
              </button>

              <button
                onClick={() => {
                  setCurrentStep("capture");
                  if (isScanPermitted) void startCamera(cameraFacing);
                }}
                className="rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-800 transition"
              >
                + Scanner un autre document
              </button>
            </div>
          </div>

          {/* Main Preview & Processing View */}
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Left Preview (8 cols) */}
            <div className="lg:col-span-8 overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <span className="text-xs font-bold uppercase text-slate-700">
                  Document {selectedItemIndex + 1} sur {scannedBatch.length} : {currentItem.name}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={rotateCurrentItem}
                    className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                  >
                    🔄 Pivoter (90°)
                  </button>
                  <button
                    onClick={() => removeBatchItem(selectedItemIndex)}
                    className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100"
                  >
                    🗑️ Supprimer
                  </button>
                </div>
              </div>

              {/* Processed Frame with quick zoom click */}
              <div
                onClick={() => setShowIncrustationModal(true)}
                className="group relative flex max-h-[380px] items-center justify-center overflow-hidden rounded-2xl bg-slate-950 p-2 border border-slate-800 cursor-pointer"
                title="Cliquer pour ouvrir l'incrustation HD"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentItem.dataUrl}
                  alt={currentItem.name}
                  style={{
                    transform: `rotate(${currentItem.rotation}deg)`,
                    filter:
                      currentItem.filter === "ocr-bw"
                        ? "grayscale(100%) contrast(160%) brightness(105%)"
                        : currentItem.filter === "high-contrast"
                        ? "contrast(135%)"
                        : currentItem.filter === "sharpen"
                        ? "contrast(110%) saturate(120%) brightness(102%)"
                        : "none",
                  }}
                  className="max-h-[360px] w-auto object-contain rounded-lg transition-all"
                />

                <div className="absolute bottom-3 right-3 rounded-lg bg-black/70 px-3 py-1 text-[11px] font-bold text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition">
                  🔍 Incrustation HD
                </div>
              </div>

              {/* Filters for Colors & OCR */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  Rendu & Traitement des couleurs :
                </label>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    onClick={() => applyFilterToCurrentItem("original")}
                    className={`rounded-xl py-2.5 text-xs font-bold border transition ${
                      currentItem.filter === "original"
                        ? "border-blue-600 bg-blue-50 text-blue-700 shadow-sm"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    🎨 Couleurs Réelles
                  </button>
                  <button
                    onClick={() => applyFilterToCurrentItem("sharpen")}
                    className={`rounded-xl py-2.5 text-xs font-bold border transition ${
                      currentItem.filter === "sharpen"
                        ? "border-blue-600 bg-blue-50 text-blue-700 shadow-sm"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    ✨ Vives & Net
                  </button>
                  <button
                    onClick={() => applyFilterToCurrentItem("high-contrast")}
                    className={`rounded-xl py-2.5 text-xs font-bold border transition ${
                      currentItem.filter === "high-contrast"
                        ? "border-blue-600 bg-blue-50 text-blue-700 shadow-sm"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    📷 Contraste +
                  </button>
                  <button
                    onClick={() => applyFilterToCurrentItem("ocr-bw")}
                    className={`rounded-xl py-2.5 text-xs font-bold border transition ${
                      currentItem.filter === "ocr-bw"
                        ? "border-blue-600 bg-blue-50 text-blue-700 shadow-sm"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    📝 Noir & Blanc
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Batch Strip & Validation (4 cols) */}
            <div className="lg:col-span-4 space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <h4 className="text-sm font-bold text-slate-900 m-0">Documents scannés ({scannedBatch.length})</h4>

                {/* Batch thumbnails */}
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {scannedBatch.map((item, idx) => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedItemIndex(idx)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition ${
                        selectedItemIndex === idx
                          ? "border-blue-600 bg-blue-50/60"
                          : "border-slate-100 hover:border-slate-200 bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.dataUrl} alt="" className="h-10 w-8 rounded object-cover border" />
                        <div>
                          <p className="text-xs font-bold text-slate-800 truncate max-w-[120px]">
                            {item.name}
                          </p>
                          <p className="text-[10px] text-slate-500">{(item.sizeBytes / 1024).toFixed(0)} Ko</p>
                        </div>
                      </div>
                      <span className="text-xs text-blue-600 font-bold">Doc {idx + 1}</span>
                    </div>
                  ))}
                </div>

                {/* Price summary preview (strictly integers) */}
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Quantité de documents :</span>
                    <span className="font-bold text-slate-800">{scannedBatch.length} document(s)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Volume facturé :</span>
                    <span className="font-bold text-slate-800">{totalBatchMb} Mo (Entier)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Mode choisi :</span>
                    <span className="font-bold text-slate-800">
                      {billingChoice === "license" ? "Licence Vérifiée" : "Paiement direct Stripe"}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-200">
                    <span className="font-bold text-slate-700">Total TTC à régler :</span>
                    <span className="font-black text-blue-700">
                      {billingChoice === "license" ? "0,00 € (Inclus)" : `${directPriceTtc} € TTC`}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setCurrentStep("pricing-payment")}
                  className="w-full rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-700 py-3.5 text-xs font-bold text-white shadow-md hover:from-blue-800 hover:to-indigo-800 transition"
                >
                  Valider ce lot & Passer au règlement ({totalBatchMb} Mo) →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: CONFIRMATION DU PAIEMENT & FACTURATION VALIDÉE */}
      {currentStep === "pricing-payment" && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
          <div className="border-b pb-4">
            <h2 className="text-xl font-bold text-slate-900">
              Règlement & Émission de Facture Validée
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Lot de {scannedBatch.length} document(s) pour un volume entier de {totalBatchMb} Mo.
            </p>
          </div>

          {billingChoice === "license" && verifiedLicense ? (
            <div className="rounded-2xl border-2 border-emerald-500 bg-emerald-50/80 p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-200 px-3 py-0.5 text-xs font-bold text-emerald-900">
                  <span>✓</span> Règlement par Licence Active
                </span>
                <span className="text-xs font-bold text-emerald-900">Pris en charge à 100% (0,00 € TTC)</span>
              </div>
              <p className="text-sm font-bold text-slate-900">{verifiedLicense.plan_name}</p>
              <p className="text-xs text-slate-600">
                Licence N° <strong>{verifiedLicense.license_number}</strong>. Vos {scannedBatch.length} documents ({totalBatchMb} Mo) sont enregistrés sans surcoût.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border-2 border-blue-500 bg-blue-50/80 p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-200 px-3 py-0.5 text-xs font-bold text-blue-900">
                  <span>💳</span> Paiement Immédiat via Stripe
                </span>
                <span className="text-sm font-black text-blue-800">{directPriceTtc} € TTC ({totalBatchMb} Mo)</span>
              </div>
              <p className="text-xs text-slate-600">
                En cliquant sur &quot;Payer avec Stripe&quot;, vous serez redirigé vers l&apos;interface sécurisée Stripe pour régler par Carte Bancaire. Dès la validation, la facture sera enregistrée dans votre espace Mes factures.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t">
            <button
              onClick={() => setCurrentStep("review-batch")}
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              ← Retour au lot
            </button>

            <button
              onClick={handleFinalizeAndCheckout}
              disabled={isProcessingCheckout}
              className="rounded-xl bg-gradient-to-r from-blue-700 to-indigo-700 px-6 py-3.5 text-xs font-bold text-white shadow-md hover:from-blue-800 hover:to-indigo-800 transition disabled:opacity-50 flex items-center gap-2"
            >
              {isProcessingCheckout ? (
                <span>Ouverture de Stripe / Validation...</span>
              ) : billingChoice === "direct" ? (
                <>
                  <span>💳</span> Payer {directPriceTtc} € TTC avec Stripe ({totalBatchMb} Mo) →
                </>
              ) : (
                <>
                  <span>✅</span> Confirmer avec ma licence (0,00 €) →
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: FACTURE OFFICIELLE ENREGISTRÉE & VALIDÉE */}
      {currentStep === "completed-invoice" && invoiceResult && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 shadow-lg text-center space-y-6 animate-fade-in">
          <div className="mx-auto flex h-18 w-18 items-center justify-center rounded-3xl bg-emerald-100 text-emerald-600 text-3xl shadow-inner">
            ✓
          </div>

          <div>
            <h2 className="text-2xl font-extrabold text-slate-900">
              Paiement confirmé & Facture validée avec succès !
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-lg mx-auto">
              Votre règlement a été validé et votre facture officielle a été enregistrée dans la liste de vos factures.
            </p>
          </div>

          {/* Official Invoice Card */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-left space-y-3 max-w-md mx-auto text-xs shadow-inner">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="font-bold text-slate-800 uppercase tracking-wider">Facture N°</span>
              <span className="font-mono font-bold text-blue-700">{invoiceResult.invoice_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Prestation :</span>
              <span className="font-medium text-slate-800 text-right">{invoiceResult.description}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Montant Total TTC :</span>
              <span className="font-black text-slate-900">{invoiceResult.total_ttc_eur} €</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Statut de validation :</span>
              <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                <span>✓</span> Payée & Validée par l&apos;administrateur
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Date d&apos;émission :</span>
              <span className="text-slate-700">{new Date(invoiceResult.created_at).toLocaleString("fr-FR")}</span>
            </div>
          </div>

          {/* Action Links */}
          <div className="grid gap-3 sm:grid-cols-3 max-w-lg mx-auto pt-2">
            <Link
              href="/billing"
              className="rounded-xl bg-blue-700 py-3 text-xs font-bold text-white shadow-md hover:bg-blue-800 transition text-center"
            >
              💳 Voir dans Mes factures
            </Link>

            <Link
              href="/documents"
              className="rounded-xl border border-slate-300 bg-white py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition text-center"
            >
              📁 Mes documents
            </Link>

            <button
              onClick={() => {
                setScannedBatch([]);
                setInvoiceResult(null);
                setCurrentStep("capture");
                if (isScanPermitted) void startCamera(cameraFacing);
              }}
              className="rounded-xl border border-blue-200 bg-blue-50 py-3 text-xs font-bold text-blue-700 hover:bg-blue-100 transition"
            >
              📸 Nouveau scan
            </button>
          </div>
        </div>
      )}

      {/* MODAL INCRUSTATION D'ÉCRAN HD */}
      {showIncrustationModal && currentItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-6 backdrop-blur-md animate-fade-in">
          <div className="relative flex flex-col h-full max-h-[92vh] w-full max-w-5xl rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden text-white">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/60">
              <div className="flex items-center gap-3">
                <span className="flex h-3 w-3 rounded-full bg-emerald-500 animate-pulse"></span>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Incrustation HD • Prévisualisation du document scanné
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Page {selectedItemIndex + 1}/{scannedBatch.length} — Couleurs réelles et netteté du document.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center rounded-xl bg-slate-800 p-1 border border-slate-700">
                  <button
                    onClick={() => setZoomLevel((z) => Math.max(75, z - 25))}
                    className="h-7 w-7 rounded-lg text-xs font-bold hover:bg-slate-700 transition"
                    title="Zoom arrière"
                  >
                    -
                  </button>
                  <span className="px-2 text-xs font-mono font-bold text-slate-300">{zoomLevel}%</span>
                  <button
                    onClick={() => setZoomLevel((z) => Math.min(300, z + 25))}
                    className="h-7 w-7 rounded-lg text-xs font-bold hover:bg-slate-700 transition"
                    title="Zoom avant"
                  >
                    +
                  </button>
                  <button
                    onClick={() => setZoomLevel(100)}
                    className="ml-1 rounded-md px-2 py-0.5 text-[10px] font-bold text-slate-400 hover:text-white"
                  >
                    Reset
                  </button>
                </div>

                <button
                  onClick={rotateCurrentItem}
                  className="rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-bold hover:bg-slate-700 border border-slate-700"
                  title="Pivoter de 90°"
                >
                  🔄 90°
                </button>

                <button
                  onClick={() => setShowIncrustationModal(false)}
                  className="rounded-xl bg-slate-800 p-1.5 text-slate-400 hover:bg-slate-700 hover:text-white"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="relative flex-1 overflow-auto p-4 flex items-center justify-center bg-black/90">
              <div
                style={{
                  transform: `scale(${zoomLevel / 100}) rotate(${currentItem.rotation}deg)`,
                  transformOrigin: "center center",
                  transition: "transform 0.15s ease-out",
                }}
                className="max-h-full max-w-full"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentItem.dataUrl}
                  alt={currentItem.name}
                  style={{
                    filter:
                      currentItem.filter === "ocr-bw"
                        ? "grayscale(100%) contrast(160%) brightness(105%)"
                        : currentItem.filter === "high-contrast"
                        ? "contrast(135%)"
                        : currentItem.filter === "sharpen"
                        ? "contrast(110%) saturate(120%) brightness(102%)"
                        : "none",
                  }}
                  className="max-h-[68vh] w-auto object-contain rounded-lg shadow-2xl border border-slate-700"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-3.5 border-t border-slate-800 bg-slate-950/80">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">Rendu :</span>
                <button
                  onClick={() => applyFilterToCurrentItem("original")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                    currentItem.filter === "original"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  🎨 Couleurs Réelles
                </button>
                <button
                  onClick={() => applyFilterToCurrentItem("sharpen")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                    currentItem.filter === "sharpen"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  ✨ Vives & Net
                </button>
                <button
                  onClick={() => applyFilterToCurrentItem("high-contrast")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                    currentItem.filter === "high-contrast"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  📷 Contraste +
                </button>
                <button
                  onClick={() => applyFilterToCurrentItem("ocr-bw")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                    currentItem.filter === "ocr-bw"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  📝 Noir & Blanc
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    removeBatchItem(selectedItemIndex);
                    setShowIncrustationModal(false);
                    setCurrentStep("capture");
                    if (isScanPermitted) void startCamera(cameraFacing);
                  }}
                  className="rounded-xl border border-red-800 bg-red-950/60 px-3.5 py-2 text-xs font-bold text-red-300 hover:bg-red-900"
                >
                  📸 Re-scanner cette page
                </button>

                <button
                  onClick={() => {
                    setShowIncrustationModal(false);
                    setCurrentStep("review-batch");
                  }}
                  className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2 text-xs font-extrabold text-white shadow-lg hover:from-emerald-700 hover:to-teal-700 transition"
                >
                  ✅ Valider ce document ({scannedBatch.length} doc(s))
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function SmartScanStudioPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Chargement du studio de scan...</div>}>
      <SmartScanStudioContent />
    </Suspense>
  );
}
