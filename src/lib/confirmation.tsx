"use client";

import { createContext, useCallback, useContext, useState, ReactNode } from "react";

type Options = { titre: string; message?: string; libelle?: string; danger?: boolean };
type Demande = Options & { resoudre: (ok: boolean) => void };

const ConfirmationContext = createContext<((options: Options) => Promise<boolean>) | null>(null);

/**
 * Fournit confirmer() à toute l'app : une fenêtre de confirmation interne, à la place de
 * window.confirm() que certains navigateurs embarqués bloquent (il y renvoie toujours « non »).
 */
export function ConfirmationProvider({ children }: { children: ReactNode }) {
  const [demande, setDemande] = useState<Demande | null>(null);

  const confirmer = useCallback(
    (options: Options) => new Promise<boolean>((resoudre) => setDemande({ ...options, resoudre })),
    []
  );

  const repondre = (ok: boolean) => {
    demande?.resoudre(ok);
    setDemande(null);
  };

  return (
    <ConfirmationContext.Provider value={confirmer}>
      {children}

      {demande && (
        <div
          data-no-swipe
          role="alertdialog"
          aria-modal
          aria-labelledby="confirmation-titre"
          onClick={(e) => e.target === e.currentTarget && repondre(false)}
          onKeyDown={(e) => e.key === "Escape" && repondre(false)}
          className="anim-fondu fixed inset-0 z-[80] flex items-center justify-center bg-black/60 px-6"
        >
          <div className="anim-apparaitre flex w-full max-w-xs flex-col gap-4 rounded-2xl border border-line bg-surface p-5">
            <div className="flex flex-col gap-1">
              <h2 id="confirmation-titre" className="text-lg font-semibold text-ink">
                {demande.titre}
              </h2>
              {demande.message && <p className="text-sm text-ink-soft">{demande.message}</p>}
            </div>
            <div className="flex gap-2">
              <button
                autoFocus
                onClick={() => repondre(false)}
                className="flex-1 rounded-full border border-line px-4 py-2.5 text-sm text-ink-soft"
              >
                Annuler
              </button>
              <button
                onClick={() => repondre(true)}
                className={`flex-1 rounded-full px-4 py-2.5 text-sm font-medium ${
                  demande.danger ? "bg-danger text-bg" : "bg-ink text-bg"
                }`}
              >
                {demande.libelle ?? "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmationContext.Provider>
  );
}

export function useConfirmer(): (options: Options) => Promise<boolean> {
  const ctx = useContext(ConfirmationContext);
  if (!ctx) throw new Error("useConfirmer doit être utilisé dans ConfirmationProvider");
  return ctx;
}
