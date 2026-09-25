"use client";

import { useState } from "react";
import { formaterSaisie, lireMontant } from "@/lib/format";

/**
 * Champ de montant commun à toute l'app : affiche « 8,75 » (virgule), accepte la virgule ou le point,
 * refuse les montants négatifs ou illisibles avec un message sous le champ plutôt qu'en silence.
 * Le montant n'est transmis (onChange) que lorsqu'il est valide.
 */
export default function ChampMontant({
  valeur,
  onChange,
  onValide,
  label,
  className = "w-20",
}: {
  valeur: number;
  onChange: (montant: number) => void;
  /** Appelé en quittant le champ (ex. synchroniser un prix en base). */
  onValide?: () => void;
  label: string;
  className?: string;
}) {
  const [texte, setTexte] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const saisir = (t: string) => {
    setTexte(t);
    const n = lireMontant(t);
    if (n === null) return setErreur(t.trim() === "" ? "Montant requis" : "Nombre invalide");
    if (n < 0) return setErreur("Pas de montant négatif");
    setErreur(null);
    onChange(n);
  };

  return (
    <span className="relative inline-flex flex-col items-end">
      <span className="flex items-center gap-1">
        <input
          inputMode="decimal"
          aria-label={label}
          aria-invalid={erreur !== null}
          value={texte ?? formaterSaisie(valeur)}
          onFocus={(e) => {
            setTexte(formaterSaisie(valeur));
            e.currentTarget.select();
          }}
          onChange={(e) => saisir(e.target.value)}
          onBlur={() => {
            // En quittant le champ, on revient à la dernière valeur valide, bien écrite.
            setTexte(null);
            setErreur(null);
            onValide?.();
          }}
          className={`${className} rounded-md border bg-bg px-2 py-1.5 text-right font-mono text-sm tabular-nums text-ink outline-none ${
            erreur ? "border-danger" : "border-line focus:border-ink"
          }`}
        />
        <span className="font-mono text-sm text-ink-faint">€</span>
      </span>
      {erreur && (
        <span role="alert" className="anim-deplier absolute right-0 top-full mt-0.5 whitespace-nowrap text-[11px] text-danger">
          {erreur}
        </span>
      )}
    </span>
  );
}
