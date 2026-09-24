"use client";

import { useEffect, useRef, useState } from "react";
import { Produit } from "@/lib/types";
import { formaterEuros } from "@/lib/format";
import { useCaisse } from "@/lib/store";
import { lancerVol } from "@/lib/vol";
import { vibrer } from "@/lib/haptique";

const DELAI_MAINTIEN = 380; // = animation « remplir » de globals.css
const CADENCE_INITIALE = 220;
const CADENCE_MIN = 70;

export default function ProductTile({ produit, delai = 0 }: { produit: Produit; delai?: number }) {
  const quantite = useCaisse((e) => e.quantiteDansPanier(produit.id));
  const ajouterAuPanier = useCaisse((e) => e.ajouterAuPanier);
  const [maintien, setMaintien] = useState<"non" | "charge" | "repete">("non");
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aRepete = useRef(false);

  const ajouter = (bouton: HTMLElement) => {
    ajouterAuPanier(produit.id, 1);
    lancerVol(bouton.getBoundingClientRect());
    vibrer(8);
  };

  const arreter = () => {
    if (minuteur.current) clearTimeout(minuteur.current);
    minuteur.current = null;
    setMaintien("non");
  };

  useEffect(
    () => () => {
      if (minuteur.current) clearTimeout(minuteur.current);
    },
    []
  );

  // Maintenir le « + » : après un court temps de charge, les ajouts se répètent de plus en plus vite.
  const demarrerMaintien = (bouton: HTMLElement) => {
    aRepete.current = false;
    setMaintien("charge");
    minuteur.current = setTimeout(() => {
      setMaintien("repete");
      let cadence = CADENCE_INITIALE;
      const repeter = () => {
        aRepete.current = true;
        ajouter(bouton);
        cadence = Math.max(CADENCE_MIN, cadence * 0.85);
        minuteur.current = setTimeout(repeter, cadence);
      };
      repeter();
    }, DELAI_MAINTIEN);
  };

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
          onClick={() => {
            ajouterAuPanier(produit.id, -1);
            vibrer(6);
          }}
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
          onClick={(e) => {
            // Un maintien a déjà ajouté les boissons : le clic qui le termine ne doit pas en ajouter une de plus.
            if (aRepete.current) {
              aRepete.current = false;
              return;
            }
            ajouter(e.currentTarget);
          }}
          onPointerDown={(e) => {
            if (e.button === 0) demarrerMaintien(e.currentTarget);
          }}
          onPointerUp={arreter}
          onPointerLeave={arreter}
          onPointerCancel={arreter}
          onContextMenu={(e) => e.preventDefault()}
          className={`relative flex h-9 w-9 select-none items-center justify-center rounded-full text-lg leading-none ${
            quantite > 0 ? "bg-bg/15 text-bg" : "bg-surface-2 text-ink"
          }`}
        >
          {maintien !== "non" && (
            <svg aria-hidden viewBox="0 0 36 36" className="pointer-events-none absolute inset-0 h-full w-full -rotate-90">
              <circle
                cx="18"
                cy="18"
                r="17"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={maintien === "charge" ? "anim-remplir" : "anim-battement"}
              />
            </svg>
          )}
          +
        </button>
      </div>
    </div>
  );
}
