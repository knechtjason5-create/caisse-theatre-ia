"use client";

import { useEffect, useMemo, useState } from "react";
import { useCaisse } from "@/lib/store";
import { ArticlePanier, Produit } from "@/lib/types";
import { formaterEuros } from "@/lib/format";
import { lancerVol } from "@/lib/vol";
import { vibrer } from "@/lib/haptique";

const NB_RECENTES = 3;

type Tournee = { signature: string; articles: ArticlePanier[] };

/** Même commande = mêmes boissons en mêmes quantités, quel que soit l'ordre de saisie. */
function signer(articles: ArticlePanier[]): string {
  return [...articles]
    .sort((a, b) => a.produitId.localeCompare(b.produitId))
    .map((a) => `${a.produitId}:${a.quantite}`)
    .join("|");
}

/** Tournées épinglées sur cet appareil, pour la soirée en cours (localStorage, facultatif). */
function useEpinglees(soireeId: string) {
  const cle = `caisse-tournees-${soireeId}`;
  const [epinglees, setEpinglees] = useState<Tournee[]>([]);

  useEffect(() => {
    try {
      const brut = localStorage.getItem(cle);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- lecture du stockage après montage
      setEpinglees(brut ? (JSON.parse(brut) as Tournee[]) : []);
    } catch {
      setEpinglees([]);
    }
  }, [cle]);

  const basculer = (t: Tournee) => {
    setEpinglees((liste) => {
      const suivante = liste.some((x) => x.signature === t.signature)
        ? liste.filter((x) => x.signature !== t.signature)
        : [...liste, t];
      try {
        localStorage.setItem(cle, JSON.stringify(suivante));
      } catch {
        // stockage indisponible : l'épingle vaut pour cette visite seulement
      }
      return suivante;
    });
  };

  return { epinglees, basculer };
}

function libelle(articles: ArticlePanier[], produits: Produit[]): { texte: string; prix: number } | null {
  const lignes = articles
    .map((a) => ({ a, p: produits.find((p) => p.id === a.produitId && p.visible) }))
    .filter((x): x is { a: ArticlePanier; p: Produit } => !!x.p);
  if (lignes.length === 0) return null;
  return {
    texte: lignes.map(({ a, p }) => `${a.quantite} ${p.nom}`).join(" + "),
    prix: lignes.reduce((t, { a, p }) => t + a.quantite * p.prix, 0),
  };
}

/**
 * « Dernières commandes » en haut de la vente : les 3 derniers paniers encaissés ce soir, plus ceux qu'on a
 * épinglés (★). Un toucher remet la commande dans le panier, pratique pour les tournées de l'entracte.
 */
export default function Tournees() {
  const soiree = useCaisse((e) => e.soireeActive());
  const ventes = useCaisse((e) => e.ventes);
  const produits = useCaisse((e) => e.produits);
  const ajouterArticles = useCaisse((e) => e.ajouterArticles);
  const { epinglees, basculer } = useEpinglees(soiree?.id ?? "aucune");

  const recentes = useMemo(() => {
    if (!soiree) return [];
    const vues = new Set(epinglees.map((t) => t.signature));
    const liste: Tournee[] = [];
    const siennes = ventes.filter((v) => v.soireeId === soiree.id).sort((a, b) => b.horodatage - a.horodatage);
    for (const v of siennes) {
      const articles = v.lignes.map((l) => ({ produitId: l.produitId, quantite: l.quantite }));
      const signature = signer(articles);
      if (vues.has(signature)) continue;
      vues.add(signature);
      liste.push({ signature, articles });
      if (liste.length === NB_RECENTES) break;
    }
    return liste;
  }, [soiree, ventes, epinglees]);

  const toutes = [
    ...epinglees.map((t) => ({ t, epinglee: true })),
    ...recentes.map((t) => ({ t, epinglee: false })),
  ]
    .map((x) => ({ ...x, l: libelle(x.t.articles, produits) }))
    .filter((x): x is typeof x & { l: NonNullable<typeof x.l> } => !!x.l);

  if (toutes.length === 0) return null;

  return (
    <section data-visite="tournees" className="anim-fondu mb-5">
      <h2 className="mb-2 font-mono text-xs uppercase tracking-wider text-ink-faint">Dernières commandes</h2>
      <div
        data-no-swipe
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {toutes.map(({ t, epinglee, l }) => (
          <div
            key={t.signature}
            className={`flex max-w-[16rem] shrink-0 items-stretch overflow-hidden rounded-xl border bg-surface ${
              epinglee ? "border-or" : "border-line"
            }`}
          >
            <button
              onClick={(e) => {
                ajouterArticles(t.articles);
                lancerVol(e.currentTarget.getBoundingClientRect());
                vibrer(10);
              }}
              aria-label={`Remettre dans le panier : ${l.texte}`}
              className="flex min-w-0 flex-col items-start gap-0.5 py-2 pl-3 pr-1 text-left"
            >
              <span className="w-full truncate text-sm text-ink">{l.texte}</span>
              <span className="font-mono text-xs tabular-nums text-ink-faint">{formaterEuros(l.prix)}</span>
            </button>
            <button
              onClick={() => basculer(t)}
              aria-pressed={epinglee}
              aria-label={epinglee ? "Désépingler cette commande" : "Épingler cette commande pour la soirée"}
              className={`flex w-9 shrink-0 items-center justify-center text-base ${epinglee ? "text-or" : "text-ink-faint"}`}
            >
              {epinglee ? "★" : "☆"}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
