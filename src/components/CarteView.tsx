"use client";

import { useState } from "react";
import { CATEGORIES, useCaisse } from "@/lib/store";
import { Categorie } from "@/lib/types";
import { formaterEuros } from "@/lib/format";
import { cascade } from "@/lib/anim";

export default function CarteView() {
  const produits = useCaisse((e) => e.produits);
  const modifierProduit = useCaisse((e) => e.modifierProduit);
  const synchroniserProduit = useCaisse((e) => e.synchroniserProduit);
  const supprimerProduit = useCaisse((e) => e.supprimerProduit);
  const ajouterProduit = useCaisse((e) => e.ajouterProduit);

  const [ajoutOuvert, setAjoutOuvert] = useState(false);
  const [nom, setNom] = useState("");
  const [categorie, setCategorie] = useState<Categorie>("Bières");
  const [prix, setPrix] = useState("");

  const ajouter = () => {
    const prixSaisi = Number(prix.replace(",", "."));
    if (!nom.trim() || !prix || !Number.isFinite(prixSaisi) || prixSaisi < 0) return;
    ajouterProduit({ nom: nom.trim(), categorie, prix: prixSaisi, visible: true });
    setNom("");
    setPrix("");
    setAjoutOuvert(false);
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 pb-8 pt-4">
      <p className="mb-5 text-sm text-ink-soft">
        Ajoutez, renommez, repositionnez ou retirez une boisson. Les prix
        s&rsquo;appliquent aux ventes suivantes, pas aux ventes déjà enregistrées.
      </p>

      <div className="flex flex-col gap-2">
        {produits.map((p, i) => (
          <div
            key={p.id}
            style={cascade(i, 35, 9)}
            className="anim-monter flex flex-col gap-2 rounded-xl border border-line bg-surface px-4 py-3"
          >
            <div className="flex items-center gap-2">
              <input
                value={p.nom}
                onChange={(e) => modifierProduit(p.id, { nom: e.target.value })}
                onBlur={() => synchroniserProduit(p.id)}
                className="flex-1 rounded-md border border-line bg-bg px-2.5 py-1.5 text-sm text-ink outline-none focus:border-ink"
              />
              <select
                value={p.categorie}
                onChange={(e) => {
                  modifierProduit(p.id, { categorie: e.target.value as Categorie });
                  synchroniserProduit(p.id);
                }}
                className="rounded-md border border-line bg-bg px-2 py-1.5 text-sm text-ink outline-none focus:border-ink"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-xs text-ink-soft">
                <input
                  type="checkbox"
                  checked={p.visible}
                  onChange={(e) => {
                    modifierProduit(p.id, { visible: e.target.checked });
                    synchroniserProduit(p.id);
                  }}
                />
                Visible à la vente
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.10"
                  min="0"
                  inputMode="decimal"
                  value={p.prix}
                  onChange={(e) => modifierProduit(p.id, { prix: Math.max(0, Number(e.target.value) || 0) })}
                  onBlur={() => synchroniserProduit(p.id)}
                  className="w-20 rounded-md border border-line bg-bg px-2 py-1.5 text-right font-mono text-sm tabular-nums text-ink outline-none focus:border-ink"
                />
                <span className="font-mono text-xs text-ink-faint">€</span>
                <button
                  onClick={() => {
                    if (confirm(`Supprimer « ${p.nom} » de la carte ?`)) supprimerProduit(p.id);
                  }}
                  className="ml-1 text-xs text-danger underline"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {ajoutOuvert ? (
        <div className="anim-deplier mt-4 flex flex-col gap-2.5 rounded-xl border border-line bg-surface px-4 py-3.5">
          <span className="font-mono text-xs uppercase tracking-wider text-ink-faint">
            Nouvelle boisson
          </span>
          <input
            placeholder="Nom"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            className="rounded-md border border-line bg-bg px-2.5 py-2 text-sm text-ink outline-none focus:border-ink"
          />
          <div className="flex gap-2">
            <select
              value={categorie}
              onChange={(e) => setCategorie(e.target.value as Categorie)}
              className="flex-1 rounded-md border border-line bg-bg px-2.5 py-2 text-sm text-ink outline-none focus:border-ink"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input
              placeholder="Prix"
              inputMode="decimal"
              value={prix}
              onChange={(e) => setPrix(e.target.value)}
              className="w-24 rounded-md border border-line bg-bg px-2.5 py-2 text-right text-sm text-ink outline-none focus:border-ink"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setAjoutOuvert(false)}
              className="flex-1 rounded-full border border-line px-4 py-2.5 text-sm text-ink-soft"
            >
              Annuler
            </button>
            <button
              onClick={ajouter}
              className="flex-1 rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-bg"
            >
              Ajouter
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAjoutOuvert(true)}
          className="mt-4 w-full rounded-xl border border-dashed border-line px-4 py-3 text-sm text-ink-soft"
        >
          + Ajouter une boisson
        </button>
      )}

      <p className="mt-6 text-center font-mono text-xs text-ink-faint">
        {produits.length} boisson{produits.length > 1 ? "s" : ""} · total moyen{" "}
        {formaterEuros(
          produits.reduce((s, p) => s + p.prix, 0) / (produits.length || 1)
        )}
      </p>
    </div>
  );
}
