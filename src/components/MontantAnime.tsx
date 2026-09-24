"use client";

import { useEffect, useRef, useState } from "react";
import { formaterEuros } from "@/lib/format";

/**
 * Fait défiler un nombre vers sa nouvelle valeur. Sans `depuis`, aucune animation au premier
 * affichage : seulement quand la valeur change. Avec `depuis`, le nombre part de cette valeur dès l'affichage.
 */
function useCompteur(cible: number, duree: number, depuis?: number): number {
  const [valeur, setValeur] = useState(depuis ?? cible);
  const courante = useRef(depuis ?? cible);

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
    // Secours : si l'onglet est en arrière-plan, requestAnimationFrame ne tourne pas — on affiche la valeur finale.
    const secours = setTimeout(() => {
      cancelAnimationFrame(raf);
      courante.current = cible;
      setValeur(cible);
    }, duree + 150);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(secours);
    };
  }, [cible, duree]);

  return valeur;
}

export default function MontantAnime({
  valeur,
  depuis,
  duree = 450,
}: {
  valeur: number;
  depuis?: number;
  duree?: number;
}) {
  return <>{formaterEuros(useCompteur(valeur, duree, depuis))}</>;
}
