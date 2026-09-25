"use client";

import { useEffect, useRef, useState } from "react";
import { Produit } from "@/lib/types";
import { formaterEuros } from "@/lib/format";
import { useCaisse } from "@/lib/store";
import { lancerVol } from "@/lib/vol";
import { vibrer } from "@/lib/haptique";
import { PictoCategorie } from "./Picto";

const DELAI_MAINTIEN = 380; // = animation « remplir-barre » de globals.css
const CADENCE_INITIALE = 220;
const CADENCE_MIN = 70;

/**
 * Tuile d'une boisson : la toucher n'importe où ajoute un verre, la maintenir en ajoute
 * plusieurs de plus en plus vite. Le « − » n'apparaît qu'une fois la boisson dans le panier.
 */
export default function ProductTile({ produit, delai = 0 }: { produit: Produit; delai?: number }) {
  const quantite = useCaisse((e) => e.quantiteDansPanier(produit.id));
  const ajouterAuPanier = useCaisse((e) => e.ajouterAuPanier);
  const [maintien, setMaintien] = useState<"non" | "charge" | "repete">("non");
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aRepete = useRef(false);
  const tuile = useRef<HTMLDivElement>(null);

  const ajouter = () => {
    ajouterAuPanier(produit.id, 1);
    if (tuile.current) lancerVol(tuile.current.getBoundingClientRect());
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

  // Maintenir la tuile : après un court temps de charge, les ajouts se répètent de plus en plus vite.
  const demarrerMaintien = () => {
    aRepete.current = false;
    setMaintien("charge");
    minuteur.current = setTimeout(() => {
      setMaintien("repete");
      let cadence = CADENCE_INITIALE;
      const repeter = () => {
        aRepete.current = true;
        ajouter();
        cadence = Math.max(CADENCE_MIN, cadence * 0.85);
        minuteur.current = setTimeout(repeter, cadence);
      };
      repeter();
    }, DELAI_MAINTIEN);
  };

  const choisie = quantite > 0;

  return (
    <div
      ref={tuile}
      role="button"
      tabIndex={0}
      data-visite="tuile"
      aria-label={`Ajouter un ${produit.nom}${choisie ? ` (${quantite} dans le panier)` : ""}`}
      style={{ animationDelay: `${delai}ms` }}
      onClick={() => {
        // Un maintien a déjà ajouté les boissons : le clic qui le termine ne doit pas en ajouter une de plus.
        if (aRepete.current) {
          aRepete.current = false;
          return;
        }
        ajouter();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          ajouter();
        }
      }}
      onPointerDown={(e) => {
        if (e.button === 0) demarrerMaintien();
      }}
      onPointerUp={arreter}
      onPointerLeave={arreter}
      onPointerCancel={arreter}
      onContextMenu={(e) => e.preventDefault()}
      className={`anim-monter relative flex min-h-[78px] cursor-pointer select-none flex-col justify-between gap-1.5 overflow-hidden rounded-xl border px-3.5 py-3 transition-[background-color,border-color,color,transform] duration-200 active:scale-[0.98] ${
        choisie ? "border-choix bg-choix text-sur-choix" : "border-line bg-surface text-ink"
      }`}
    >
      {choisie && (
        <span
          key={quantite}
          aria-hidden
          className="anim-halo pointer-events-none absolute inset-0 rounded-xl border-2 border-choix"
        />
      )}

      {/* Filigrane : le picto de la catégorie, comme sur la carte imprimée. Il s'efface quand le « − » prend sa place. */}
      <PictoCategorie
        categorie={produit.categorie}
        className={`pointer-events-none absolute -bottom-1 right-1 h-14 w-14 transition-opacity duration-200 ${
          choisie ? "opacity-0" : "opacity-[0.09]"
        }`}
      />

      <div className="flex items-start justify-between gap-2">
        <span className="text-[15px] font-medium leading-snug">{produit.nom}</span>
        {choisie && (
          <span
            key={quantite}
            className="anim-pop flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-or px-1.5 font-mono text-[13px] font-medium tabular-nums text-white dark:bg-sur-choix dark:text-or"
          >
            {quantite}
          </span>
        )}
      </div>

      <div className="flex items-end justify-between gap-2">
        <span className={`font-mono text-[13px] tabular-nums ${choisie ? "opacity-70" : "text-ink-faint"}`}>
          {formaterEuros(produit.prix)}
        </span>
        {choisie && (
          <button
            aria-label={`Retirer un ${produit.nom}`}
            // Le « − » ne doit ni ajouter (clic de la tuile) ni lancer un maintien.
            onPointerDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              ajouterAuPanier(produit.id, -1);
              vibrer(6);
            }}
            className="anim-apparaitre relative -my-1 -mr-1 flex h-9 w-9 items-center justify-center rounded-full bg-sur-choix/15 text-lg leading-none"
          >
            −
          </button>
        )}
      </div>

      {/* Maintien : une barre se remplit sous la tuile, puis bat pendant les ajouts répétés. */}
      {maintien !== "non" && (
        <span
          aria-hidden
          className={`pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-or ${
            maintien === "charge" ? "anim-remplir-barre" : "anim-battement"
          }`}
        />
      )}
    </div>
  );
}
