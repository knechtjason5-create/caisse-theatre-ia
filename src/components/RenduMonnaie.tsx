"use client";

import { useState } from "react";
import { formaterEuros } from "@/lib/format";

/** Billets et pièces en euros, en centimes, du plus grand au plus petit. */
const COUPURES = [5000, 2000, 1000, 500, 200, 100, 50, 20, 10, 5, 2, 1];
const PLUS_PETIT_BILLET = 500;

/** Sommes que le client a le plus de chances de tendre : l'euro rond supérieur, puis les billets au-dessus. */
function sommesProbables(montantCents: number): number[] {
  const candidats = [
    Math.ceil(montantCents / 100) * 100,
    Math.ceil(montantCents / 500) * 500,
    Math.ceil(montantCents / 1000) * 1000,
    2000,
    5000,
  ];
  return [...new Set(candidats)].filter((c) => c > montantCents).sort((a, b) => a - b).slice(0, 4);
}

/** Monnaie à rendre, décomposée en un minimum de billets et de pièces. */
function decomposer(cents: number): { coupure: number; nombre: number }[] {
  const resultat: { coupure: number; nombre: number }[] = [];
  let reste = cents;
  for (const coupure of COUPURES) {
    const nombre = Math.floor(reste / coupure);
    if (nombre > 0) {
      resultat.push({ coupure, nombre });
      reste -= nombre * coupure;
    }
  }
  return resultat;
}

function libelleCoupure(cents: number): string {
  return cents >= 100 ? `${cents / 100} €` : `${cents} c`;
}

/**
 * Sous une personne qui paie en espèces : toucher la somme tendue affiche la monnaie à rendre,
 * billets (rectangles) et pièces (ronds) compris. Purement indicatif, rien n'est enregistré.
 */
export default function RenduMonnaie({ montant }: { montant: number }) {
  const montantCents = Math.round(montant * 100);
  const [recu, setRecu] = useState<number | null>(null);
  const [montantConnu, setMontantConnu] = useState(montantCents);

  // Le montant de la personne change : la somme tendue choisie n'a plus de sens.
  if (montantCents !== montantConnu) {
    setMontantConnu(montantCents);
    setRecu(null);
  }

  const sommes = sommesProbables(montantCents);
  if (montantCents <= 0 || sommes.length === 0) return null;
  const aRendre = recu !== null ? recu - montantCents : null;

  return (
    <div className="flex flex-col gap-2 border-t border-dashed border-line pt-2.5">
      <div className="flex items-center gap-1.5">
        <span className="mr-auto font-mono text-[11px] uppercase tracking-wider text-ink-faint">Reçu</span>
        {sommes.map((s) => (
          <button
            key={s}
            onClick={() => setRecu(recu === s ? null : s)}
            aria-pressed={recu === s}
            className={`rounded-full px-2.5 py-1 font-mono text-xs tabular-nums ${
              recu === s ? "bg-ink text-bg" : "bg-surface-2 text-ink"
            }`}
          >
            {s / 100} €
          </button>
        ))}
      </div>

      {aRendre !== null && (
        <div key={recu} className="anim-deplier flex flex-col gap-1.5 rounded-lg bg-bg px-3 py-2.5">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-ink-soft">À rendre</span>
            <span className="text-xl font-semibold tabular-nums text-ink">{formaterEuros(aRendre / 100)}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {decomposer(aRendre).map(({ coupure, nombre }, i) => (
              <span
                key={coupure}
                style={{ animationDelay: `${i * 40}ms` }}
                className="anim-apparaitre flex items-center gap-1 font-mono text-xs tabular-nums text-ink-soft"
              >
                {nombre > 1 && <span>{nombre}×</span>}
                <span
                  className={
                    coupure >= PLUS_PETIT_BILLET
                      ? "rounded-[3px] border border-ink/40 bg-surface px-1.5 py-0.5 text-ink"
                      : "flex h-7 min-w-7 items-center justify-center rounded-full border border-ink/40 bg-surface-2 px-1 text-[10px] text-ink"
                  }
                >
                  {libelleCoupure(coupure)}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
