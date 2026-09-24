import { create } from "zustand";
import { supabase } from "./supabase";
import { PRODUITS_INITIAUX } from "./seed";
import {
  ArticlePanier,
  Categorie,
  LigneVente,
  Paiement,
  Produit,
  Soiree,
  Vente,
} from "./types";
import { VenteImportee } from "./import";

function genererId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/** Ventes créées sur cet appareil : permet de reconnaître celles qui arrivent d'un autre appareil. */
const ventesLocales = new Set<string>();

export function estVenteLocale(venteId: string): boolean {
  return ventesLocales.has(venteId);
}

function signalerErreur(contexte: string, error: { message: string } | null): void {
  if (!error) return;
  if (typeof window !== "undefined") {
    alert(`${contexte} : ${error.message}\nVérifiez la connexion internet.`);
  }
}

type LigneVenteRow = {
  id: string;
  vente_id: string;
  produit_id: string;
  nom: string;
  quantite: number;
  prix_applique: number;
};
type PaiementRow = { id: string; vente_id: string; mode: string; montant: number };
type VenteRow = {
  id: string;
  soiree_id: string;
  horodatage: number;
  modifiee_le: number | null;
  montant_total: number;
  lignes_vente: LigneVenteRow[] | null;
  paiements: PaiementRow[] | null;
};

function venteDepuisRow(row: VenteRow): Vente {
  return {
    id: row.id,
    soireeId: row.soiree_id,
    horodatage: Number(row.horodatage),
    modifieeLe: row.modifiee_le === null || row.modifiee_le === undefined ? null : Number(row.modifiee_le),
    montantTotal: Number(row.montant_total),
    lignes: (row.lignes_vente ?? []).map((l) => ({
      produitId: l.produit_id,
      nom: l.nom,
      quantite: l.quantite,
      prixApplique: Number(l.prix_applique),
    })),
    paiements: (row.paiements ?? []).map((p) => ({
      id: p.id,
      mode: p.mode as Paiement["mode"],
      montant: Number(p.montant),
    })),
  };
}

type Etat = {
  produits: Produit[];
  soirees: Soiree[];
  ventes: Vente[];
  panier: ArticlePanier[];

  // synchronisation
  pret: boolean;
  erreur: string | null;
  chargerDonnees: () => Promise<void>;

  // panier
  ajouterAuPanier: (produitId: string, delta: number) => void;
  quantiteDansPanier: (produitId: string) => number;
  totalPanier: () => number;
  viderPanier: () => void;

  // vente
  validerVente: (paiements: Paiement[]) => void;
  supprimerVente: (venteId: string) => void;
  modifierVente: (venteId: string, lignes: LigneVente[], paiements: Paiement[]) => void;
  importerVentes: (nomSoiree: string, ventes: VenteImportee[]) => { nombreImportees: number; nombreIgnorees: number };

  // soirées
  ouvrirSoiree: (nom: string) => void;
  cloturerSoiree: () => void;
  soireeActive: () => Soiree | null;

  // carte
  ajouterProduit: (produit: Omit<Produit, "id">) => void;
  modifierProduit: (produitId: string, patch: Partial<Omit<Produit, "id">>) => void;
  synchroniserProduit: (produitId: string) => void;
  supprimerProduit: (produitId: string) => void;
};

export const CATEGORIES: Categorie[] = ["Bières", "Vins", "Softs"];

export const useCaisse = create<Etat>()((set, get) => ({
  produits: PRODUITS_INITIAUX,
  soirees: [],
  ventes: [],
  panier: [],
  pret: false,
  erreur: null,

  chargerDonnees: async () => {
    if (!supabase) {
      set({
        pret: true,
        erreur:
          "Configuration manquante : NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY doivent être renseignées.",
      });
      return;
    }
    try {
      const [produitsRes, soireesRes, ventesRes] = await Promise.all([
        supabase.from("produits").select("*"),
        supabase.from("soirees").select("*"),
        supabase.from("ventes").select("*, lignes_vente(*), paiements(*)"),
      ]);
      if (produitsRes.error) throw produitsRes.error;
      if (soireesRes.error) throw soireesRes.error;
      if (ventesRes.error) throw ventesRes.error;

      const produits: Produit[] = (produitsRes.data ?? []).map((p) => ({
        id: p.id,
        nom: p.nom,
        categorie: p.categorie as Categorie,
        prix: Number(p.prix),
        visible: p.visible,
      }));
      const soirees: Soiree[] = (soireesRes.data ?? []).map((s) => ({
        id: s.id,
        nom: s.nom,
        ouverteLe: Number(s.ouverte_le),
        cloturéeLe: s.cloturee_le === null ? null : Number(s.cloturee_le),
      }));
      const ventes: Vente[] = (ventesRes.data ?? []).map((v) => venteDepuisRow(v as VenteRow));

      set({ produits, soirees, ventes, pret: true, erreur: null });
    } catch (err) {
      set({
        pret: true,
        erreur: err instanceof Error ? err.message : "Erreur de connexion à la base en ligne.",
      });
    }
  },

  ajouterAuPanier: (produitId, delta) => {
    set((etat) => {
      const existant = etat.panier.find((a) => a.produitId === produitId);
      const produit = etat.produits.find((p) => p.id === produitId);
      if (!produit) return etat;
      const quantiteActuelle = existant?.quantite ?? 0;
      const nouvelleQuantite = Math.max(0, quantiteActuelle + delta);
      const panierSansCeProduit = etat.panier.filter((a) => a.produitId !== produitId);
      if (nouvelleQuantite === 0) {
        return { panier: panierSansCeProduit };
      }
      return {
        panier: [...panierSansCeProduit, { produitId, quantite: nouvelleQuantite }],
      };
    });
  },

  quantiteDansPanier: (produitId) => {
    return get().panier.find((a) => a.produitId === produitId)?.quantite ?? 0;
  },

  totalPanier: () => {
    const { panier, produits } = get();
    return panier.reduce((total, article) => {
      const produit = produits.find((p) => p.id === article.produitId);
      return total + (produit?.prix ?? 0) * article.quantite;
    }, 0);
  },

  viderPanier: () => set({ panier: [] }),

  validerVente: (paiements) => {
    const { panier, produits } = get();
    const soiree = get().soireeActive();
    if (panier.length === 0 || !soiree) return;

    const lignes: LigneVente[] = panier.map((article) => {
      const produit = produits.find((p) => p.id === article.produitId)!;
      return {
        produitId: produit.id,
        nom: produit.nom,
        quantite: article.quantite,
        prixApplique: produit.prix,
      };
    });

    const montantTotal = lignes.reduce((t, l) => t + l.prixApplique * l.quantite, 0);

    const vente: Vente = {
      id: genererId(),
      soireeId: soiree.id,
      horodatage: Date.now(),
      modifieeLe: null,
      lignes,
      montantTotal,
      paiements,
    };

    ventesLocales.add(vente.id);
    set((etat) => ({
      ventes: [...etat.ventes, vente],
      panier: [],
    }));

    if (supabase) {
      (async () => {
        const { error: eVente } = await supabase!.from("ventes").insert({
          id: vente.id,
          soiree_id: vente.soireeId,
          horodatage: vente.horodatage,
          montant_total: vente.montantTotal,
        });
        if (eVente) return signalerErreur("Vente non synchronisée", eVente);

        if (vente.lignes.length > 0) {
          const { error: eLignes } = await supabase!.from("lignes_vente").insert(
            vente.lignes.map((l) => ({
              id: genererId(),
              vente_id: vente.id,
              produit_id: l.produitId,
              nom: l.nom,
              quantite: l.quantite,
              prix_applique: l.prixApplique,
            }))
          );
          if (eLignes) signalerErreur("Détail de vente non synchronisé", eLignes);
        }

        if (vente.paiements.length > 0) {
          const { error: ePaiements } = await supabase!.from("paiements").insert(
            vente.paiements.map((p) => ({
              id: p.id,
              vente_id: vente.id,
              mode: p.mode,
              montant: p.montant,
            }))
          );
          if (ePaiements) signalerErreur("Paiement non synchronisé", ePaiements);
        }
      })();
    }
  },

  supprimerVente: (venteId) => {
    set((etat) => ({
      ventes: etat.ventes.filter((v) => v.id !== venteId),
    }));
    if (supabase) {
      supabase
        .from("ventes")
        .delete()
        .eq("id", venteId)
        .then(({ error }) => signalerErreur("Suppression non synchronisée", error));
    }
  },

  modifierVente: (venteId, lignes, paiements) => {
    const montantTotal = lignes.reduce((t, l) => t + l.prixApplique * l.quantite, 0);
    const modifieeLe = Date.now();
    set((etat) => ({
      ventes: etat.ventes.map((v) =>
        v.id === venteId ? { ...v, lignes, paiements, montantTotal, modifieeLe } : v
      ),
    }));

    if (supabase) {
      (async () => {
        try {
          const { error: eVente } = await supabase!
            .from("ventes")
            .update({ montant_total: montantTotal, modifiee_le: modifieeLe })
            .eq("id", venteId);
          if (eVente) throw eVente;

          const { error: eDelLignes } = await supabase!
            .from("lignes_vente")
            .delete()
            .eq("vente_id", venteId);
          if (eDelLignes) throw eDelLignes;

          if (lignes.length > 0) {
            const { error: eLignes } = await supabase!.from("lignes_vente").insert(
              lignes.map((l) => ({
                id: genererId(),
                vente_id: venteId,
                produit_id: l.produitId,
                nom: l.nom,
                quantite: l.quantite,
                prix_applique: l.prixApplique,
              }))
            );
            if (eLignes) throw eLignes;
          }

          const { error: eDelPaiements } = await supabase!
            .from("paiements")
            .delete()
            .eq("vente_id", venteId);
          if (eDelPaiements) throw eDelPaiements;

          if (paiements.length > 0) {
            const { error: ePaiements } = await supabase!.from("paiements").insert(
              paiements.map((p) => ({
                id: p.id,
                vente_id: venteId,
                mode: p.mode,
                montant: p.montant,
              }))
            );
            if (ePaiements) throw ePaiements;
          }
        } catch (err) {
          signalerErreur(
            "Modification non synchronisée",
            err instanceof Error ? { message: err.message } : { message: String(err) }
          );
        }
      })();
    }
  },

  importerVentes: (nomSoiree, ventesImportees) => {
    const { soirees, ventes } = get();
    let soiree = soirees.find((s) => s.nom === nomSoiree);
    const soireeEstNouvelle = !soiree;

    const horodatages = ventesImportees.map((v) => v.horodatage);
    const plusAncienne = Math.min(...horodatages);

    if (!soiree) {
      soiree = {
        id: genererId(),
        nom: nomSoiree,
        ouverteLe: plusAncienne,
        cloturéeLe: null,
      };
    }

    const existantes = new Set(
      ventes
        .filter((v) => v.soireeId === soiree!.id)
        .map((v) => `${v.horodatage}-${v.montantTotal}`)
    );

    const aAjouter = ventesImportees.filter(
      (v) => !existantes.has(`${v.horodatage}-${v.montantTotal}`)
    );

    const nouvellesVentes: Vente[] = aAjouter.map((v) => ({
      id: genererId(),
      soireeId: soiree!.id,
      horodatage: v.horodatage,
      modifieeLe: v.modifieeLe,
      lignes: v.lignes,
      montantTotal: v.montantTotal,
      paiements: v.paiements,
    }));

    nouvellesVentes.forEach((v) => ventesLocales.add(v.id));
    set((etat) => ({
      soirees: etat.soirees.some((s) => s.id === soiree!.id) ? etat.soirees : [...etat.soirees, soiree!],
      ventes: [...etat.ventes, ...nouvellesVentes],
    }));

    if (supabase) {
      (async () => {
        try {
          if (soireeEstNouvelle) {
            const { error } = await supabase!.from("soirees").insert({
              id: soiree!.id,
              nom: soiree!.nom,
              ouverte_le: soiree!.ouverteLe,
              cloturee_le: null,
            });
            if (error) throw error;
          }
          for (const v of nouvellesVentes) {
            const { error: eVente } = await supabase!.from("ventes").insert({
              id: v.id,
              soiree_id: v.soireeId,
              horodatage: v.horodatage,
              modifiee_le: v.modifieeLe,
              montant_total: v.montantTotal,
            });
            if (eVente) throw eVente;

            if (v.lignes.length > 0) {
              const { error: eLignes } = await supabase!.from("lignes_vente").insert(
                v.lignes.map((l) => ({
                  id: genererId(),
                  vente_id: v.id,
                  produit_id: l.produitId,
                  nom: l.nom,
                  quantite: l.quantite,
                  prix_applique: l.prixApplique,
                }))
              );
              if (eLignes) throw eLignes;
            }

            if (v.paiements.length > 0) {
              const { error: ePaiements } = await supabase!.from("paiements").insert(
                v.paiements.map((p) => ({
                  id: p.id,
                  vente_id: v.id,
                  mode: p.mode,
                  montant: p.montant,
                }))
              );
              if (ePaiements) throw ePaiements;
            }
          }
        } catch (err) {
          signalerErreur(
            "Import non synchronisé en ligne",
            err instanceof Error ? { message: err.message } : { message: String(err) }
          );
        }
      })();
    }

    return {
      nombreImportees: nouvellesVentes.length,
      nombreIgnorees: ventesImportees.length - nouvellesVentes.length,
    };
  },

  ouvrirSoiree: (nom) => {
    const soiree: Soiree = {
      id: genererId(),
      nom,
      ouverteLe: Date.now(),
      cloturéeLe: null,
    };
    set((etat) => ({
      soirees: [...etat.soirees, soiree],
    }));
    if (supabase) {
      supabase
        .from("soirees")
        .insert({ id: soiree.id, nom: soiree.nom, ouverte_le: soiree.ouverteLe, cloturee_le: null })
        .then(({ error }) => signalerErreur("Ouverture de soirée non synchronisée", error));
    }
  },

  cloturerSoiree: () => {
    const soiree = get().soireeActive();
    if (!soiree) return;
    const cloturéeLe = Date.now();
    set((etat) => ({
      soirees: etat.soirees.map((s) => (s.id === soiree.id ? { ...s, cloturéeLe } : s)),
    }));
    if (supabase) {
      supabase
        .from("soirees")
        .update({ cloturee_le: cloturéeLe })
        .eq("id", soiree.id)
        .then(({ error }) => signalerErreur("Clôture non synchronisée", error));
    }
  },

  soireeActive: () => {
    return get().soirees.find((s) => s.cloturéeLe === null) ?? null;
  },

  ajouterProduit: (produit) => {
    const id = genererId();
    set((etat) => ({
      produits: [...etat.produits, { ...produit, id }],
    }));
    if (supabase) {
      supabase
        .from("produits")
        .insert({ id, nom: produit.nom, categorie: produit.categorie, prix: produit.prix, visible: produit.visible })
        .then(({ error }) => signalerErreur("Produit non synchronisé", error));
    }
  },

  modifierProduit: (produitId, patch) => {
    set((etat) => ({
      produits: etat.produits.map((p) => (p.id === produitId ? { ...p, ...patch } : p)),
    }));
  },

  synchroniserProduit: (produitId) => {
    if (!supabase) return;
    const produit = get().produits.find((p) => p.id === produitId);
    if (!produit) return;
    supabase
      .from("produits")
      .update({ nom: produit.nom, categorie: produit.categorie, prix: produit.prix, visible: produit.visible })
      .eq("id", produitId)
      .then(({ error }) => signalerErreur(`« ${produit.nom} » non synchronisé`, error));
  },

  supprimerProduit: (produitId) => {
    set((etat) => ({
      produits: etat.produits.filter((p) => p.id !== produitId),
    }));
    if (supabase) {
      supabase
        .from("produits")
        .delete()
        .eq("id", produitId)
        .then(({ error }) => signalerErreur("Suppression du produit non synchronisée", error));
    }
  },
}));
