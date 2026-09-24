"use client";

import { useEffect } from "react";
import Image from "next/image";

/** Durées alignées sur les animations rideau-* de globals.css. */
const DUREES = { ouvre: 1400, coups: 2800, ferme: 1050 };

export type ModeRideau = keyof typeof DUREES;

/**
 * Rideau de scène : s'ouvre (`ouvre`), s'ouvre après les trois coups au démarrage d'une soirée (`coups`),
 * retombe à la clôture (`ferme`). Couleurs fixes (bordeaux et or) quel que soit le thème.
 * `onFin` est appelé une fois le mouvement terminé. Le son des coups est joué par `lesTroisCoups()` (lib/son).
 */
export default function Rideau({
  mode,
  titre,
  onFin,
}: {
  mode: ModeRideau;
  titre: string;
  onFin: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onFin, DUREES[mode]);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  return (
    <div data-rideau={mode} aria-hidden className={mode === "ferme" ? "" : "pointer-events-none"}>
      <div className="rideau-panneau rideau-gauche" />
      <div className="rideau-panneau rideau-droite" />
      <div className="rideau-embleme flex flex-col items-center gap-3 text-center">
        <Image src="/brand/mask-white.png" alt="" width={44} height={48} className="rideau-masque" />
        <span className="font-mono text-xs uppercase tracking-[0.3em]" style={{ color: "#d9b56a" }}>
          {titre}
        </span>
        {mode === "coups" && (
          <span className="flex gap-2.5">
            <span className="rideau-point" />
            <span className="rideau-point" />
            <span className="rideau-point" />
          </span>
        )}
      </div>
    </div>
  );
}
