"use client";

import { createContext, useCallback, useContext, useState, ReactNode } from "react";

const CODE = "1234";
const CLE_SESSION = "caisse-code-ok";

export function estDeverrouille(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(CLE_SESSION) === "1";
  } catch {
    return false;
  }
}

function memoriser(): void {
  try {
    sessionStorage.setItem(CLE_SESSION, "1");
  } catch {
    // stockage indisponible (navigation privée…) — le code sera redemandé
  }
}

type Demande = { action: string; resoudre: (ok: boolean) => void };

const PinGateContext = createContext<((action: string) => Promise<boolean>) | null>(null);

/**
 * Fournit demanderCode() à toute l'app : une modale (pas window.prompt, non
 * supporté dans certains navigateurs embarqués) pour saisir le code à 4
 * chiffres avant une action sensible (carte, suppression, clôture).
 */
export function PinGateProvider({ children }: { children: ReactNode }) {
  const [demande, setDemande] = useState<Demande | null>(null);
  const [saisie, setSaisie] = useState("");
  const [erreur, setErreur] = useState(false);

  const demanderCode = useCallback((action: string): Promise<boolean> => {
    if (estDeverrouille()) return Promise.resolve(true);
    return new Promise<boolean>((resoudre) => {
      setSaisie("");
      setErreur(false);
      setDemande({ action, resoudre });
    });
  }, []);

  const valider = () => {
    if (!demande) return;
    if (saisie.trim() === CODE) {
      memoriser();
      demande.resoudre(true);
      setDemande(null);
    } else {
      setErreur(true);
    }
  };

  const annuler = () => {
    if (!demande) return;
    demande.resoudre(false);
    setDemande(null);
  };

  return (
    <PinGateContext.Provider value={demanderCode}>
      {children}

      {demande && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-6">
          <div className="flex w-full max-w-xs flex-col gap-4 rounded-2xl border border-line bg-surface p-5">
            <div className="flex flex-col gap-1">
              <span className="font-mono text-xs uppercase tracking-wider text-ink-faint">
                Théâtre de l&rsquo;IA
              </span>
              <h2 className="text-lg font-semibold text-ink">Code requis</h2>
              <p className="text-sm text-ink-soft">
                Entrez le code à 4 chiffres pour {demande.action}.
              </p>
            </div>

            <input
              autoFocus
              inputMode="numeric"
              maxLength={4}
              value={saisie}
              onChange={(e) => {
                setSaisie(e.target.value.replace(/\D/g, ""));
                setErreur(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") valider();
                if (e.key === "Escape") annuler();
              }}
              className="rounded-lg border border-line bg-bg px-3 py-2.5 text-center text-lg tracking-[0.5em] text-ink outline-none focus:border-ink"
            />

            {erreur && <p className="text-center text-sm text-danger">Code incorrect.</p>}

            <div className="flex gap-2">
              <button
                onClick={annuler}
                className="flex-1 rounded-full border border-line px-4 py-2.5 text-sm text-ink-soft"
              >
                Annuler
              </button>
              <button
                onClick={valider}
                className="flex-1 rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-bg"
              >
                Valider
              </button>
            </div>
          </div>
        </div>
      )}
    </PinGateContext.Provider>
  );
}

export function useDemanderCode(): (action: string) => Promise<boolean> {
  const ctx = useContext(PinGateContext);
  if (!ctx) throw new Error("useDemanderCode doit être utilisé dans PinGateProvider");
  return ctx;
}
