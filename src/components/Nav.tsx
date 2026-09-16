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
    <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]">
      {ONGLETS.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={`flex-1 py-3 text-center text-sm transition-colors ${
            actif === o.id ? "font-medium text-ink" : "text-ink-faint"
          }`}
        >
          {o.label}
          {actif === o.id && (
            <span className="mx-auto mt-1 block h-0.5 w-6 rounded-full bg-ink" />
          )}
        </button>
      ))}
    </nav>
  );
}
