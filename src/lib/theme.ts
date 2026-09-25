"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { CLE_THEME, HEURE_MATIN, HEURE_SOIR } from "./themeScript";

/**
 * Thème de l'app : clair, Salle noire (sombre noir et or) ou automatique.
 * En automatique, la Salle noire s'allume le soir (19 h – 7 h) ou si l'appareil est déjà en sombre.
 * Le choix est propre à chaque appareil (localStorage) ; l'app s'affiche correctement sans lui.
 */
export type ChoixTheme = "auto" | "clair" | "noire";

const CLE = CLE_THEME;

function lireChoix(): ChoixTheme {
  try {
    const c = localStorage.getItem(CLE);
    return c === "clair" || c === "noire" ? c : "auto";
  } catch {
    return "auto";
  }
}

function resoudre(choix: ChoixTheme): "noire" | "claire" {
  if (choix === "noire") return "noire";
  if (choix === "clair") return "claire";
  const h = new Date().getHours();
  const soir = h >= HEURE_SOIR || h < HEURE_MATIN;
  const sys = !!window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  return soir || sys ? "noire" : "claire";
}

function appliquer(choix: ChoixTheme): void {
  document.documentElement.setAttribute("data-salle", resoudre(choix));
}

export const useTheme = create<{ choix: ChoixTheme; lu: boolean; changer: (c: ChoixTheme) => void }>()((set) => ({
  choix: "auto",
  /** Faux tant que le choix enregistré n'a pas été lu : le script de <head> fait foi jusque-là. */
  lu: false,
  changer: (c) => {
    try {
      localStorage.setItem(CLE, c);
    } catch {
      // stockage indisponible : le choix vaut pour cette visite seulement
    }
    set({ choix: c });
  },
}));

/** Monté une fois (page.tsx) : lit le choix enregistré, l'applique et, en automatique, le réévalue chaque minute. */
export function useAppliquerTheme(): void {
  const choix = useTheme((e) => e.choix);
  const lu = useTheme((e) => e.lu);

  useEffect(() => {
    // localStorage n'existe qu'au navigateur : lecture après montage.
    useTheme.setState({ choix: lireChoix(), lu: true });
  }, []);

  useEffect(() => {
    if (!lu) return;
    appliquer(choix);
    if (choix !== "auto") return;
    const t = setInterval(() => appliquer("auto"), 60_000);
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    const surChangement = () => appliquer("auto");
    media?.addEventListener?.("change", surChangement);
    return () => {
      clearInterval(t);
      media?.removeEventListener?.("change", surChangement);
    };
  }, [choix, lu]);
}
