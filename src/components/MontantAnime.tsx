"use client";

import { useEffect, useRef, useState } from "react";
import { formaterEuros } from "@/lib/format";

/** Fait défiler un nombre vers sa nouvelle valeur. Aucune animation au premier affichage : seulement quand la valeur change. */
function useCompteur(cible: number, duree = 450): number {
  const [valeur, setValeur] = useState(cible);
  const courante = useRef(cible);

  useEffect(() => {
    const debut = courante.current;
    if (debut === cible) return;
    const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = reduit ? 1 : Math.min(1, (t - t0) / duree);
      const eased = 1 - Math.pow(1 - p, 3);
      courante.current = p === 1 ? cible : debut + (cible - debut) * eased;
      setValeur(courante.current);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [cible, duree]);

  return valeur;
}

export default function MontantAnime({ valeur }: { valeur: number }) {
  return <>{formaterEuros(useCompteur(valeur))}</>;
}
