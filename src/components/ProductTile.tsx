"use client";

import { Produit } from "@/lib/types";
import { formaterEuros } from "@/lib/format";
import { useCaisse } from "@/lib/store";

export default function ProductTile({ produit, delai = 0 }: { produit: Produit; delai?: number }) {
  const quantite = useCaisse((e) => e.quantiteDansPanier(produit.id));
  const ajouterAuPanier = useCaisse((e) => e.ajouterAuPanier);

  return (
    <div
      style={{ animationDelay: `${delai}ms` }}
      className={`anim-monter relative flex flex-col gap-2 rounded-xl border px-4 py-3.5 transition-colors duration-200 ${
        quantite > 0
          ? "border-ink bg-ink text-bg"
          : "border-line bg-surface text-ink"
      }`}
    >
      {quantite > 0 && (
        <span
          key={quantite}
          aria-hidden
          className="anim-halo pointer-events-none absolute inset-0 rounded-xl border-2 border-ink"
        />
      )}
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
        <span
          key={quantite}
          className={`inline-block w-6 text-center font-mono text-sm tabular-nums ${quantite > 0 ? "anim-pop" : ""}`}
        >
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
