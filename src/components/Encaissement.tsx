"use client";

import { useMemo, useState } from "react";
import { useCaisse } from "@/lib/store";
import { formaterEuros } from "@/lib/format";
import { ModePaiement } from "@/lib/types";
import Glissable from "./Glissable";
import SelecteurMode from "./SelecteurMode";

type LignePaiement = { id: string; mode: ModePaiement; montant: number };

function repartirEquitablement(totalEuros: number, nbPersonnes: number): number[] {
  const totalCents = Math.round(totalEuros * 100);
  const base = Math.floor(totalCents / nbPersonnes);
  const reste = totalCents - base * nbPersonnes;
  return Array.from({ length: nbPersonnes }, (_, i) => (i < reste ? base + 1 : base) / 100);
}

export default function Encaissement({ onRetour, onValide }: { onRetour: () => void; onValide: () => void }) {
  const panier = useCaisse((e) => e.panier);
  const produits = useCaisse((e) => e.produits);
  const total = useCaisse((e) => e.totalPanier());
  const ajouterAuPanier = useCaisse((e) => e.ajouterAuPanier);
  const viderPanier = useCaisse((e) => e.viderPanier);
  const validerVente = useCaisse((e) => e.validerVente);

  const [nbPersonnes, setNbPersonnes] = useState(1);
  const [lignes, setLignes] = useState<LignePaiement[]>(() =>
    repartirEquitablement(total, 1).map((m, i) => ({ id: `p${i}`, mode: "Espèces", montant: m }))
  );

  // Le panier change pendant l'encaissement (retrait, ajout) : on répartit à nouveau le total, modes conservés.
  const [totalReparti, setTotalReparti] = useState(total);
  if (total !== totalReparti) {
    setTotalReparti(total);
    const montants = repartirEquitablement(total, nbPersonnes);
    setLignes((ls) => ls.map((l, i) => ({ ...l, montant: montants[i] ?? 0 })));
  }

  const articles = panier
    .map((a) => ({ ...a, produit: produits.find((p) => p.id === a.produitId) }))
    .filter((a): a is typeof a & { produit: NonNullable<typeof a.produit> } => !!a.produit);

  const appliquerNbPersonnes = (n: number) => {
    const nb = Math.max(1, n);
    setNbPersonnes(nb);
    const montants = repartirEquitablement(total, nb);
    setLignes(montants.map((m, i) => ({ id: `p${i}`, mode: "Espèces", montant: m })));
  };

  const modifierMontant = (id: string, valeur: string) => {
    const n = Number(valeur.replace(",", "."));
    setLignes((ls) => ls.map((l) => (l.id === id ? { ...l, montant: Number.isFinite(n) ? Math.max(0, n) : 0 } : l)));
  };

  const modifierMode = (id: string, mode: ModePaiement) => {
    setLignes((ls) => ls.map((l) => (l.id === id ? { ...l, mode } : l)));
  };

  const sommeSaisie = useMemo(
    () => Math.round(lignes.reduce((s, l) => s + l.montant, 0) * 100) / 100,
    [lignes]
  );
  const ecart = Math.round((total - sommeSaisie) * 100) / 100;
  const equilibre = Math.abs(ecart) < 0.005;
  const panierVide = articles.length === 0;

  const confirmer = () => {
    if (!equilibre || panierVide) return;
    validerVente(
      lignes.map((l, i) => ({ id: `paiement-${i}-${Date.now()}`, mode: l.mode, montant: l.montant }))
    );
    onValide();
  };

  return (
    <div data-no-swipe className="anim-feuille fixed inset-0 z-50 flex flex-col bg-bg">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3.5">
        <div className="flex items-center gap-3">
          <button
            onClick={onRetour}
            className="flex h-9 w-9 items-center justify-center rounded-full text-lg text-ink"
            aria-label="Retour à la vente"
          >
            ←
          </button>
          <h1 className="text-lg font-semibold text-ink">Encaisser</h1>
        </div>
        {!panierVide && (
          <button onClick={viderPanier} className="text-sm text-ink-faint underline">
            Vider
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        {panierVide ? (
          <p className="py-8 text-center text-sm text-ink-soft">
            Le panier est vide — retournez à la vente pour ajouter des boissons.
          </p>
        ) : (
          <div className="mb-5 flex flex-col gap-2">
            {articles.map((a) => (
              <Glissable
                key={a.produitId}
                libelle="Retirer"
                onGlisse={() => ajouterAuPanier(a.produitId, -a.quantite)}
              >
              <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-3.5 py-2.5">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-ink">{a.produit.nom}</span>
                  <span className="font-mono text-xs text-ink-faint">
                    {formaterEuros(a.produit.prix)} × {a.quantite}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => ajouterAuPanier(a.produitId, -1)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 text-base text-ink"
                      aria-label={`Retirer un ${a.produit.nom}`}
                    >
                      −
                    </button>
                    <span key={a.quantite} className="anim-pop inline-block w-5 text-center font-mono text-sm tabular-nums">
                      {a.quantite}
                    </span>
                    <button
                      onClick={() => ajouterAuPanier(a.produitId, 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 text-base text-ink"
                      aria-label={`Ajouter un ${a.produit.nom}`}
                    >
                      +
                    </button>
                  </div>
                  <span className="w-14 text-right font-mono text-sm tabular-nums text-ink">
                    {formaterEuros(a.produit.prix * a.quantite)}
                  </span>
                </div>
              </div>
              </Glissable>
            ))}
          </div>
        )}

        <div className="mb-6 flex flex-col items-center gap-1 rounded-xl border border-line bg-surface py-5">
          <span className="font-mono text-xs uppercase tracking-wider text-ink-faint">
            Total
          </span>
          <span key={total} className="anim-pop-doux inline-block text-3xl font-semibold tabular-nums text-ink">
            {formaterEuros(total)}
          </span>
        </div>

        <div className="mb-6 flex items-center justify-between gap-3">
          <span className="font-mono text-xs uppercase tracking-wider text-ink-faint">
            Diviser entre
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => appliquerNbPersonnes(nbPersonnes - 1)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-lg text-ink"
            >
              −
            </button>
            <span key={nbPersonnes} className="anim-pop-doux inline-block w-20 whitespace-nowrap text-center font-mono text-base tabular-nums text-ink">
              {nbPersonnes} pers.
            </span>
            <button
              onClick={() => appliquerNbPersonnes(nbPersonnes + 1)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-lg text-ink"
            >
              +
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          {lignes.map((l, i) => (
            <div
              key={l.id}
              className={`${i === 0 ? "anim-deplier" : "anim-scinder"} flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-3.5 py-3`}
            >
              <span className="w-20 shrink-0 text-sm text-ink-soft">
                Personne {i + 1}
              </span>

              <SelecteurMode valeur={l.mode} onChange={(m) => modifierMode(l.id, m)} />

              <div className="flex items-center gap-1">
                <input
                  inputMode="decimal"
                  value={l.montant.toFixed(2)}
                  onChange={(e) => modifierMontant(l.id, e.target.value)}
                  className="w-16 rounded-md border border-line bg-bg px-2 py-1.5 text-right font-mono text-sm tabular-nums text-ink outline-none focus:border-ink"
                />
                <span className="font-mono text-sm text-ink-faint">€</span>
              </div>
            </div>
          ))}
        </div>

        {!equilibre && !panierVide && (
          <p className="mt-4 text-center text-sm text-danger">
            {ecart > 0
              ? `Il reste ${formaterEuros(ecart)} à répartir.`
              : `${formaterEuros(Math.abs(ecart))} de trop — ajustez les montants.`}
          </p>
        )}
      </div>

      <div className="border-t border-line bg-surface px-5 py-4">
        <button
          onClick={confirmer}
          disabled={!equilibre || panierVide}
          className="mx-auto block w-full max-w-md rounded-full bg-ink px-6 py-3.5 text-center text-base font-medium text-bg disabled:opacity-30"
        >
          Valider la vente
        </button>
      </div>
    </div>
  );
}
