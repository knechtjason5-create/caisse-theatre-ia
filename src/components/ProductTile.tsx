"use client";

import { Produit } from "@/lib/types";
import { formaterEuros } from "@/lib/format";
import { useCaisse } from "@/lib/store";

export default function ProductTile({ produit }: { produit: Produit }) {
  const quantite = useCaisse((e) => e.quantiteDansPanier(produit.id));
  const ajouterAuPanier = useCaisse((e) => e.ajouterAuPanier);

  return (
    <div
      className={`flex flex-col gap-2 rounded-xl border px-4 py-3.5 transition-colors ${
        quantite > 0
          ? "border-ink bg-ink text-bg"
          : "border-line bg-surface text-ink"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[15px] font-medium leading-snug">{produit.nom}</span>
        <span
          className={`font-mono text-[13px] tabular-nums ${
            quantite > 0 ? "text-bg/70" : "text-ink-faint"
          }`}
        >
          {formaterEuros(produit.prix)}
        </span>
      </div>

      <div className="flex items-center justify-end gap-1">
        <button
          aria-label={`Retirer un ${produit.nom}`}
          disabled={quantite === 0}
          onClick={() => ajouterAuPanier(produit.id, -1)}
          className={`flex h-9 w-9 items-center justify-center rounded-full text-lg leading-none disabled:opacity-30 ${
            quantite > 0 ? "bg-bg/15 text-bg" : "bg-surface-2 text-ink"
          }`}
        >
          −
        </button>
        <span className="w-6 text-center font-mono text-sm tabular-nums">
          {quantite}
        </span>
        <button
          aria-label={`Ajouter un ${produit.nom}`}
          onClick={() => ajouterAuPanier(produit.id, 1)}
          className={`flex h-9 w-9 items-center justify-center rounded-full text-lg leading-none ${
            quantite > 0 ? "bg-bg/15 text-bg" : "bg-surface-2 text-ink"
          }`}
        >
          +
        </button>
      </div>
    </div>
  );
}
