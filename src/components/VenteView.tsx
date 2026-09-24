"use client";

import { useEffect, useMemo, useState } from "react";
import { CATEGORIES, useCaisse } from "@/lib/store";
import ProductTile from "./ProductTile";
import Encaissement from "./Encaissement";
import { formaterEuros } from "@/lib/format";

export default function VenteView({ onOuvrirSoiree }: { onOuvrirSoiree: () => void }) {
  const soiree = useCaisse((e) => e.soireeActive());
  const tousLesProduits = useCaisse((e) => e.produits);
  const produits = useMemo(
    () => tousLesProduits.filter((p) => p.visible),
    [tousLesProduits]
  );
  const total = useCaisse((e) => e.totalPanier());
  const nbArticles = useCaisse((e) =>
    e.panier.reduce((n, a) => n + a.quantite, 0)
  );

  const [encaissementOuvert, setEncaissementOuvert] = useState(false);
  const [venteConfirmee, setVenteConfirmee] = useState(false);

  useEffect(() => {
    if (!venteConfirmee) return;
    const t = setTimeout(() => setVenteConfirmee(false), 2200);
    return () => clearTimeout(t);
  }, [venteConfirmee]);

  if (!soiree) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
        <p className="text-sm text-ink-soft">
          Aucune soirée en cours — ouvrez-en une pour commencer à vendre.
        </p>
        <button
          onClick={onOuvrirSoiree}
          className="rounded-full bg-ink px-6 py-3 text-sm font-medium text-bg"
        >
          Ouvrir une soirée
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 overflow-y-auto px-4 pb-28 pt-4">
        {CATEGORIES.map((categorie, ci) => {
          const produitsCategorie = produits.filter((p) => p.categorie === categorie);
          if (produitsCategorie.length === 0) return null;
          return (
            <section key={categorie} className="mb-6">
              <h2
                style={{ animationDelay: `${ci * 90}ms` }}
                className="anim-fondu mb-2.5 font-mono text-xs uppercase tracking-wider text-ink-faint"
              >
                {categorie}
              </h2>
              <div className="grid grid-cols-2 gap-2.5">
                {produitsCategorie.map((p, i) => (
                  <ProductTile key={p.id} produit={p} delai={ci * 90 + Math.min(i, 6) * 45} />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {nbArticles > 0 && !encaissementOuvert && (
        <button
          onClick={() => setEncaissementOuvert(true)}
          className="anim-monter fixed inset-x-4 bottom-20 z-30 flex items-center justify-between rounded-full bg-ink px-5 py-3.5 text-bg shadow-lg"
        >
          <span className="font-mono text-sm tabular-nums">
            {nbArticles} article{nbArticles > 1 ? "s" : ""}
          </span>
          <span key={total} className="anim-pop-doux inline-block text-base font-medium tabular-nums">
            {formaterEuros(total)} · Encaisser
          </span>
        </button>
      )}

      {encaissementOuvert && (
        <Encaissement
          onRetour={() => setEncaissementOuvert(false)}
          onValide={() => {
            setEncaissementOuvert(false);
            setVenteConfirmee(true);
          }}
        />
      )}

      {venteConfirmee && (
        <div className="anim-toast fixed inset-x-4 bottom-20 z-40 flex items-center justify-center gap-2 rounded-full bg-ink px-5 py-3.5 text-sm font-medium text-bg shadow-lg">
          <svg
            className="h-4 w-4"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path className="anim-trace" pathLength={1} d="M3 8.5l3.2 3.2L13 4.8" />
          </svg>
          Vente enregistrée
        </div>
      )}
    </div>
  );
}
