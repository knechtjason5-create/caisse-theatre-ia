"use client";

import { useEffect } from "react";
import Image from "next/image";

/** Durées alignées sur les animations rideau-* de globals.css. */
const DUREE_OUVERTURE = 1400;
const DUREE_FERMETURE = 1050;

/**
 * Rideau de scène : s'ouvre au démarrage d'une soirée, retombe à la clôture.
 * Couleurs fixes (bordeaux et or) quel que soit le thème. `onFin` est appelé une fois le mouvement terminé.
 */
export default function Rideau({
  mode,
  titre,
  onFin,
}: {
  mode: "ouvre" | "ferme";
  titre: string;
  onFin: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onFin, mode === "ouvre" ? DUREE_OUVERTURE : DUREE_FERMETURE);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  return (
    <div data-rideau={mode} aria-hidden className={mode === "ouvre" ? "pointer-events-none" : ""}>
      <div className="rideau-panneau rideau-gauche" />
      <div className="rideau-panneau rideau-droite" />
      <div className="rideau-embleme flex flex-col items-center gap-3 text-center">
        <Image src="/brand/mask-white.png" alt="" width={44} height={48} />
        <span className="font-mono text-xs uppercase tracking-[0.3em]" style={{ color: "#d9b56a" }}>
          {titre}
        </span>
      </div>
    </div>
  );
}
