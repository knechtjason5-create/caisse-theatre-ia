"use client";

import { useEffect, useRef, useState } from "react";
import { vibrer } from "@/lib/haptique";

/**
 * Bouton d'une action lourde (clôturer la soirée) : il faut le maintenir `duree` ms.
 * Pendant l'appui, le rideau de scène descend dans le bouton ; lâcher avant la fin annule.
 * Même langage que « maintenir + » sur les tuiles, et plus sûr qu'un lien qu'on touche par erreur.
 */
export default function BoutonMaintenir({
  libelle,
  indication = "Maintenez…",
  duree = 1500,
  onFin,
}: {
  libelle: string;
  indication?: string;
  duree?: number;
  onFin: () => void;
}) {
  const [appui, setAppui] = useState(false);
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lacher = () => {
    if (minuteur.current) clearTimeout(minuteur.current);
    minuteur.current = null;
    setAppui(false);
  };

  const presser = () => {
    if (minuteur.current) return;
    setAppui(true);
    vibrer(6);
    minuteur.current = setTimeout(() => {
      minuteur.current = null;
      setAppui(false);
      vibrer([20, 40, 30]);
      onFin();
    }, duree);
  };

  useEffect(
    () => () => {
      if (minuteur.current) clearTimeout(minuteur.current);
    },
    []
  );

  return (
    <button
      type="button"
      onPointerDown={(e) => {
        if (e.button === 0) presser();
      }}
      onPointerUp={lacher}
      onPointerLeave={lacher}
      onPointerCancel={lacher}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !e.repeat) {
          e.preventDefault();
          presser();
        }
      }}
      onKeyUp={(e) => {
        if (e.key === "Enter" || e.key === " ") lacher();
      }}
      onContextMenu={(e) => e.preventDefault()}
      aria-label={`${libelle} (maintenir appuyé)`}
      className="relative w-full select-none overflow-hidden rounded-full border border-[#b8923f] px-5 py-3.5 text-sm font-medium text-ink"
      style={{ touchAction: "none" }}
    >
      {/* Le rideau descend du haut du bouton pendant l'appui, remonte si on lâche. */}
      <span
        aria-hidden
        className="bouton-rideau absolute inset-0 origin-top"
        style={{
          transform: `scaleY(${appui ? 1 : 0})`,
          transition: appui ? `transform ${duree}ms linear` : "transform 200ms var(--ease-out)",
        }}
      />
      <span className={`relative transition-colors ${appui ? "text-[#f1e2bf]" : ""}`}>
        {appui ? indication : libelle}
      </span>
    </button>
  );
}
