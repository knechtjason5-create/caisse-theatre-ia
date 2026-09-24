"use client";

import { CSSProperties, useEffect, useRef, useState } from "react";
import { useCaisse } from "@/lib/store";
import { formaterEuros } from "@/lib/format";
import { vibrer } from "@/lib/haptique";

const SEUILS = [100, 250, 500];
const DUREE = 2600; // = animation « jalon » de globals.css

const ETINCELLES = Array.from({ length: 10 }, (_, i) => {
  const angle = (i / 10) * Math.PI * 2;
  return { "--x": `${Math.cos(angle) * 70}px`, "--y": `${Math.sin(angle) * 40}px` } as CSSProperties;
});

/** Petite célébration quand la recette de la soirée en cours franchit 100, 250 ou 500 €. */
export default function JalonRecette() {
  const soiree = useCaisse((e) => e.soireeActive());
  const recette = useCaisse((e) => {
    const s = e.soireeActive();
    return s ? e.ventes.filter((v) => v.soireeId === s.id).reduce((t, v) => t + v.montantTotal, 0) : 0;
  });
  const [jalon, setJalon] = useState<number | null>(null);
  const precedente = useRef<{ soireeId: string | null; recette: number }>({ soireeId: null, recette: 0 });

  useEffect(() => {
    const id = soiree?.id ?? null;
    const avant = precedente.current;
    precedente.current = { soireeId: id, recette };
    // Nouvelle soirée (ou premier chargement) : on prend la recette actuelle comme point de départ.
    if (id === null || avant.soireeId !== id) return;
    const franchi = SEUILS.filter((s) => avant.recette < s && recette >= s).pop();
    if (franchi === undefined) return;
    setJalon(franchi);
    vibrer([12, 50, 12, 50, 24]);
  }, [soiree?.id, recette]);

  useEffect(() => {
    if (jalon === null) return;
    const t = setTimeout(() => setJalon(null), DUREE);
    return () => clearTimeout(t);
  }, [jalon]);

  if (jalon === null) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-32 z-[65] flex justify-center">
      <div key={jalon} className="anim-jalon relative">
        {ETINCELLES.map((style, i) => (
          <span
            key={i}
            aria-hidden
            className="anim-etincelle absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full"
            style={{ ...style, background: i % 2 ? "#b8923f" : "var(--ink)" }}
          />
        ))}
        <div role="status" className="relative rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-bg shadow-lg">
          {formaterEuros(jalon)} de recette ce soir !
        </div>
      </div>
    </div>
  );
}
