"use client";

import { useEffect, useRef } from "react";
import { useCaisse } from "./store";
import { supabase } from "./supabase";

/**
 * Charge les données depuis Supabase au montage, puis se tient à jour en écoutant
 * les changements faits par les autres appareils (vente, carte, soirées).
 */
export function useSupabaseSync(): { pret: boolean; erreur: string | null } {
  const chargerDonnees = useCaisse((e) => e.chargerDonnees);
  const pret = useCaisse((e) => e.pret);
  const erreur = useCaisse((e) => e.erreur);
  const delaiRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    chargerDonnees();
    if (!supabase) return;

    const rafraichir = () => {
      if (delaiRef.current) clearTimeout(delaiRef.current);
      delaiRef.current = setTimeout(() => {
        chargerDonnees();
      }, 600);
    };

    const canal = supabase
      .channel("caisse-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "produits" }, rafraichir)
      .on("postgres_changes", { event: "*", schema: "public", table: "soirees" }, rafraichir)
      .on("postgres_changes", { event: "*", schema: "public", table: "ventes" }, rafraichir)
      .on("postgres_changes", { event: "*", schema: "public", table: "lignes_vente" }, rafraichir)
      .on("postgres_changes", { event: "*", schema: "public", table: "paiements" }, rafraichir)
      .subscribe();

    return () => {
      if (delaiRef.current) clearTimeout(delaiRef.current);
      supabase!.removeChannel(canal);
    };
  }, [chargerDonnees]);

  return { pret, erreur };
}
