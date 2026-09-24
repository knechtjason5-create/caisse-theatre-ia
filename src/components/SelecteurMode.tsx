"use client";

import { ModePaiement } from "@/lib/types";

const MODES: ModePaiement[] = ["Espèces", "CB"];

/** Choix Espèces / CB : une pastille glisse sous l'option retenue. */
export default function SelecteurMode({
  valeur,
  onChange,
}: {
  valeur: ModePaiement;
  onChange: (mode: ModePaiement) => void;
}) {
  const index = MODES.indexOf(valeur);
  return (
    <div className="relative grid grid-cols-2 rounded-full bg-surface-2 p-1">
      <span
        aria-hidden
        className="pastille-glissante absolute inset-y-1 left-1 rounded-full bg-ink"
        style={{ width: "calc(50% - 4px)", transform: `translateX(${index * 100}%)` }}
      />
      {MODES.map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          aria-pressed={m === valeur}
          className={`relative w-16 rounded-full py-1.5 text-center text-xs font-medium transition-colors duration-200 ${
            m === valeur ? "text-bg" : "text-ink-soft"
          }`}
        >
          {m}
        </button>
      ))}
    </div>
  );
}
