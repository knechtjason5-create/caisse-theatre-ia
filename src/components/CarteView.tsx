"use client";

import { useRef, useState } from "react";
import { CATEGORIES, useCaisse } from "@/lib/store";
import { Categorie } from "@/lib/types";
import { formaterEuros, lireMontant, pluriel } from "@/lib/format";
import ChampMontant from "./ChampMontant";
import { PictoCategorie } from "./Picto";
import { cascade } from "@/lib/anim";
import { useConfirmer } from "@/lib/confirmation";

export default function CarteView() {
  const produits = useCaisse((e) => e.produits);
  const modifierProduit = useCaisse((e) => e.modifierProduit);
  const synchroniserProduit = useCaisse((e) => e.synchroniserProduit);
  const supprimerProduit = useCaisse((e) => e.supprimerProduit);
  const ajouterProduit = useCaisse((e) => e.ajouterProduit);
  const confirmer = useConfirmer();

  const [ajoutOuvert, setAjoutOuvert] = useState(false);
  const [nom, setNom] = useState("");
  const [categorie, setCategorie] = useState<Categorie>("Bières");
  const [prix, setPrix] = useState("");

  const nomAvantSaisie = useRef("");
  const [erreurAjout, setErreurAjout] = useState<string | null>(null);

  const ajouter = () => {
    const prixSaisi = lireMontant(prix);
    if (!nom.trim()) return setErreurAjout("Donnez un nom à la boisson.");
    if (prixSaisi === null) return setErreurAjout("Indiquez un prix, par exemple 3,50.");
    if (prixSaisi < 0) return setErreurAjout("Le prix ne peut pas être négatif.");
    ajouterProduit({ nom: nom.trim(), categorie, prix: prixSaisi, visible: true });
    setNom("");
    setPrix("");
    setErreurAjout(null);
    setAjoutOuvert(false);
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 pb-8 pt-4">
      <p className="mb-5 text-sm text-ink-soft">
        Ajoutez, renommez ou retirez une boisson. Les prix
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
              <PictoCategorie categorie={p.categorie} className="h-7 w-7 shrink-0 text-ink-faint" />
              <input
                value={p.nom}
                aria-label="Nom de la boisson"
                aria-invalid={!p.nom.trim()}
                onFocus={() => (nomAvantSaisie.current = p.nom)}
                onChange={(e) => modifierProduit(p.id, { nom: e.target.value })}
                onBlur={() => {
                  // Un nom vide n'est pas enregistré : on revient à l'ancien.
                  if (!p.nom.trim()) modifierProduit(p.id, { nom: nomAvantSaisie.current });
                  synchroniserProduit(p.id);
                }}
                className={`min-w-0 flex-1 rounded-md border bg-bg px-2.5 py-1.5 text-sm text-ink outline-none ${
                  p.nom.trim() ? "border-line focus:border-ink" : "border-danger"
                }`}
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
            {!p.nom.trim() && (
              <span role="alert" className="-mt-1 text-[11px] text-danger">
                Le nom ne peut pas être vide : l&rsquo;ancien sera remis en quittant le champ.
              </span>
            )}
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
                <ChampMontant
                  label={`Prix de ${p.nom}`}
                  valeur={p.prix}
                  onChange={(prix) => modifierProduit(p.id, { prix })}
                  onValide={() => synchroniserProduit(p.id)}
                />
                <button
                  onClick={() => {
                    confirmer({ titre: `Supprimer « ${p.nom} » de la carte ?`, libelle: "Supprimer", danger: true }).then(
                      (ok) => ok && supprimerProduit(p.id)
                    );
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
              className="w-24 rounded-md border border-line bg-bg px-2.5 py-2 text-right font-mono text-sm tabular-nums text-ink outline-none focus:border-ink"
            />
          </div>
          {erreurAjout && (
            <p role="alert" className="anim-deplier text-xs text-danger">
              {erreurAjout}
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => {
                setAjoutOuvert(false);
                setErreurAjout(null);
              }}
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
        {pluriel(produits.length, "boisson")} · prix moyen{" "}
        {formaterEuros(
          produits.reduce((s, p) => s + p.prix, 0) / (produits.length || 1)
        )}
      </p>
    </div>
  );
}
