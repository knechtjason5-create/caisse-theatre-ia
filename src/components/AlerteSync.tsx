"use client";

import { useCaisse } from "@/lib/store";

/** Bandeau d'erreur de synchronisation : reste affiché jusqu'à ce qu'on le ferme. */
export default function AlerteSync() {
  const message = useCaisse((e) => e.alerteSync);
  const fermer = useCaisse((e) => e.fermerAlerteSync);
  if (!message) return null;

  return (
    <div
      key={message}
      role="alert"
      className="anim-monter fixed inset-x-4 top-3 z-[60] mx-auto flex max-w-md items-start gap-3 rounded-xl border border-danger bg-surface px-4 py-3 shadow-lg"
    >
      <div className="flex flex-1 flex-col gap-0.5">
        <p className="text-sm font-medium text-danger">{message}</p>
        <p className="text-xs text-ink-soft">Vérifiez la connexion internet, puis refaites l&rsquo;opération.</p>
      </div>
      <button
        onClick={fermer}
        aria-label="Fermer"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-2 text-base text-ink"
      >
        ×
      </button>
    </div>
  );
}
