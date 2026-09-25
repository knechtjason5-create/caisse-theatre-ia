"use client";

import Image from "next/image";
import { useCaisse } from "@/lib/store";
import { ETATS_SYNC, useChiffresSoiree, useEtatSync } from "@/lib/etatSoiree";
import { idAppareil, initiales } from "@/lib/appareil";
import NotifVenteDistante, { useVenteDistante } from "./NotifVenteDistante";
import MontantAnime from "./MontantAnime";

/** Point de couleur de la connexion : vert synchronisé, or en cours, rouge hors ligne ou en échec. */
export function PointSync({ taille = 8 }: { taille?: number }) {
  const etat = useEtatSync();
  const { couleur } = ETATS_SYNC[etat];
  const vivant = etat === "ok" || etat === "envoi" || etat === "connexion";
  return (
    <span className="relative flex shrink-0" style={{ width: taille, height: taille }}>
      {vivant && <span aria-hidden className="anim-onde absolute inset-0 rounded-full" style={{ background: couleur }} />}
      <span className="relative rounded-full" style={{ width: taille, height: taille, background: couleur }} />
    </span>
  );
}

export default function Header({
  onMenu,
  onRepetition,
}: {
  /** Toucher la pastille : ouvre le menu de la soirée (chiffres, thème, répétition, clôture). */
  onMenu: () => void;
  /** Toucher le masque : entrer en répétition, ou en sortir. */
  onRepetition: () => void;
}) {
  const soiree = useCaisse((e) => e.soireeActive());
  const repetition = useCaisse((e) => e.repetition);
  const presents = useCaisse((e) => e.presents);
  const etat = useEtatSync();
  const { recette } = useChiffresSoiree();
  const venteDistante = useVenteDistante();
  const moi = typeof window === "undefined" ? "" : idAppareil();
  const collegues = presents.filter((p) => p.appareil !== moi);

  return (
    <>
      <header
        key={venteDistante?.id ?? "calme"}
        className={`flex items-center justify-between gap-3 border-b border-line bg-surface px-4 py-2.5 ${
          venteDistante ? "anim-pulse-entete" : ""
        }`}
      >
        <button
          onClick={onRepetition}
          aria-label={repetition ? "Terminer la répétition" : "Passer en mode répétition"}
          className="flex shrink-0 items-center gap-2.5 text-left"
        >
          <Image src="/brand/mask-black.png" alt="" width={24} height={26} className="dark:hidden" />
          <Image src="/brand/mask-white.png" alt="" width={24} height={26} className="hidden dark:block" />
          <span className="hidden font-mono text-[11px] uppercase leading-tight tracking-wider text-ink-faint min-[380px]:inline">
            Théâtre
            <br />
            de l&rsquo;IA
          </span>
        </button>

        <button
          data-visite="pastille"
          onClick={onMenu}
          aria-label={`${soiree ? soiree.nom : "Aucune soirée"} — ${ETATS_SYNC[etat].libelle}. Ouvrir le menu de la soirée`}
          className="flex min-w-0 items-center gap-2.5 rounded-full border border-line bg-bg py-1.5 pl-3 pr-1.5"
        >
          <PointSync />
          <span className="flex min-w-0 flex-col text-left leading-tight">
            <span className="truncate text-sm text-ink">{soiree ? soiree.nom : "Aucune soirée"}</span>
            <span className="truncate font-mono text-[11px] tabular-nums text-ink-faint">
              {soiree ? <MontantAnime valeur={recette} /> : "Toucher pour ouvrir"}
              {/* En répétition, le bandeau noir et or le dit déjà. */}
              {etat !== "ok" && etat !== "repetition" && ` · ${ETATS_SYNC[etat].libelle}`}
            </span>
          </span>
          {/* Collègues connectés : une initiale par appareil. */}
          {collegues.length > 0 && (
            <span className="flex shrink-0 -space-x-1.5" aria-label={`${collegues.length} autre(s) appareil(s) connecté(s)`}>
              {collegues.slice(0, 3).map((c) => (
                <span
                  key={c.appareil}
                  className="anim-apparaitre flex h-6 w-6 items-center justify-center rounded-full border-2 border-bg bg-surface-2 font-mono text-[10px] font-medium text-ink"
                >
                  {initiales(c.prenom)}
                </span>
              ))}
            </span>
          )}
          <span aria-hidden className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink-soft">
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M3 5h10M3 8h10M3 11h10" />
            </svg>
          </span>
        </button>
      </header>
      {venteDistante && <NotifVenteDistante vente={venteDistante} />}
    </>
  );
}
