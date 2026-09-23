import { LigneVente, Paiement, Produit } from "./types";
import { COLONNE_AUTRES_PRODUITS } from "./export";

const MOIS_FR: Record<string, number> = {
  janvier: 0,
  février: 1,
  mars: 2,
  avril: 3,
  mai: 4,
  juin: 5,
  juillet: 6,
  août: 7,
  septembre: 8,
  octobre: 9,
  novembre: 10,
  décembre: 11,
};

export type VenteImportee = {
  horodatage: number;
  modifieeLe: number | null;
  lignes: LigneVente[];
  montantTotal: number;
  paiements: Paiement[];
};

export type ResultatImport =
  | { ok: true; nomSoiree: string; ventes: VenteImportee[] }
  | { ok: false; erreur: string };

function retirerGuillemets(champ: string): string {
  const t = champ.trim();
  if (t.startsWith('"') && t.endsWith('"')) {
    return t.slice(1, -1).replace(/""/g, '"');
  }
  return t;
}

function parserLigneCsv(ligne: string): string[] {
  return ligne.split(";").map(retirerGuillemets);
}

function parserMontant(texte: string): number {
  return Number(texte.replace(/[^\d,.-]/g, "").replace(",", ".")) || 0;
}

function parserDateTitre(titre: string): { nom: string; jourBase: Date | null } {
  const [nom, dateStr] = titre.split(" — ");
  const m = dateStr?.match(/(\d{1,2})\s+(\S+)\s+(\d{4})/i);
  if (!m) return { nom: nom?.trim() || titre.trim(), jourBase: null };
  const [, jour, moisNom, annee] = m;
  const mois = MOIS_FR[moisNom.toLowerCase()];
  if (mois === undefined) return { nom: nom.trim(), jourBase: null };
  return { nom: nom.trim(), jourBase: new Date(Number(annee), mois, Number(jour)) };
}

function parserHeure(heure: string, jourBase: Date | null): number | null {
  if (!heure.trim()) return null;
  const [h, min] = heure.split(":").map(Number);
  const base = jourBase ? new Date(jourBase) : new Date();
  base.setHours(h || 0, min || 0, 0, 0);
  return base.getTime();
}

function parserAutresProduits(champ: string): LigneVente[] {
  if (!champ.trim()) return [];
  return champ.split(", ").map((item) => {
    const m = item.trim().match(/^(.+)\s+x(\d+)$/);
    const nom = m ? m[1].trim() : item.trim();
    const quantite = m ? Number(m[2]) : 1;
    return {
      produitId: `inconnu-${nom}`,
      nom,
      quantite,
      prixApplique: 0,
    };
  });
}

function parserPaiements(especesChamp: string, cbChamp: string): Paiement[] {
  const paiements: Paiement[] = [];
  const especes = parserMontant(especesChamp);
  const cb = parserMontant(cbChamp);
  if (especes > 0) paiements.push({ id: `import-${Date.now()}-0`, mode: "Espèces", montant: especes });
  if (cb > 0) paiements.push({ id: `import-${Date.now()}-1`, mode: "CB", montant: cb });
  return paiements;
}

export function parserCsvSoiree(texte: string, produitsActuels: Produit[]): ResultatImport {
  const contenu = texte.replace(/^﻿/, "");
  const lignes = contenu.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lignes.length < 2) {
    return { ok: false, erreur: "Le fichier est vide ou incomplet." };
  }

  const [titreLigne, enteteLigne, ...reste] = lignes;
  const [titreBrut] = parserLigneCsv(titreLigne);
  const { nom, jourBase } = parserDateTitre(titreBrut);

  const entete = parserLigneCsv(enteteLigne);
  if (entete[0] !== "Heure commande") {
    return {
      ok: false,
      erreur: "Ce fichier ne ressemble pas à un export de ventes de cette application.",
    };
  }

  const indexAutres = entete.indexOf(COLONNE_AUTRES_PRODUITS);
  if (indexAutres === -1) {
    return {
      ok: false,
      erreur: "Ce fichier ne ressemble pas à un export de ventes de cette application.",
    };
  }
  const colonnesProduits = entete.slice(2, indexAutres).map((nomProduit, i) => ({
    index: 2 + i,
    produit: produitsActuels.find((p) => p.nom === nomProduit) ?? null,
    nom: nomProduit,
  }));
  const indexMontant = indexAutres + 1;
  const indexEspeces = indexAutres + 3;
  const indexCb = indexAutres + 4;

  const ventes: VenteImportee[] = [];
  for (const ligne of reste) {
    const champs = parserLigneCsv(ligne);
    const heureCommande = champs[0];
    const heureModification = champs[1];
    const montantChamp = champs[indexMontant];
    if (!heureCommande || champs[indexAutres] === "TOTAL") continue;

    const horodatage = parserHeure(heureCommande, jourBase);
    if (horodatage === null) continue;

    const lignesProduits: LigneVente[] = [];
    for (const colonne of colonnesProduits) {
      const quantite = Number(champs[colonne.index]);
      if (!quantite) continue;
      lignesProduits.push({
        produitId: colonne.produit?.id ?? `inconnu-${colonne.nom}`,
        nom: colonne.produit?.nom ?? colonne.nom,
        quantite,
        prixApplique: colonne.produit?.prix ?? 0,
      });
    }
    lignesProduits.push(...parserAutresProduits(champs[indexAutres]));

    ventes.push({
      horodatage,
      modifieeLe: parserHeure(heureModification ?? "", jourBase),
      lignes: lignesProduits,
      montantTotal: parserMontant(montantChamp),
      paiements: parserPaiements(champs[indexEspeces], champs[indexCb]),
    });
  }

  if (ventes.length === 0) {
    return { ok: false, erreur: "Aucune vente trouvée dans ce fichier." };
  }

  return { ok: true, nomSoiree: nom, ventes };
}
