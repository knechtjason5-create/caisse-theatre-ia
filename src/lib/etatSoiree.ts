"use client";

import { useMemo } from "react";
import { useCaisse } from "./store";

export type EtatSync = "repetition" | "horsligne" | "echec" | "envoi" | "connexion" | "ok";

/** Couleur et libellé de la pastille de connexion, du plus grave au plus rassurant. */
export const ETATS_SYNC: Record<EtatSync, { couleur: string; libelle: string; detail: string }> = {
  repetition: { couleur: "var(--or)", libelle: "Répétition", detail: "Entraînement : rien n’est envoyé." },
  horsligne: {
    couleur: "var(--danger)",
    libelle: "Hors ligne",
    detail: "Pas d’internet : les ventes ne sont pas enregistrées en ligne.",
  },
  echec: {
    couleur: "var(--danger)",
    libelle: "Envoi échoué",
    detail: "Une écriture n’est pas passée : vérifiez le bandeau d’erreur.",
  },
  envoi: { couleur: "var(--or)", libelle: "Envoi…", detail: "Les dernières ventes partent vers la base." },
  connexion: { couleur: "var(--or)", libelle: "Connexion…", detail: "Connexion au temps réel en cours." },
  ok: { couleur: "var(--succes)", libelle: "Synchronisé", detail: "Tout est enregistré et partagé en direct." },
};

export function useEtatSync(): EtatSync {
  return useCaisse((e) => {
    if (e.repetition) return "repetition";
    if (!e.enLigne) return "horsligne";
    if (e.echecSync) return "echec";
    if (e.ecrituresEnCours > 0) return "envoi";
    if (!e.canalOk) return "connexion";
    return "ok";
  });
}

/** Chiffres de la soirée en cours : recette, nombre de ventes, part espèces / carte. */
export function useChiffresSoiree() {
  const soiree = useCaisse((e) => e.soireeActive());
  const ventes = useCaisse((e) => e.ventes);
  return useMemo(() => {
    const siennes = soiree ? ventes.filter((v) => v.soireeId === soiree.id) : [];
    const paiements = siennes.flatMap((v) => v.paiements);
    return {
      recette: siennes.reduce((t, v) => t + v.montantTotal, 0),
      nombreVentes: siennes.length,
      especes: paiements.filter((p) => p.mode === "Espèces").reduce((t, p) => t + p.montant, 0),
      cb: paiements.filter((p) => p.mode === "CB").reduce((t, p) => t + p.montant, 0),
    };
  }, [soiree, ventes]);
}
