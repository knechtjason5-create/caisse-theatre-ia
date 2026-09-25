"use client";

import { create } from "zustand";

/**
 * Identité légère de cet appareil, pour la présence des collègues dans l'en-tête :
 * un identifiant tiré au hasard et un prénom facultatif, gardés dans localStorage.
 * Tout marche sans (navigation privée) : l'appareil reste alors anonyme.
 */
const CLE_ID = "caisse-appareil";
const CLE_PRENOM = "caisse-prenom";

function lire(cle: string): string | null {
  try {
    return localStorage.getItem(cle);
  } catch {
    return null;
  }
}

function ecrire(cle: string, valeur: string): void {
  try {
    localStorage.setItem(cle, valeur);
  } catch {
    // stockage indisponible : la valeur vaut pour cette visite seulement
  }
}

export function idAppareil(): string {
  let id = lire(CLE_ID);
  if (!id) {
    id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    ecrire(CLE_ID, id);
  }
  return id;
}

export const usePrenom = create<{ prenom: string; lu: boolean; changer: (p: string) => void; charger: () => void }>()(
  (set) => ({
    prenom: "",
    lu: false,
    changer: (p) => {
      const propre = p.trim().slice(0, 20);
      ecrire(CLE_PRENOM, propre);
      set({ prenom: propre });
    },
    charger: () => set({ prenom: lire(CLE_PRENOM) ?? "", lu: true }),
  })
);

/** Initiales affichées dans l'en-tête : « Jason » → « J », « Marie-Anne » → « MA », sans prénom → « · ». */
export function initiales(prenom: string): string {
  const mots = prenom.trim().split(/[\s-]+/).filter(Boolean);
  if (mots.length === 0) return "·";
  return mots
    .slice(0, 2)
    .map((m) => m[0].toUpperCase())
    .join("");
}
