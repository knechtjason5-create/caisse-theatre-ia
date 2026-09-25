"use client";

import { useEffect, useMemo, useState } from "react";
import { CATEGORIES, useCaisse } from "@/lib/store";
import { ModePaiement } from "@/lib/types";
import ProductTile from "./ProductTile";
import Encaissement from "./Encaissement";
import PanierPuces from "./PanierPuces";
import Tournees from "./Tournees";
import { PictoCategorie } from "./Picto";
import { formaterEuros } from "@/lib/format";
import { vibrer } from "@/lib/haptique";
import ChiffreRoulant from "./ChiffreRoulant";

const DELAI_ANNULATION = 5000; // = animations « toast-annulable » et « decompte » de globals.css

export default function VenteView({
  onOuvrirSoiree,
  onRepetition,
}: {
  onOuvrirSoiree: () => void;
  onRepetition: () => void;
}) {
  const soiree = useCaisse((e) => e.soireeActive());
  const repetition = useCaisse((e) => e.repetition);
  const tousLesProduits = useCaisse((e) => e.produits);
  const produits = useMemo(
    () => tousLesProduits.filter((p) => p.visible),
    [tousLesProduits]
  );
  const total = useCaisse((e) => e.totalPanier());
  const nbArticles = useCaisse((e) =>
    e.panier.reduce((n, a) => n + a.quantite, 0)
  );

  const annulerVente = useCaisse((e) => e.annulerVente);
  const validerVente = useCaisse((e) => e.validerVente);

  const [encaissementOuvert, setEncaissementOuvert] = useState(false);
  /** Vente qui vient d'être validée : son bandeau propose de l'annuler pendant quelques secondes. */
  const [venteConfirmee, setVenteConfirmee] = useState<{ id: string; texte: string } | null>(null);

  useEffect(() => {
    if (!venteConfirmee) return;
    const t = setTimeout(() => setVenteConfirmee(null), DELAI_ANNULATION);
    return () => clearTimeout(t);
  }, [venteConfirmee]);

  /** Encaissement express : une personne paie tout, d'un seul mode. Le bandeau « Annuler » sert de filet. */
  const encaisserDirect = (mode: ModePaiement) => {
    const montant = total;
    const venteId = validerVente([{ id: `paiement-0-${Date.now()}`, mode, montant }]);
    if (!venteId) return;
    setVenteConfirmee({ id: venteId, texte: `${formaterEuros(montant)} ${mode === "CB" ? "par carte" : "en espèces"}` });
    vibrer([12, 40, 12]);
  };

  if (!soiree) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
        <div className="flex gap-3 text-ink-faint">
          {CATEGORIES.map((c) => (
            <PictoCategorie key={c} categorie={c} className="h-10 w-10" />
          ))}
        </div>
        <p className="text-sm text-ink-soft">
          Aucune soirée en cours — ouvrez-en une pour commencer à vendre.
        </p>
        <button
          onClick={onOuvrirSoiree}
          className="rounded-full bg-ink px-6 py-3 text-sm font-medium text-bg"
        >
          Ouvrir une soirée
        </button>
        {!repetition && (
          <button onClick={onRepetition} className="text-sm text-ink-faint underline">
            ou s&rsquo;entraîner en mode répétition
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className={`flex-1 overflow-y-auto px-4 pt-4 ${nbArticles > 0 ? "pb-48" : "pb-8"}`}>
        <Tournees />
        {CATEGORIES.map((categorie, ci) => {
          const produitsCategorie = produits.filter((p) => p.categorie === categorie);
          if (produitsCategorie.length === 0) return null;
          return (
            <section key={categorie} className="mb-5">
              <h2
                style={{ animationDelay: `${ci * 90}ms` }}
                className="anim-fondu mb-2 flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-ink-faint"
              >
                <PictoCategorie categorie={categorie} className="h-5 w-5" />
                {categorie}
                <span aria-hidden className="h-px flex-1 bg-line" />
              </h2>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {produitsCategorie.map((p, i) => (
                  <ProductTile key={p.id} produit={p} delai={ci * 90 + Math.min(i, 6) * 45} />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {nbArticles > 0 && !encaissementOuvert && (
        <>
          <PanierPuces />
          <div
            data-cible-panier
            data-visite="barre"
            className="anim-monter fixed inset-x-4 bottom-20 z-30 flex items-center gap-1.5 rounded-full bg-choix p-1.5 text-sur-choix shadow-lg"
          >
            <button
              onClick={() => setEncaissementOuvert(true)}
              aria-label={`Encaisser en détail ${formaterEuros(total)} : addition partagée, monnaie à rendre`}
              className="flex min-w-0 flex-1 flex-col items-start rounded-full py-1 pl-3.5 pr-2 text-left leading-tight"
            >
              <span className="text-[11px] opacity-70">
                <ChiffreRoulant valeur={nbArticles} /> {nbArticles > 1 ? "articles" : "article"} · détail ›
              </span>
              <span key={total} className="anim-pop-doux inline-block text-lg font-semibold tabular-nums">
                {formaterEuros(total)}
              </span>
            </button>
            <button
              onClick={() => encaisserDirect("Espèces")}
              aria-label={`Encaisser ${formaterEuros(total)} en espèces`}
              className="rounded-full bg-sur-choix/15 px-4 py-3 text-sm font-medium"
            >
              Espèces
            </button>
            <button
              onClick={() => encaisserDirect("CB")}
              aria-label={`Encaisser ${formaterEuros(total)} par carte`}
              className="rounded-full bg-sur-choix/15 px-4 py-3 text-sm font-medium"
            >
              CB
            </button>
          </div>
        </>
      )}

      {encaissementOuvert && (
        <Encaissement
          onRetour={() => setEncaissementOuvert(false)}
          onValide={(venteId, texte) => {
            setEncaissementOuvert(false);
            setVenteConfirmee({ id: venteId, texte });
            vibrer([12, 40, 12]);
          }}
        />
      )}

      {venteConfirmee && (
        <div
          key={venteConfirmee.id}
          role="status"
          className={`anim-toast-annulable fixed inset-x-4 z-40 flex items-center gap-2 overflow-hidden rounded-full bg-ink py-2 pl-5 pr-2 text-sm font-medium text-bg shadow-lg ${
            nbArticles > 0 ? "bottom-[12.5rem]" : "bottom-20"
          }`}
        >
          <svg
            className="h-4 w-4 shrink-0"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path className="anim-trace" pathLength={1} d="M3 8.5l3.2 3.2L13 4.8" />
          </svg>
          <span className="min-w-0 flex-1 truncate">
            Vente enregistrée <span className="font-normal opacity-70">· {venteConfirmee.texte}</span>
          </span>
          <button
            onClick={() => {
              annulerVente(venteConfirmee.id);
              setVenteConfirmee(null);
              vibrer(20);
            }}
            className="shrink-0 rounded-full border border-bg/30 px-3.5 py-1.5 text-xs font-medium text-bg"
          >
            Annuler
          </button>
          {/* Le temps restant pour annuler s'égrène sous le bandeau. */}
          <span aria-hidden className="anim-decompte absolute inset-x-0 bottom-0 h-0.5 bg-bg/40" />
        </div>
      )}
    </div>
  );
}
