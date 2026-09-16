import { LigneVente, Paiement, ModePaiement, Produit } from "./types";

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

function parserProduits(champ: string, produitsActuels: Produit[]): LigneVente[] {
  if (!champ.trim()) return [];
  return champ.split(", ").map((item) => {
    const m = item.trim().match(/^(.+)\s+x(\d+)$/);
    const nom = m ? m[1].trim() : item.trim();
    const quantite = m ? Number(m[2]) : 1;
    const produit = produitsActuels.find((p) => p.nom === nom);
    return {
      produitId: produit?.id ?? `inconnu-${nom}`,
      nom,
      quantite,
      prixApplique: produit?.prix ?? 0,
    };
  });
}

function parserPaiements(champ: string): Paiement[] {
  if (!champ.trim()) return [];
  return champ.split(" + ").map((part, i) => {
    const m = part.trim().match(/^(.+):\s*([\d,.-]+)\s*€?$/);
    const mode = (m ? m[1].trim() : part.trim()) as ModePaiement;
    const montant = m ? parserMontant(m[2]) : 0;
    return { id: `import-${Date.now()}-${i}`, mode, montant };
  });
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
  if (entete[0] !== "Heure" || entete[1] !== "Produits") {
    return {
      ok: false,
      erreur: "Ce fichier ne ressemble pas à un export de ventes de cette application.",
    };
  }

  const ventes: VenteImportee[] = [];
  for (const ligne of reste) {
    const [heure, produitsChamp, montantChamp, paiementsChamp] = parserLigneCsv(ligne);
    if (produitsChamp === "TOTAL" || !heure) continue;

    const [h, min] = heure.split(":").map(Number);
    const base = jourBase ? new Date(jourBase) : new Date();
    base.setHours(h || 0, min || 0, 0, 0);

    ventes.push({
      horodatage: base.getTime(),
      lignes: parserProduits(produitsChamp, produitsActuels),
      montantTotal: parserMontant(montantChamp),
      paiements: parserPaiements(paiementsChamp),
    });
  }

  if (ventes.length === 0) {
    return { ok: false, erreur: "Aucune vente trouvée dans ce fichier." };
  }

  return { ok: true, nomSoiree: nom, ventes };
}
