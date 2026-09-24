"use client";

import { useEffect, useMemo, useState } from "react";
import { dessinerProgramme, partagerProgramme } from "@/lib/programme";
import { useCaisse } from "@/lib/store";
import { formaterEuros } from "@/lib/format";
import { telechargerCsvSoiree } from "@/lib/export";
import { cascade } from "@/lib/anim";
import { Soiree } from "@/lib/types";
import MontantAnime from "./MontantAnime";

const CIRCONFERENCE = 264; // 2π × 42, rayon de l'anneau ci-dessous
const OR = "#b8923f";

/** Récapitulatif animé affiché sur le rideau baissé, à la clôture d'une soirée. */
export default function RecapSoiree({ soiree, onFermer }: { soiree: Soiree; onFermer: () => void }) {
  const toutesLesVentes = useCaisse((e) => e.ventes);
  const produits = useCaisse((e) => e.produits);
  const [sortie, setSortie] = useState(false);

  const ventes = useMemo(
    () => toutesLesVentes.filter((v) => v.soireeId === soiree.id),
    [toutesLesVentes, soiree.id]
  );

  const stats = useMemo(() => {
    const recette = ventes.reduce((t, v) => t + v.montantTotal, 0);
    const paiements = ventes.flatMap((v) => v.paiements);
    const especes = paiements.filter((p) => p.mode === "Espèces").reduce((t, p) => t + p.montant, 0);
    const cb = paiements.filter((p) => p.mode === "CB").reduce((t, p) => t + p.montant, 0);

    const parProduit = ventes
      .flatMap((v) => v.lignes)
      .reduce<Record<string, number>>((acc, l) => {
        acc[l.nom] = (acc[l.nom] ?? 0) + l.quantite;
        return acc;
      }, {});
    const classement = Object.entries(parProduit).sort((a, b) => b[1] - a[1]);

    const parHeure = ventes.reduce<Record<number, number>>((acc, v) => {
      const h = new Date(v.horodatage).getHours();
      acc[h] = (acc[h] ?? 0) + 1;
      return acc;
    }, {});
    const pic = Object.entries(parHeure).sort((a, b) => b[1] - a[1])[0];

    return { recette, especes, cb, classement, pic: pic ? Number(pic[0]) : null };
  }, [ventes]);

  // Le programme est dessiné d'avance : le partage doit partir directement du geste de l'utilisateur (iPhone).
  const [programme, setProgramme] = useState<Blob | null>(null);
  useEffect(() => {
    let annule = false;
    dessinerProgramme({ soiree, nombreVentes: ventes.length, ...stats })
      .then((image) => !annule && setProgramme(image))
      .catch(() => {});
    return () => {
      annule = true;
    };
  }, [soiree, ventes.length, stats]);

  const fermer = () => {
    setSortie(true);
    setTimeout(onFermer, 220);
  };

  const totalModes = stats.especes + stats.cb;
  const partEspeces = totalModes > 0 ? stats.especes / totalModes : 0;
  const maxQuantite = stats.classement[0]?.[1] ?? 1;

  return (
    <div
      className={`fixed inset-0 z-[72] flex items-center justify-center px-4 py-6 ${sortie ? "anim-sortie" : "anim-fondu"}`}
    >
      <div className="anim-apparaitre flex max-h-full w-full max-w-sm flex-col gap-5 overflow-y-auto rounded-2xl border border-line bg-surface p-5 shadow-2xl">
        <div className="flex flex-col items-center gap-1 text-center">
          <span className="font-mono text-xs uppercase tracking-wider text-ink-faint">Rideau · {soiree.nom}</span>
          <span className="text-4xl font-semibold tabular-nums text-ink">
            <MontantAnime valeur={stats.recette} depuis={0} duree={1200} />
          </span>
          <span className="text-sm text-ink-soft">
            {ventes.length} vente{ventes.length > 1 ? "s" : ""}
            {stats.pic !== null && ` · pic entre ${stats.pic} h et ${stats.pic + 1} h`}
          </span>
        </div>

        {totalModes > 0 && (
          <div className="flex items-center gap-4">
            <svg viewBox="0 0 100 100" className="h-24 w-24 shrink-0 -rotate-90" aria-hidden>
              <circle cx="50" cy="50" r="42" fill="none" stroke="var(--surface-2)" strokeWidth="12" />
              <circle
                className="anim-anneau"
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke={OR}
                strokeWidth="12"
                style={{ strokeDasharray: `${partEspeces * CIRCONFERENCE} ${CIRCONFERENCE}` }}
              />
            </svg>
            <div className="flex flex-col gap-2 text-sm">
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: OR }} />
                Espèces <span className="font-mono tabular-nums text-ink-soft">{formaterEuros(stats.especes)}</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-surface-2" />
                CB <span className="font-mono tabular-nums text-ink-soft">{formaterEuros(stats.cb)}</span>
              </span>
            </div>
          </div>
        )}

        {stats.classement.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-sm text-ink-soft">
              Produit phare : <span className="font-medium text-ink">{stats.classement[0][0]}</span>
            </span>
            {stats.classement.slice(0, 6).map(([nom, quantite], i) => (
              <div key={nom} className="flex flex-col gap-1">
                <div className="flex justify-between text-xs">
                  <span className="text-ink-soft">{nom}</span>
                  <span className="font-mono tabular-nums text-ink-faint">× {quantite}</span>
                </div>
                <div className="h-1.5 rounded-full bg-surface-2">
                  <div
                    className="anim-barre h-full rounded-full bg-ink"
                    style={{ width: `${(quantite / maxQuantite) * 100}%`, ...cascade(i, 80, 6) }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-2">
          {ventes.length > 0 && (
            <button
              onClick={() => programme && partagerProgramme(programme, soiree)}
              disabled={!programme}
              className="w-full rounded-full border px-4 py-2.5 text-sm font-medium text-ink disabled:opacity-40"
              style={{ borderColor: OR }}
            >
              Partager le programme de la soirée
            </button>
          )}
          {ventes.length > 0 && (
            <button
              onClick={() => telechargerCsvSoiree(soiree, ventes, produits)}
              className="w-full rounded-full border border-line px-4 py-2.5 text-sm font-medium text-ink"
            >
              Télécharger le CSV des ventes
            </button>
          )}
          <button onClick={fermer} className="w-full rounded-full bg-ink px-4 py-3 text-sm font-medium text-bg">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
