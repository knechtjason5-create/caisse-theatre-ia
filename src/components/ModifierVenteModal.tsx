"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useCaisse, CATEGORIES } from "@/lib/store";
import { formaterEuros, formaterDate, formaterHeure } from "@/lib/format";
import MontantAnime from "./MontantAnime";
import Glissable from "./Glissable";
import SelecteurMode from "./SelecteurMode";
import { LigneVente, ModePaiement, Paiement, Produit, Vente } from "@/lib/types";

type LignePaiementEdit = { id: string; mode: ModePaiement; montant: number };

export default function ModifierVenteModal({
  vente,
  onFermer,
}: {
  vente: Vente;
  onFermer: () => void;
}) {
  const produits = useCaisse((e) => e.produits);
  const modifierVente = useCaisse((e) => e.modifierVente);

  const [lignes, setLignes] = useState<LigneVente[]>(() => vente.lignes.map((l) => ({ ...l })));
  const [paiements, setPaiements] = useState<LignePaiementEdit[]>(() =>
    vente.paiements.length > 0
      ? vente.paiements.map((p) => ({ id: p.id, mode: p.mode, montant: p.montant }))
      : [{ id: "p0", mode: "Espèces", montant: vente.montantTotal }]
  );

  const total = useMemo(
    () => lignes.reduce((t, l) => t + l.prixApplique * l.quantite, 0),
    [lignes]
  );
  const sommePaiements = useMemo(
    () => Math.round(paiements.reduce((s, p) => s + p.montant, 0) * 100) / 100,
    [paiements]
  );
  const ecart = Math.round((total - sommePaiements) * 100) / 100;
  const equilibre = Math.abs(ecart) < 0.005;

  const dernierTotalRef = useRef(total);
  useEffect(() => {
    if (total === dernierTotalRef.current) return;
    const ancienTotal = dernierTotalRef.current;
    dernierTotalRef.current = total;
    setPaiements((ps) => {
      if (ps.length === 0) return ps;
      const totalCents = Math.round(total * 100);
      if (ancienTotal <= 0) {
        const part = Math.floor(totalCents / ps.length);
        const reste = totalCents - part * ps.length;
        return ps.map((p, i) => ({ ...p, montant: (i < reste ? part + 1 : part) / 100 }));
      }
      const bruts = ps.map((p) => Math.round((p.montant / ancienTotal) * totalCents));
      const ecartCents = totalCents - bruts.reduce((s, v) => s + v, 0);
      return ps.map((p, i) => ({
        ...p,
        montant: (bruts[i] + (i === ps.length - 1 ? ecartCents : 0)) / 100,
      }));
    });
  }, [total]);

  const quantiteProduit = (produitId: string) =>
    lignes.find((l) => l.produitId === produitId)?.quantite ?? 0;

  const changerQuantite = (produit: Produit, delta: number) => {
    setLignes((ls) => {
      const existante = ls.find((l) => l.produitId === produit.id);
      const quantiteActuelle = existante?.quantite ?? 0;
      const nouvelleQuantite = Math.max(0, quantiteActuelle + delta);
      const sansCeProduit = ls.filter((l) => l.produitId !== produit.id);
      if (nouvelleQuantite === 0) return sansCeProduit;
      return [
        ...sansCeProduit,
        {
          produitId: produit.id,
          nom: existante?.nom ?? produit.nom,
          quantite: nouvelleQuantite,
          prixApplique: existante?.prixApplique ?? produit.prix,
        },
      ];
    });
  };

  const retirerLigne = (produitId: string) => {
    setLignes((ls) => ls.filter((l) => l.produitId !== produitId));
  };

  const modifierMontantPaiement = (id: string, valeur: string) => {
    const n = Number(valeur.replace(",", "."));
    setPaiements((ps) =>
      ps.map((p) => (p.id === id ? { ...p, montant: Number.isFinite(n) ? Math.max(0, n) : 0 } : p))
    );
  };

  const modifierModePaiement = (id: string, mode: ModePaiement) => {
    setPaiements((ps) => ps.map((p) => (p.id === id ? { ...p, mode } : p)));
  };

  const ajouterLignePaiement = () => {
    setPaiements((ps) => [...ps, { id: `p${ps.length}-${Date.now()}`, mode: "Espèces", montant: 0 }]);
  };

  const supprimerLignePaiement = (id: string) => {
    setPaiements((ps) => (ps.length > 1 ? ps.filter((p) => p.id !== id) : ps));
  };

  const enregistrer = () => {
    if (lignes.length === 0) return;
    const paiementsFinaux: Paiement[] = paiements.map((p, i) => ({
      id: `paiement-${vente.id}-${i}-${Date.now()}`,
      mode: p.mode,
      montant: p.montant,
    }));
    modifierVente(vente.id, lignes, paiementsFinaux);
    onFermer();
  };

  return (
    <div data-no-swipe className="anim-feuille fixed inset-0 z-50 flex flex-col bg-bg">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3.5">
        <div className="flex flex-col">
          <h1 className="text-lg font-semibold text-ink">Modifier la vente</h1>
          <span className="font-mono text-xs text-ink-faint">
            {formaterDate(vente.horodatage)} · {formaterHeure(vente.horodatage)}
          </span>
        </div>
        <button
          onClick={onFermer}
          aria-label="Fermer"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-lg text-ink"
        >
          ×
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        <h2 className="mb-2.5 font-mono text-xs uppercase tracking-wider text-ink-faint">
          Contenu de la commande
        </h2>

        {lignes.length === 0 ? (
          <p className="mb-5 text-sm text-ink-soft">
            Plus aucun article — ajoutez-en un ci-dessous ou supprimez la vente depuis l&rsquo;historique.
          </p>
        ) : (
          <div className="mb-5 flex flex-col gap-2">
            {lignes.map((l) => (
              <Glissable key={l.produitId} libelle="Retirer" className="anim-deplier" onGlisse={() => retirerLigne(l.produitId)}>
              <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-3.5 py-2.5">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-ink">{l.nom}</span>
                  <span className="font-mono text-xs text-ink-faint">
                    {formaterEuros(l.prixApplique)} × {l.quantite}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() =>
                        setLignes((ls) =>
                          ls
                            .map((x) =>
                              x.produitId === l.produitId
                                ? { ...x, quantite: Math.max(0, x.quantite - 1) }
                                : x
                            )
                            .filter((x) => x.quantite > 0)
                        )
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 text-base text-ink"
                      aria-label={`Retirer un ${l.nom}`}
                    >
                      −
                    </button>
                    <span className="w-5 text-center font-mono text-sm tabular-nums">
                      {l.quantite}
                    </span>
                    <button
                      onClick={() =>
                        setLignes((ls) =>
                          ls.map((x) =>
                            x.produitId === l.produitId ? { ...x, quantite: x.quantite + 1 } : x
                          )
                        )
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 text-base text-ink"
                      aria-label={`Ajouter un ${l.nom}`}
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => retirerLigne(l.produitId)}
                    aria-label={`Retirer ${l.nom} de la vente`}
                    className="text-xs text-danger underline"
                  >
                    Retirer
                  </button>
                </div>
              </div>
              </Glissable>
            ))}
          </div>
        )}

        <h2 className="mb-2.5 font-mono text-xs uppercase tracking-wider text-ink-faint">
          Ajouter un produit
        </h2>
        <div className="mb-6 flex flex-col gap-4">
          {CATEGORIES.map((categorie) => {
            const produitsCategorie = produits.filter((p) => p.categorie === categorie);
            if (produitsCategorie.length === 0) return null;
            return (
              <div key={categorie}>
                <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                  {categorie}
                </span>
                <div className="flex flex-col gap-1.5">
                  {produitsCategorie.map((p) => {
                    const quantite = quantiteProduit(p.id);
                    return (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface px-3 py-2"
                      >
                        <div className="flex flex-col">
                          <span className="text-sm text-ink">{p.nom}</span>
                          <span className="font-mono text-xs text-ink-faint">
                            {formaterEuros(p.prix)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => changerQuantite(p, -1)}
                            disabled={quantite === 0}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 text-base text-ink disabled:opacity-30"
                            aria-label={`Retirer un ${p.nom}`}
                          >
                            −
                          </button>
                          <span className="w-5 text-center font-mono text-sm tabular-nums">
                            {quantite}
                          </span>
                          <button
                            onClick={() => changerQuantite(p, 1)}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 text-base text-ink"
                            aria-label={`Ajouter un ${p.nom}`}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mb-6 flex flex-col items-center gap-1 rounded-xl border border-line bg-surface py-5">
          <span className="font-mono text-xs uppercase tracking-wider text-ink-faint">
            Nouveau total
          </span>
          <span className="text-3xl font-semibold tabular-nums text-ink">
            <MontantAnime valeur={total} />
          </span>
        </div>

        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-mono text-xs uppercase tracking-wider text-ink-faint">Paiement</h2>
          <button onClick={ajouterLignePaiement} className="text-xs text-ink-soft underline">
            + Ajouter
          </button>
        </div>

        <div className="flex flex-col gap-2.5">
          {paiements.map((p) => (
            <div
              key={p.id}
              className="anim-deplier flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-3.5 py-3"
            >
              <SelecteurMode valeur={p.mode} onChange={(m) => modifierModePaiement(p.id, m)} />

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <input
                    inputMode="decimal"
                    value={p.montant.toFixed(2)}
                    onChange={(e) => modifierMontantPaiement(p.id, e.target.value)}
                    className="w-16 rounded-md border border-line bg-bg px-2 py-1.5 text-right font-mono text-sm tabular-nums text-ink outline-none focus:border-ink"
                  />
                  <span className="font-mono text-sm text-ink-faint">€</span>
                </div>
                {paiements.length > 1 && (
                  <button
                    onClick={() => supprimerLignePaiement(p.id)}
                    aria-label="Supprimer ce paiement"
                    className="text-xs text-danger underline"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {!equilibre && (
          <p className="mt-4 text-center text-sm text-ink-soft">
            {ecart > 0
              ? `Écart : il manque ${formaterEuros(ecart)} côté paiement par rapport au total.`
              : `Écart : ${formaterEuros(Math.abs(ecart))} de trop côté paiement par rapport au total.`}
            {" "}Vous pouvez tout de même enregistrer.
          </p>
        )}
      </div>

      <div className="border-t border-line bg-surface px-5 py-4">
        <button
          onClick={enregistrer}
          disabled={lignes.length === 0}
          className="mx-auto block w-full max-w-md rounded-full bg-ink px-6 py-3.5 text-center text-base font-medium text-bg disabled:opacity-30"
        >
          Enregistrer les modifications
        </button>
      </div>
    </div>
  );
}
