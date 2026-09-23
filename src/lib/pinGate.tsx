"use client";

import { createContext, useCallback, useContext, useState, ReactNode } from "react";
import { supabase, configurerCodeAcces, recupererCodeSession } from "./supabase";

export function estDeverrouille(): boolean {
  return !!recupererCodeSession();
}

type Demande = { action: string; resoudre: (ok: boolean) => void };

const PinGateContext = createContext<((action: string) => Promise<boolean>) | null>(null);

/**
 * Fournit demanderCode() à toute l'app : une modale (pas window.prompt, non
 * supporté dans certains navigateurs embarqués) pour saisir le code à 4
 * chiffres avant une action sensible. Le code est vérifié côté serveur
 * (fonction Supabase verifier_code_acces) : la base elle-même refuse toute
 * écriture sans ce code (RLS, voir supabase/schema.sql), pas seulement l'interface.
 */
export function PinGateProvider({ children }: { children: ReactNode }) {
  const [demande, setDemande] = useState<Demande | null>(null);
  const [saisie, setSaisie] = useState("");
  const [erreur, setErreur] = useState(false);
  const [verification, setVerification] = useState(false);

  const demanderCode = useCallback((action: string): Promise<boolean> => {
    if (estDeverrouille()) return Promise.resolve(true);
    return new Promise<boolean>((resoudre) => {
      setSaisie("");
      setErreur(false);
      setDemande({ action, resoudre });
    });
  }, []);

  const valider = async () => {
    if (!demande || verification) return;
    const code = saisie.trim();
    if (!supabase) {
      setErreur(true);
      return;
    }
    setVerification(true);
    const { data, error } = await supabase.rpc("verifier_code_acces", { code_saisi: code });
    setVerification(false);
    if (!error && data === true) {
      configurerCodeAcces(code);
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
              disabled={verification}
              onChange={(e) => {
                setSaisie(e.target.value.replace(/\D/g, ""));
                setErreur(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") valider();
                if (e.key === "Escape") annuler();
              }}
              className="rounded-lg border border-line bg-bg px-3 py-2.5 text-center text-lg tracking-[0.5em] text-ink outline-none focus:border-ink disabled:opacity-50"
            />

            {erreur && <p className="text-center text-sm text-danger">Code incorrect.</p>}

            <div className="flex gap-2">
              <button
                onClick={annuler}
                disabled={verification}
                className="flex-1 rounded-full border border-line px-4 py-2.5 text-sm text-ink-soft disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={valider}
                disabled={verification}
                className="flex-1 rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-bg disabled:opacity-50"
              >
                {verification ? "Vérification…" : "Valider"}
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
