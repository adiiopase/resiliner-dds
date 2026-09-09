"use client";

import { useState } from "react";

export default function BonDeCommande() {
    // Liste statique des produits
    const products = [
        "OCR_simple (Optical Character Recognition standard)",
        "OCR_complexe (Optical Character Recognition complexe)",
        "IA (Classification automatique de documents)",
        "Cloud sécurisé standard",
        "Cloud sécurisé optimum",
        "Cloud sécurisé optimum illimité",
        "API_integration (Application Programming Interface)",
        "App_scan (Application mobile de scan sur site)",
        "ETATICIEL GLOBAL",
        "ETATICIEL Naissance",
        "ETATICIEL Décès",
        "ETATICIEL Mariage",
    ];

    const [form, setForm] = useState({ product: "", quantity: "" });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log("Commande envoyée :", form);
    };

    return (
        <div className="p-6 max-w-md mx-auto bg-white rounded shadow">
            <h1 className="text-xl font-bold mb-4">Bon de commande</h1>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block mb-1">Produit</label>
                    <select
                        value={form.product}
                        onChange={(e) => setForm({ ...form, product: e.target.value })}
                        required
                        className="w-full border rounded p-2"
                    >
                        <option value="">-- Choisir un produit --</option>
                        {products.map((p) => (
                            <option key={p} value={p}>
                                {p}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block mb-1">Quantité ou volume</label>
                    <input
                        type="number"
                        value={form.quantity}
                        onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                        required
                        className="w-full border rounded p-2"
                    />
                </div>

                <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                    Valider la commande
                </button>
            </form>
        </div>
    );
}
