"use client";

import { useState } from "react";
import { useCaisse } from "@/lib/store";

function nomParDefaut(): string {
  const auj = new Date();
  return `Soirée du ${auj.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
  })}`;
}

export default function OuvrirSoireeModal({
  onOuverte,
  onAnnuler,
}: {
  onOuverte: (nom: string) => void;
  onAnnuler: () => void;
}) {
  const ouvrirSoiree = useCaisse((e) => e.ouvrirSoiree);
  const [nom, setNom] = useState(nomParDefaut());

  const demarrer = () => {
    const nomFinal = nom.trim() || nomParDefaut();
    ouvrirSoiree(nomFinal);
    onOuverte(nomFinal);
  };

  return (
    <div className="anim-feuille fixed inset-0 z-50 flex flex-col bg-bg">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 overflow-y-auto px-5 py-8">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <span className="font-mono text-xs uppercase tracking-wider text-ink-faint">
              Théâtre de l&rsquo;IA
            </span>
            <h1 className="text-2xl font-semibold text-ink">Ouvrir une soirée</h1>
            <p className="text-sm text-ink-soft">
              Donnez un nom à la soirée pour regrouper les ventes et retrouver
              les chiffres ensuite dans l&rsquo;historique.
            </p>
          </div>
          <button
            onClick={onAnnuler}
            aria-label="Annuler"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-lg text-ink"
          >
            ×
          </button>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-xs uppercase tracking-wider text-ink-faint">
            Nom de la soirée
          </span>
          <input
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            className="rounded-lg border border-line bg-surface px-3 py-2.5 text-base text-ink outline-none focus:border-ink"
          />
        </label>
      </div>

      <div className="border-t border-line bg-surface px-5 py-4">
        <button
          onClick={demarrer}
          className="mx-auto block w-full max-w-md rounded-full bg-ink px-6 py-3.5 text-center text-base font-medium text-bg active:opacity-80"
        >
          Démarrer la soirée
        </button>
      </div>
    </div>
  );
}
