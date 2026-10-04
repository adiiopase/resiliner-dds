"use client";

import { useState } from "react";

export default function ApiDocsPage() {
  const [activeTab, setActiveTab] = useState<"curl" | "ts" | "python" | "php" | "csharp">("curl");
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [testResponse, setTestResponse] = useState<string | null>(null);
  const [testingApi, setTestingApi] = useState(false);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  // Run live test of the API
  const handleTestApi = async () => {
    setTestingApi(true);
    setTestResponse(null);
    try {
      const res = await fetch("/api/v1/document/analyse");
      const data = await res.json();
      setTestResponse(JSON.stringify(data, null, 2));
    } catch {
      setTestResponse(JSON.stringify({ error: "Erreur de connexion à l'API" }, null, 2));
    } finally {
      setTestingApi(false);
    }
  };

  const curlExample = `curl -X POST http://localhost:3000/api/v1/document/analyse \\
  -H "X-API-Key: dds_live_sec_894123456789" \\
  -H "Content-Type: application/json" \\
  -d '{
    "imageBase64": "data:image/jpeg;base64,...",
    "filename": "facture_fournisseur_EDF.pdf",
    "language": "fra"
  }'`;

  const tsExample = `// Exemple TypeScript / Node.js (Intégration ERP / Backend)
async function analyserDocument(filePath: string, apiKey: string) {
  const fileBuffer = await fs.promises.readFile(filePath);
  const base64 = \`data:application/pdf;base64,\${fileBuffer.toString("base64")}\`;

  const response = await fetch("http://localhost:3000/api/v1/document/analyse", {
    method: "POST",
    headers: {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      imageBase64: base64,
      filename: "facture_fournisseur_EDF.pdf",
      language: "fra",
    }),
  });

  const result = await response.json();
  console.log("Catégorie détectée par l'IA :", result.classification.category);
  console.log("Montant Total TTC :", result.extractedFields.amounts.totalTtc);
  return result;
}`;

  const pythonExample = `# Exemple Python (Scripts, IA & Data Pipelines)
import requests
import base64

def analyser_document(file_path: str, api_key: str):
    with open(file_path, "rb") as f:
        encoded = base64.b64encode(f.read()).decode("utf-8")
        
    url = "http://localhost:3000/api/v1/document/analyse"
    headers = {
        "X-API-Key": api_key,
        "Content-Type": "application/json"
    }
    payload = {
        "imageBase64": f"data:application/pdf;base64,{encoded}",
        "filename": "facture_fournisseur_EDF.pdf",
        "language": "fra"
    }
    
    response = requests.post(url, json=payload, headers=headers)
    data = response.json()
    
    # Exploitation directe dans votre ERP / CRM :
    print("Type de document :", data["classification"]["category"])
    print("Fournisseur :", data["extractedFields"]["legalEntities"]["companyName"])
    print("Total TTC (€) :", data["extractedFields"]["amounts"]["totalTtc"])
    return data`;

  const phpExample = `<?php
// Exemple PHP / Odoo / Dolibarr / WordPress
function analyserDocument($filePath, $apiKey) {
    $fileData = file_get_contents($filePath);
    $base64 = 'data:application/pdf;base64,' . base64_encode($fileData);

    $ch = curl_init('http://localhost:3000/api/v1/document/analyse');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'X-API-Key: ' . $apiKey,
        'Content-Type: application/json'
    ]);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
        'imageBase64' => $base64,
        'filename' => 'facture_fournisseur_EDF.pdf',
        'language' => 'fra'
    ]));

    $response = curl_exec($ch);
    curl_close($ch);
    
    $result = json_decode($response, true);
    // Injection directe dans la comptabilité :
    $montantTTC = $result['extractedFields']['amounts']['totalTtc'];
    return $result;
}`;

  const csharpExample = `// Exemple C# / .NET (Connecteur SAP / Sage / Microsoft Dynamics)
using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

public class DigitalDocsClient {
    private static readonly HttpClient client = new HttpClient();

    public static async Task<JsonDocument> AnalyserDocumentAsync(string base64Doc, string apiKey) {
        var payload = new {
            imageBase64 = base64Doc,
            filename = "facture_fournisseur.pdf",
            language = "fra"
        };

        var request = new HttpRequestMessage(HttpMethod.Post, "http://localhost:3000/api/v1/document/analyse");
        request.Headers.Add("X-API-Key", apiKey);
        request.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

        var response = await client.SendAsync(request);
        var jsonString = await response.Content.ReadAsStringAsync();
        return JsonDocument.Parse(jsonString);
    }
}`;

  const sampleJsonResponse = `{
  "success": true,
  "document": {
    "filename": "facture_fournisseur_EDF.pdf",
    "mimeType": "application/pdf",
    "sizeBytes": 245760,
    "sizeKb": 240,
    "classifiedType": "FACTURE"
  },
  "classification": {
    "category": "FACTURE",
    "confidenceScore": 98,
    "sector": "COMMERCIAL",
    "sectorLabel": "Pôle Commercial & Ventes",
    "reasoning": "Classifié automatiquement comme Facture (98% de certitude) basé sur les indicateurs : FACTURE N°, TOTAL TTC, NET À PAYER, TVA.",
    "detectedIndicators": [
      "FACTURE N°",
      "TOTAL TTC",
      "NET A PAYER",
      "TVA"
    ]
  },
  "extractedFields": {
    "documentNumber": "F2026-4587",
    "documentDate": "20/04/2026",
    "dueDate": "20/05/2026",
    "amounts": {
      "amountHt": 204.92,
      "vatRate": 20.00,
      "vatAmount": 40.98,
      "totalTtc": 245.90,
      "currency": "EUR",
      "isBalanced": true,
      "reconciliationMessage": "Équilibre comptable parfait (HT 204.92 € + TVA 40.98 € = TTC 245.90 €)"
    },
    "legalEntities": {
      "companyName": "EDF ENERGIE COMMERCIALE",
      "siret": "552 081 317 00018",
      "tvaNumber": "FR 12 552081317",
      "iban": "FR76 3000 4000 5000 6000 7000 890"
    }
  },
  "meta": {
    "processedAt": "2026-09-17T03:30:00.000Z",
    "processingTimeMs": 312,
    "engine": "DigitalDocs OCR & IA Souverain v1.0"
  }
}`;

  return (
    <div className="mx-auto max-w-5xl space-y-10 pb-20">
      {/* Hero Header */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">
          <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span>
          API REST d&apos;Intégration d&apos;Entreprise v1.0 • DigitalDocs Solutions
        </div>
        <h1 className="text-3xl font-black text-slate-900 sm:text-4xl">
          API d&apos;Intégration & Automatisation des Workflows
        </h1>
        <p className="text-sm text-slate-600 max-w-3xl leading-relaxed">
          Connectez instantanément vos logiciels de gestion (ERP : SAP, Sage, Odoo ; CRM : Salesforce, HubSpot ; GED : SharePoint, Alfresco) à notre moteur souverain pour automatiser l&apos;ingestion, la classification IA et l&apos;extraction de vos documents sans aucune intervention humaine.
        </p>
      </div>

      {/* 4 Pillars Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
          <span className="text-3xl">🤖</span>
          <h4 className="text-sm font-black text-slate-900">Zéro Saisie Humaine</h4>
          <p className="text-xs text-slate-500">
            Transformation automatique des flux de documents en écritures comptables et données structurées.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
          <span className="text-3xl">🔌</span>
          <h4 className="text-sm font-black text-slate-900">Intégration Universelle</h4>
          <p className="text-xs text-slate-500">
            Compatible avec tous les ERP (SAP, Sage, Odoo), CRM (Salesforce) et applications métiers via REST/JSON.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
          <span className="text-3xl">🌍</span>
          <h4 className="text-sm font-black text-slate-900">100% Souverain</h4>
          <p className="text-xs text-slate-500">
            Exécution locale ou sur datacenters nationaux souverains (Sénégal, RCI, Maroc, France).
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
          <span className="text-3xl">⚡</span>
          <h4 className="text-sm font-black text-slate-900">Temps Réel (~300ms)</h4>
          <p className="text-xs text-slate-500">
            Classification sémantique et extraction complète retournées en une fraction de seconde.
          </p>
        </div>
      </div>

      {/* SECTION : WORKFLOW D'INTÉGRATION */}
      <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <span>🔄</span> Le Cycle de Traitement Automatisé de l&apos;API
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Comment l&apos;API s&apos;insère dans votre écosystème informatique d&apos;entreprise.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200 space-y-2">
            <span className="rounded-full bg-blue-100 text-blue-800 px-2 py-0.5 text-[10px] font-black">
              ÉTAPE 1
            </span>
            <h3 className="font-bold text-slate-900 text-sm">1. Envoi par le Logiciel Client</h3>
            <p className="text-xs text-slate-600">
              Votre ERP, CRM ou boîte e-mail envoie une requête <code>POST /api/v1/document/analyse</code> avec le fichier PDF ou l&apos;image scannée.
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200 space-y-2">
            <span className="rounded-full bg-indigo-100 text-indigo-800 px-2 py-0.5 text-[10px] font-black">
              ÉTAPE 2
            </span>
            <h3 className="font-bold text-slate-900 text-sm">2. Moteur OCR & IA Souveraine</h3>
            <p className="text-xs text-slate-600">
              DigitalDocs lit les caractères, détermine la catégorie parmi 22 types métiers, isole les montants et valide l&apos;équilibre comptable.
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200 space-y-2">
            <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-black">
              ÉTAPE 3
            </span>
            <h3 className="font-bold text-slate-900 text-sm">3. Réponse Structurée & Action</h3>
            <p className="text-xs text-slate-600">
              L&apos;API renvoie le JSON prêt à l&apos;emploi pour créer l&apos;écriture comptable ou archiver le document dans le Cloud Sécurisé.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION : CODE SNIPPETS MULTI-LANGAGES */}
      <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <span>💻</span> Exemples d&apos;Intégration Multi-Langages
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Copiez-collez le code adapté à votre technologie d&apos;entreprise.
            </p>
          </div>

          {/* Tab Selector */}
          <div className="flex flex-wrap gap-1.5 rounded-xl bg-slate-100 p-1">
            <button
              onClick={() => setActiveTab("curl")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                activeTab === "curl" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              cURL
            </button>
            <button
              onClick={() => setActiveTab("python")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                activeTab === "python" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Python
            </button>
            <button
              onClick={() => setActiveTab("ts")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                activeTab === "ts" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Node.js / TS
            </button>
            <button
              onClick={() => setActiveTab("php")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                activeTab === "php" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              PHP (Odoo)
            </button>
            <button
              onClick={() => setActiveTab("csharp")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                activeTab === "csharp" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              C# (SAP/Sage)
            </button>
          </div>
        </div>

        {/* Code Snippet Box */}
        <div className="relative rounded-2xl bg-slate-900 p-5 font-mono text-xs text-slate-200 shadow-inner overflow-x-auto">
          <button
            onClick={() => {
              const codeMap = {
                curl: curlExample,
                python: pythonExample,
                ts: tsExample,
                php: phpExample,
                csharp: csharpExample,
              };
              copyToClipboard(codeMap[activeTab], "code_snippet");
            }}
            className="absolute top-4 right-4 rounded-lg bg-slate-800 px-3 py-1.5 text-[11px] font-bold text-slate-300 hover:bg-slate-700 transition"
          >
            {copiedSection === "code_snippet" ? "✓ Copié !" : "Copier le code"}
          </button>

          <pre className="pr-20">
            {activeTab === "curl" && curlExample}
            {activeTab === "python" && pythonExample}
            {activeTab === "ts" && tsExample}
            {activeTab === "php" && phpExample}
            {activeTab === "csharp" && csharpExample}
          </pre>
        </div>
      </div>

      {/* SECTION : FORMAT DE RÉPONSE JSON STANDARDISÉ */}
      <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <span>📋</span> Format de Réponse JSON Retourné
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Structure de données standardisée avec classification IA, données comptables et métadonnées.
            </p>
          </div>
          <button
            onClick={handleTestApi}
            disabled={testingApi}
            className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition disabled:opacity-50"
          >
            {testingApi ? "Test en cours..." : "⚡ Tester la route GET en direct"}
          </button>
        </div>

        {testResponse && (
          <div className="rounded-2xl bg-emerald-950 p-4 font-mono text-xs text-emerald-300 space-y-1">
            <p className="text-[10px] font-bold uppercase text-emerald-500">Réponse de test en direct :</p>
            <pre className="overflow-x-auto">{testResponse}</pre>
          </div>
        )}

        <div className="rounded-2xl bg-slate-900 p-5 font-mono text-xs text-emerald-400 shadow-inner overflow-x-auto">
          <pre>{sampleJsonResponse}</pre>
        </div>
      </div>
    </div>
  );
}
