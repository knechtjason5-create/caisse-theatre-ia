"use client";

import { createContext, useCallback, useContext, useState, ReactNode } from "react";
import Image from "next/image";
import { deverrouiller } from "./supabase";
import { vibrer } from "./haptique";

let deverrouilleCetteSession = false;
const DUREE_OUVERTURE = 650; // = animation « pivoter » de globals.css
type Demande = { action: string; resoudre: (ok: boolean) => void };

const PinGateContext = createContext<((action: string) => Promise<boolean>) | null>(null);

/**
 * Fournit demanderCode() à toute l'app : une modale (pas window.prompt, non
 * supporté dans certains navigateurs embarqués) pour saisir le code à 4
 * chiffres avant une action sensible. Le code est vérifié côté serveur
 * (fonction Supabase deverrouiller) : la base elle-même refuse toute lecture
 * ou écriture sans ce code (RLS, voir supabase/schema.sql), pas seulement l'interface.
 */
export function PinGateProvider({ children }: { children: ReactNode }) {
  const [demande, setDemande] = useState<Demande | null>(null);
  const [saisie, setSaisie] = useState("");
  const [erreur, setErreur] = useState(false);
  const [echecs, setEchecs] = useState(0);
  const [verification, setVerification] = useState(false);

  const demanderCode = useCallback((action: string): Promise<boolean> => {
    if (deverrouilleCetteSession) return Promise.resolve(true);
    return new Promise<boolean>((resoudre) => {
      setSaisie("");
      setErreur(false);
      setEchecs(0);
      setDemande({ action, resoudre });
    });
  }, []);

  const [ouvert, setOuvert] = useState(false);

  const valider = async (code = saisie) => {
    if (!demande || verification || ouvert) return;
    setVerification(true);
    const ok = await deverrouiller(code.trim());
    setVerification(false);
    if (ok) {
      // Le cadenas s'ouvre et le masque pivote avant que la fenêtre disparaisse.
      deverrouilleCetteSession = true;
      setOuvert(true);
      vibrer(10);
      setTimeout(() => {
        demande.resoudre(true);
        setDemande(null);
        setOuvert(false);
      }, DUREE_OUVERTURE);
    } else {
      setErreur(true);
      setEchecs((n) => n + 1);
      setSaisie("");
      vibrer([30, 40, 30]);
    }
  };

  const saisir = (valeur: string) => {
    const chiffres = valeur.replace(/\D/g, "").slice(0, 4);
    setSaisie(chiffres);
    setErreur(false);
    if (chiffres.length === 4) valider(chiffres);
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
        <div className="anim-fondu fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-6">
          <div
            key={echecs}
            className={`${echecs > 0 ? "anim-secouer" : "anim-apparaitre"} flex w-full max-w-xs flex-col gap-4 rounded-2xl border border-line bg-surface p-5`}
          >
            {/* Logo du théâtre à gauche, cadenas à droite : ils s'animent ensemble à la validation. */}
            <div className="flex items-center justify-between">
              <div className={ouvert ? "anim-pivoter" : ""}>
                <Image src="/brand/mask-black.png" alt="" width={28} height={30} className="dark:hidden" style={{ height: "auto" }} />
                <Image src="/brand/mask-white.png" alt="" width={28} height={30} className="hidden dark:block" style={{ height: "auto" }} />
              </div>
              <svg
                aria-hidden
                viewBox="0 0 16 18"
                className="h-[22px] w-5 text-ink"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
              >
                <path className={ouvert ? "anim-cadenas-anse" : ""} d="M4.5 8V5.5a3.5 3.5 0 0 1 7 0V8" />
                <rect x="2" y="8" width="12" height="9" rx="2" fill="var(--surface)" />
              </svg>
            </div>

            <div className="flex flex-col gap-1">
              <span className="font-mono text-xs uppercase tracking-wider text-ink-faint">
                Théâtre de l&rsquo;IA
              </span>
              <h2 className="text-lg font-semibold text-ink">Code requis</h2>
              <p className="text-sm text-ink-soft">
                Entrez le code à 4 chiffres pour {demande.action}.
              </p>
            </div>

            {/* Le champ reste la vraie zone de saisie (clavier numérique, collage) ; les pastilles le recouvrent. */}
            <label className="relative flex cursor-text justify-center gap-3 py-2">
              <input
                autoFocus
                inputMode="numeric"
                autoComplete="one-time-code"
                aria-label="Code à 4 chiffres"
                maxLength={4}
                value={saisie}
                disabled={verification || ouvert}
                onChange={(e) => saisir(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") valider();
                  if (e.key === "Escape") annuler();
                }}
                className="absolute inset-0 h-full w-full opacity-0"
              />
              {[0, 1, 2, 3].map((i) => {
                const rempli = i < saisie.length || ouvert;
                return (
                  <span
                    key={i}
                    aria-hidden
                    className={`h-3.5 w-3.5 rounded-full border-2 transition-colors duration-150 ${
                      erreur ? "border-danger" : "border-ink"
                    } ${rempli ? "anim-pop bg-ink" : "bg-transparent"} ${
                      i === saisie.length && !verification && !ouvert ? "animate-pulse" : ""
                    }`}
                  />
                );
              })}
            </label>

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
                onClick={() => valider()}
                disabled={verification || ouvert}
                className="flex-1 rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-bg disabled:opacity-50"
              >
                {ouvert ? "Bienvenue" : verification ? "Vérification…" : "Valider"}
              </button>
            </div>
          </div>
        </div>
      )}
    </PinGateContext.Provider>
  );
}

/** À appeler au chargement : une session déjà autorisée par la base n'a pas à ressaisir le code. */
export function marquerDeverrouille(): void {
  deverrouilleCetteSession = true;
}

export function useDemanderCode(): (action: string) => Promise<boolean> {
  const ctx = useContext(PinGateContext);
  if (!ctx) throw new Error("useDemanderCode doit être utilisé dans PinGateProvider");
  return ctx;
}
