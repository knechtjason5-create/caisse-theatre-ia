"use client";

import { useEffect, useRef, useState } from "react";
import { estVenteLocale, useCaisse } from "@/lib/store";
import { formaterEuros } from "@/lib/format";
import { Vente } from "@/lib/types";

const DUREE = 2800; // = animation « descendre » de globals.css

/**
 * Repère les ventes arrivées d'un autre appareil (synchronisation temps réel) depuis l'ouverture de l'app.
 * Les ventes présentes au chargement et celles faites ici sont ignorées.
 */
export function useVenteDistante(): Vente | null {
  const ventes = useCaisse((e) => e.ventes);
  const connues = useRef<Set<string> | null>(null);
  const [derniere, setDerniere] = useState<Vente | null>(null);

  useEffect(() => {
    if (connues.current === null) {
      connues.current = new Set(ventes.map((v) => v.id));
      return;
    }
    const nouvelles = ventes.filter((v) => !connues.current!.has(v.id));
    nouvelles.forEach((v) => connues.current!.add(v.id));
    const distante = nouvelles.filter((v) => !estVenteLocale(v.id)).pop();
    if (distante) setDerniere(distante);
  }, [ventes]);

  useEffect(() => {
    if (!derniere) return;
    const t = setTimeout(() => setDerniere(null), DUREE);
    return () => clearTimeout(t);
  }, [derniere]);

  return derniere;
}

export default function NotifVenteDistante({ vente }: { vente: Vente }) {
  return (
    <div
      key={vente.id}
      role="status"
      className="anim-descendre pointer-events-none fixed left-1/2 top-16 z-40 whitespace-nowrap rounded-full border border-line bg-surface px-4 py-2 text-xs text-ink shadow-md"
    >
      Vente sur un autre appareil ·{" "}
      <span className="font-mono tabular-nums">{formaterEuros(vente.montantTotal)}</span>
    </div>
  );
}
