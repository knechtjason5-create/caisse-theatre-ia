import { Soiree, Vente } from "./types";
import { formaterDate, formaterHeure } from "./format";

function echapperCsv(valeur: string): string {
  return `"${valeur.replace(/"/g, '""')}"`;
}

function formaterMontantCsv(montant: number): string {
  return montant.toFixed(2).replace(".", ",");
}

export function genererCsvSoiree(soiree: Soiree, ventesSoiree: Vente[]): string {
  const lignes = [...ventesSoiree].sort((a, b) => a.horodatage - b.horodatage);

  const entetes = ["Heure", "Produits", "Montant (€)", "Paiements"];
  const rangees = lignes.map((v) => {
    const produits = v.lignes.map((l) => `${l.nom} x${l.quantite}`).join(", ");
    const paiements = v.paiements
      .map((p) => `${p.mode}: ${formaterMontantCsv(p.montant)} €`)
      .join(" + ");
    return [
      formaterHeure(v.horodatage),
      produits,
      formaterMontantCsv(v.montantTotal),
      paiements,
    ]
      .map(echapperCsv)
      .join(";");
  });

  const recette = lignes.reduce((t, v) => t + v.montantTotal, 0);
  const rangeeTotal = ["", "TOTAL", formaterMontantCsv(recette), ""]
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

export function telechargerCsvSoiree(soiree: Soiree, ventesSoiree: Vente[]): void {
  const csv = genererCsvSoiree(soiree, ventesSoiree);
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
