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
        {CATEGORIES.map((categorie) => {
          const produitsCategorie = produits.filter((p) => p.categorie === categorie);
          if (produitsCategorie.length === 0) return null;
          return (
            <section key={categorie} className="mb-6">
              <h2 className="mb-2.5 font-mono text-xs uppercase tracking-wider text-ink-faint">
                {categorie}
              </h2>
              <div className="grid grid-cols-2 gap-2.5">
                {produitsCategorie.map((p) => (
                  <ProductTile key={p.id} produit={p} />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {nbArticles > 0 && !encaissementOuvert && (
        <button
          onClick={() => setEncaissementOuvert(true)}
          className="fixed inset-x-4 bottom-20 z-30 flex items-center justify-between rounded-full bg-ink px-5 py-3.5 text-bg shadow-lg"
        >
          <span className="font-mono text-sm tabular-nums">
            {nbArticles} article{nbArticles > 1 ? "s" : ""}
          </span>
          <span className="text-base font-medium tabular-nums">
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
        <div className="fixed inset-x-4 bottom-20 z-40 rounded-full bg-ink px-5 py-3.5 text-center text-sm font-medium text-bg shadow-lg">
          Vente enregistrée
        </div>
      )}
    </div>
  );
}
