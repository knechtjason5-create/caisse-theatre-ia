export type Categorie = "Bières" | "Vins" | "Softs";

export type Produit = {
  id: string;
  nom: string;
  categorie: Categorie;
  prix: number; // euros
  visible: boolean;
};

export type ArticlePanier = {
  produitId: string;
  quantite: number;
};

export type ModePaiement = "CB" | "Espèces";

export type Paiement = {
  id: string;
  mode: ModePaiement;
  montant: number;
};

export type LigneVente = {
  produitId: string;
  nom: string; // snapshot du nom au moment de la vente
  quantite: number;
  prixApplique: number;
};

export type Vente = {
  id: string;
  soireeId: string;
  horodatage: number;
  modifieeLe: number | null;
  lignes: LigneVente[];
  montantTotal: number;
  paiements: Paiement[];
};

export type Soiree = {
  id: string;
  nom: string;
  ouverteLe: number;
  cloturéeLe: number | null;
};
