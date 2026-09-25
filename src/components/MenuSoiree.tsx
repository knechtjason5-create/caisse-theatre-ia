"use client";

import { useCaisse } from "@/lib/store";
import { formaterEuros, formaterHeure, pluriel } from "@/lib/format";
import { ETATS_SYNC, useChiffresSoiree, useEtatSync } from "@/lib/etatSoiree";
import { ChoixTheme, useTheme } from "@/lib/theme";
import { idAppareil, initiales, usePrenom } from "@/lib/appareil";
import BoutonMaintenir from "./BoutonMaintenir";
import { PointSync } from "./Header";
import { Circuit } from "./Picto";

const THEMES: { id: ChoixTheme; libelle: string }[] = [
  { id: "auto", libelle: "Auto (le soir)" },
  { id: "clair", libelle: "Clair" },
  { id: "noire", libelle: "Salle noire" },
];

/**
 * Menu de la soirée, ouvert depuis la pastille de l'en-tête : chiffres en direct, connexion et collègues,
 * thème, répétition, et la clôture, qu'il faut maintenir pour éviter une fausse manœuvre.
 */
export default function MenuSoiree({
  onFermer,
  onOuvrirSoiree,
  onCloturer,
  onRepetition,
  onVisite,
}: {
  onFermer: () => void;
  onOuvrirSoiree: () => void;
  onCloturer: () => void;
  onRepetition: () => void;
  onVisite: () => void;
}) {
  const soiree = useCaisse((e) => e.soireeActive());
  const repetition = useCaisse((e) => e.repetition);
  const presents = useCaisse((e) => e.presents);
  const nbArticles = useCaisse((e) => e.panier.reduce((n, a) => n + a.quantite, 0));
  const chiffres = useChiffresSoiree();
  const etat = useEtatSync();
  const { choix, changer } = useTheme();
  const prenom = usePrenom((e) => e.prenom);
  const changerPrenom = usePrenom((e) => e.changer);
  const moi = idAppareil();
  const collegues = presents.filter((p) => p.appareil !== moi);
  const partEspeces = chiffres.recette > 0 ? chiffres.especes / (chiffres.especes + chiffres.cb || 1) : 0;

  return (
    <div
      data-no-swipe
      role="dialog"
      aria-modal
      aria-label="Menu de la soirée"
      onClick={(e) => e.target === e.currentTarget && onFermer()}
      onKeyDown={(e) => e.key === "Escape" && onFermer()}
      className="anim-fondu fixed inset-0 z-[60] flex items-end justify-center bg-black/50"
    >
      <div className="anim-feuille relative flex max-h-[92vh] w-full max-w-md flex-col gap-5 overflow-y-auto rounded-t-3xl border border-line bg-surface px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-5">
        <Circuit className="pointer-events-none absolute left-3 top-3 h-8 w-8 text-or opacity-60" />
        <Circuit coin="bas-droite" className="pointer-events-none absolute bottom-3 right-3 h-8 w-8 text-or opacity-60" />

        <div className="flex items-start justify-between gap-3 pl-8">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="font-mono text-[11px] uppercase tracking-wider text-ink-faint">
              {soiree ? `Ouverte à ${formaterHeure(soiree.ouverteLe)}` : "Aucune soirée en cours"}
            </span>
            <h2 className="truncate text-xl font-semibold text-ink">{soiree ? soiree.nom : "Théâtre de l’IA"}</h2>
          </div>
          <button
            autoFocus
            onClick={onFermer}
            aria-label="Fermer le menu"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-lg text-ink"
          >
            ×
          </button>
        </div>

        {soiree ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-line bg-bg px-4 py-3.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-3xl font-semibold tabular-nums text-ink">{formaterEuros(chiffres.recette)}</span>
              <span className="text-sm text-ink-soft">{pluriel(chiffres.nombreVentes, "vente")}</span>
            </div>
            {chiffres.recette > 0 && (
              <div className="flex flex-col gap-1.5">
                <div className="flex h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div className="anim-barre h-full bg-or" style={{ width: `${partEspeces * 100}%` }} />
                </div>
                <div className="flex justify-between font-mono text-[11px] tabular-nums text-ink-faint">
                  <span>Espèces {formaterEuros(chiffres.especes)}</span>
                  <span>CB {formaterEuros(chiffres.cb)}</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={onOuvrirSoiree}
            className="w-full rounded-full bg-ink px-6 py-3.5 text-base font-medium text-bg"
          >
            Ouvrir une soirée
          </button>
        )}

        {/* Connexion et collègues */}
        <section className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2.5">
            <PointSync taille={10} />
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-medium text-ink">{ETATS_SYNC[etat].libelle}</span>
              <span className="text-xs text-ink-soft">{ETATS_SYNC[etat].detail}</span>
            </div>
          </div>
          {!repetition && (
            <p className="text-xs text-ink-soft">
              {collegues.length === 0
                ? "Aucun autre appareil connecté."
                : `Aussi connecté${collegues.length > 1 ? "s" : ""} : ${collegues
                    .map((c) => c.prenom || "appareil sans prénom")
                    .join(", ")}.`}
            </p>
          )}
          <label className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2 font-mono text-xs font-medium text-ink">
              {initiales(prenom)}
            </span>
            <input
              value={prenom}
              onChange={(e) => changerPrenom(e.target.value)}
              placeholder="Votre prénom sur cet appareil"
              aria-label="Votre prénom sur cet appareil"
              maxLength={20}
              className="min-w-0 flex-1 rounded-md border border-line bg-bg px-2.5 py-2 text-sm text-ink outline-none focus:border-ink"
            />
          </label>
        </section>

        {/* Thème */}
        <section className="flex flex-col gap-2">
          <span className="font-mono text-[11px] uppercase tracking-wider text-ink-faint">Affichage</span>
          <div className="grid grid-cols-3 gap-1 rounded-full bg-surface-2 p-1" role="radiogroup" aria-label="Thème">
            {THEMES.map((t) => (
              <button
                key={t.id}
                role="radio"
                aria-checked={choix === t.id}
                onClick={() => changer(t.id)}
                className={`rounded-full px-2 py-2 text-xs font-medium ${
                  choix === t.id ? "bg-ink text-bg" : "text-ink-soft"
                }`}
              >
                {t.libelle}
              </button>
            ))}
          </div>
        </section>

        {/* Répétition et visite */}
        <section className="flex gap-2">
          <button
            onClick={onRepetition}
            className="flex-1 rounded-full border border-line px-4 py-2.5 text-sm text-ink"
          >
            {repetition ? "Terminer la répétition" : "Répétition"}
          </button>
          <button onClick={onVisite} className="flex-1 rounded-full border border-line px-4 py-2.5 text-sm text-ink">
            Visite guidée
          </button>
        </section>

        {soiree && (
          <section className="flex flex-col gap-2 border-t border-dashed border-line pt-4">
            <BoutonMaintenir libelle="Maintenir pour clôturer la soirée" indication="Le rideau tombe…" onFin={onCloturer} />
            <p className={`text-center text-xs ${nbArticles > 0 ? "text-danger" : "text-ink-faint"}`}>
              {nbArticles > 0
                ? `Attention : le panier en cours (${pluriel(nbArticles, "article")}) sera perdu s’il n’est pas encaissé.`
                : "Le récapitulatif s’affiche ensuite, avec le CSV à télécharger."}
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
