import { Produit, Soiree, Vente } from "./types";
import { formaterDate, formaterHeure } from "./format";

function echapperCsv(valeur: string): string {
  return `"${valeur.replace(/"/g, '""')}"`;
}

function formaterMontantCsv(montant: number): string {
  return montant.toFixed(2).replace(".", ",");
}

export const COLONNE_AUTRES_PRODUITS = "Autres produits";

export function genererCsvSoiree(soiree: Soiree, ventesSoiree: Vente[], produits: Produit[]): string {
  const lignes = [...ventesSoiree].sort((a, b) => a.horodatage - b.horodatage);

  const entetes = [
    "Heure commande",
    "Heure modification",
    ...produits.map((p) => p.nom),
    COLONNE_AUTRES_PRODUITS,
    "Montant (€)",
    "Mode de paiement",
    "Espèces (€)",
    "CB (€)",
  ];

  const rangees = lignes.map((v) => {
    const quantitesParProduit = new Map<string, number>();
    const autres: string[] = [];
    for (const l of v.lignes) {
      const produit = produits.find((p) => p.id === l.produitId) ?? produits.find((p) => p.nom === l.nom);
      if (produit) {
        quantitesParProduit.set(produit.id, (quantitesParProduit.get(produit.id) ?? 0) + l.quantite);
      } else {
        autres.push(`${l.nom} x${l.quantite}`);
      }
    }

    const especes = v.paiements.filter((p) => p.mode === "Espèces").reduce((t, p) => t + p.montant, 0);
    const cb = v.paiements.filter((p) => p.mode === "CB").reduce((t, p) => t + p.montant, 0);
    const modes = [...new Set(v.paiements.map((p) => p.mode))].join(" + ");

    return [
      formaterHeure(v.horodatage),
      v.modifieeLe ? formaterHeure(v.modifieeLe) : "",
      ...produits.map((p) => String(quantitesParProduit.get(p.id) ?? 0)),
      autres.join(", "),
      formaterMontantCsv(v.montantTotal),
      modes,
      formaterMontantCsv(especes),
      formaterMontantCsv(cb),
    ]
      .map(echapperCsv)
      .join(";");
  });

  const recette = lignes.reduce((t, v) => t + v.montantTotal, 0);
  const totalEspeces = lignes
    .flatMap((v) => v.paiements)
    .filter((p) => p.mode === "Espèces")
    .reduce((t, p) => t + p.montant, 0);
  const totalCb = lignes
    .flatMap((v) => v.paiements)
    .filter((p) => p.mode === "CB")
    .reduce((t, p) => t + p.montant, 0);
  const rangeeTotal = [
    "",
    "",
    ...produits.map(() => ""),
    "TOTAL",
    formaterMontantCsv(recette),
    "",
    formaterMontantCsv(totalEspeces),
    formaterMontantCsv(totalCb),
  ]
    .map(echapperCsv)
    .join(";");

  return [
    echapperCsv(`${soiree.nom} — ${formaterDate(soiree.ouverteLe)}`),
    entetes.map(echapperCsv).join(";"),
    ...rangees,
    rangeeTotal,
  ].join("\r\n");
}

function slugifier(texte: string): string {
  return texte
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function telechargerCsvSoiree(soiree: Soiree, ventesSoiree: Vente[], produits: Produit[]): void {
  const csv = genererCsvSoiree(soiree, ventesSoiree, produits);
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = `${slugifier(soiree.nom)}-ventes.csv`;
  document.body.appendChild(lien);
  lien.click();
  document.body.removeChild(lien);
  URL.revokeObjectURL(url);
}
