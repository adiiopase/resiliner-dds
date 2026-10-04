"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type HomepageBanner = {
  id: string;
  title: string;
  alt_text: string;
  image_url: string;
  is_active: boolean;
  sort_order: number;
};

type BannerDraft = Pick<HomepageBanner, "title" | "alt_text"> & {
  replacementImage: File | null;
};

async function fetchBanners(): Promise<HomepageBanner[]> {
  const response = await fetch("/api/admin/banners", { cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Impossible de charger les bannières.");
  return data.banners as HomepageBanner[];
}

function createDrafts(banners: HomepageBanner[]) {
  return Object.fromEntries(
    banners.map((banner) => [banner.id, {
      title: banner.title,
      alt_text: banner.alt_text,
      replacementImage: null,
    }]),
  );
}

export default function BannerManagement() {
  const [banners, setBanners] = useState<HomepageBanner[]>([]);
  const [drafts, setDrafts] = useState<Record<string, BannerDraft>>({});
  const [title, setTitle] = useState("");
  const [altText, setAltText] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [savingUpload, setSavingUpload] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function loadBanners() {
    try {
      const loadedBanners = await fetchBanners();
      setBanners(loadedBanners);
      setDrafts(createDrafts(loadedBanners));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    fetchBanners()
      .then((loadedBanners) => {
        if (cancelled) return;
        setBanners(loadedBanners);
        setDrafts(createDrafts(loadedBanners));
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Erreur de chargement.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function addBanner(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    if (!image || !title.trim()) {
      setError("Choisis une image et indique un titre.");
      return;
    }

    setSavingUpload(true);
    setError("");
    setStatus("");
    const form = new FormData();
    form.set("image", image);
    form.set("title", title.trim());
    form.set("alt_text", altText.trim());

    try {
      const response = await fetch("/api/admin/banners", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "La bannière n’a pas pu être ajoutée.");

      setTitle("");
      setAltText("");
      setImage(null);
      formElement.reset();
      setStatus("Bannière ajoutée.");
      await loadBanners();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Erreur d’ajout.");
    } finally {
      setSavingUpload(false);
    }
  }

  async function updateBanner(
    id: string,
    changes: Partial<HomepageBanner>,
    replacementImage?: File,
  ) {
    setBusyId(id);
    setError("");
    setStatus("");
    try {
      let response: Response;
      if (replacementImage) {
        const form = new FormData();
        form.set("id", id);
        form.set("title", String(changes.title || ""));
        form.set("alt_text", String(changes.alt_text || ""));
        form.set("image", replacementImage);
        response = await fetch("/api/admin/banners", { method: "PATCH", body: form });
      } else {
        response = await fetch("/api/admin/banners", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, ...changes }),
        });
      }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "La modification a échoué.");
      setStatus("Modification enregistrée.");
      await loadBanners();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Erreur de modification.");
    } finally {
      setBusyId("");
    }
  }

  async function moveBanner(index: number, direction: -1 | 1) {
    const otherIndex = index + direction;
    if (otherIndex < 0 || otherIndex >= banners.length) return;

    const current = banners[index];
    const other = banners[otherIndex];
    setBusyId(current.id);
    setError("");
    setStatus("");
    try {
      const updates = await Promise.all([
        fetch("/api/admin/banners", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: current.id, sort_order: other.sort_order }),
        }),
        fetch("/api/admin/banners", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: other.id, sort_order: current.sort_order }),
        }),
      ]);
      if (updates.some((response) => !response.ok)) {
        throw new Error("Le nouvel ordre n’a pas pu être enregistré.");
      }
      setStatus("Ordre des bannières modifié.");
      await loadBanners();
    } catch (moveError) {
      setError(moveError instanceof Error ? moveError.message : "Erreur de réorganisation.");
    } finally {
      setBusyId("");
    }
  }

  async function deleteBanner(banner: HomepageBanner) {
    if (!window.confirm(`Supprimer la bannière « ${banner.title} » ?`)) return;

    setBusyId(banner.id);
    setError("");
    setStatus("");
    try {
      const response = await fetch("/api/admin/banners", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: banner.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "La suppression a échoué.");
      setStatus(data.warning || "Bannière supprimée.");
      await loadBanners();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Erreur de suppression.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <section id="carousel-banners" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="banner-management-title">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h2 id="banner-management-title" className="text-lg font-bold text-slate-900">
            Gestion du carrousel d’accueil
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Ajoute, modifie, masque, réordonne ou supprime les images affichées sur la page d’accueil.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            setError("");
            void loadBanners();
          }}
          disabled={loading}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Actualiser
        </button>
      </div>

      {error && <p role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {status && <p role="status" className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{status}</p>}

      <form onSubmit={addBanner} className="mt-5 grid gap-4 rounded-lg bg-slate-50 p-4 md:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
          Image
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
            onChange={(event) => setImage(event.target.files?.[0] || null)}
            className="block w-full rounded-md border border-slate-300 bg-white p-2 text-sm"
          />
          <span className="text-xs font-normal text-slate-500">JPEG, PNG, WebP, AVIF ou GIF, 10 Mo maximum.</span>
        </label>
        <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
          Titre de gestion
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={120}
            required
            className="rounded-md border border-slate-300 bg-white px-3 py-2 font-normal"
          />
        </label>
        <label className="grid gap-1.5 text-sm font-semibold text-slate-700 md:col-span-2">
          Texte alternatif accessible
          <input
            value={altText}
            onChange={(event) => setAltText(event.target.value)}
            maxLength={200}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 font-normal"
          />
        </label>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={savingUpload || !image || !title.trim()}
            className="rounded-md bg-blue-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {savingUpload ? "Ajout en cours…" : "Ajouter une bannière"}
          </button>
        </div>
      </form>

      <div className="mt-5 divide-y divide-slate-100">
        {loading ? (
          <p className="py-8 text-center text-sm text-slate-500">Chargement des bannières…</p>
        ) : banners.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">Aucune bannière enregistrée.</p>
        ) : banners.map((banner, index) => {
          const draft = drafts[banner.id] || {
            title: banner.title,
            alt_text: banner.alt_text,
            replacementImage: null,
          };
          const isBusy = busyId === banner.id;

          return (
            <article key={banner.id} className="grid gap-4 py-5 md:grid-cols-[180px_minmax(0,1fr)_auto] md:items-center">
              <div className="relative aspect-video overflow-hidden rounded-md bg-slate-100">
                <Image src={banner.image_url} alt={banner.alt_text || banner.title} fill unoptimized sizes="180px" className="object-cover" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-xs font-semibold text-slate-600">
                  Titre
                  <input
                    value={draft.title}
                    onChange={(event) => setDrafts((current) => ({ ...current, [banner.id]: { ...draft, title: event.target.value } }))}
                    maxLength={120}
                    className="rounded-md border border-slate-300 px-2.5 py-2 text-sm font-normal text-slate-900"
                  />
                </label>
                <label className="grid gap-1 text-xs font-semibold text-slate-600">
                  Texte alternatif
                  <input
                    value={draft.alt_text}
                    onChange={(event) => setDrafts((current) => ({ ...current, [banner.id]: { ...draft, alt_text: event.target.value } }))}
                    maxLength={200}
                    className="rounded-md border border-slate-300 px-2.5 py-2 text-sm font-normal text-slate-900"
                  />
                </label>
                <label className="grid gap-1 text-xs font-semibold text-slate-600 sm:col-span-2">
                  Remplacer l’image
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
                    onChange={(event) => setDrafts((current) => ({
                      ...current,
                      [banner.id]: {
                        ...draft,
                        replacementImage: event.target.files?.[0] || null,
                      },
                    }))}
                    className="block w-full rounded-md border border-slate-300 bg-white p-2 text-xs font-normal"
                  />
                </label>
                <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={banner.is_active}
                    disabled={isBusy}
                    onChange={(event) => void updateBanner(banner.id, { is_active: event.target.checked })}
                    className="h-4 w-4 accent-blue-700"
                  />
                  Afficher dans le carrousel public
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-2 md:justify-end">
                <button type="button" title="Monter" aria-label={`Monter ${banner.title}`} disabled={index === 0 || isBusy} onClick={() => void moveBanner(index, -1)} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40">↑</button>
                <button type="button" title="Descendre" aria-label={`Descendre ${banner.title}`} disabled={index === banners.length - 1 || isBusy} onClick={() => void moveBanner(index, 1)} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40">↓</button>
                <button
                  type="button"
                  disabled={isBusy || !draft.title.trim()}
                  onClick={() => void updateBanner(
                    banner.id,
                    { title: draft.title, alt_text: draft.alt_text },
                    draft.replacementImage || undefined,
                  )}
                  className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
                >
                  Enregistrer
                </button>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => void deleteBanner(banner)}
                  className="rounded-md border border-red-300 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  Supprimer
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
