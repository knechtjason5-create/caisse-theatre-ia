"use client";

export type Onglet = "vente" | "carte" | "historique";

const ONGLETS: { id: Onglet; label: string }[] = [
  { id: "vente", label: "Vente" },
  { id: "carte", label: "Carte" },
  { id: "historique", label: "Historique" },
];

export default function Nav({
  actif,
  onChange,
}: {
  actif: Onglet;
  onChange: (o: Onglet) => void;
}) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]">
      <div className="relative flex">
        {ONGLETS.map((o) => (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            className={`flex-1 pb-4 pt-3 text-center text-sm transition-colors ${
              actif === o.id ? "font-medium text-ink" : "text-ink-faint"
            }`}
          >
            {o.label}
          </button>
        ))}
        {/* Indicateur qui glisse d'un onglet à l'autre. */}
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-2.5 flex justify-center transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
          style={{
            width: `${100 / ONGLETS.length}%`,
            transform: `translateX(${ONGLETS.findIndex((o) => o.id === actif) * 100}%)`,
          }}
        >
          <span className="block h-0.5 w-6 rounded-full bg-ink" />
        </span>
      </div>
    </nav>
  );
}
