"use client";

/**
 * Bandeau permanent du mode répétition, façon marquage de plateau (noir et or quel que soit le thème) :
 * impossible d'oublier que rien n'est enregistré.
 */
export default function BandeauRepetition({ onTerminer }: { onTerminer: () => void }) {
  return (
    <div role="status" className="bande-repetition anim-deplier">
      <div className="flex items-center justify-between gap-3 px-4 py-2">
        <div className="flex flex-col leading-tight">
          <span className="font-mono text-[11px] uppercase tracking-[0.25em]">Répétition</span>
          <span className="text-xs opacity-80">Entraînement : rien n&rsquo;est enregistré.</span>
        </div>
        <button onClick={onTerminer} className="rounded-full border px-3.5 py-1.5 text-xs font-medium">
          Terminer
        </button>
      </div>
    </div>
  );
}
