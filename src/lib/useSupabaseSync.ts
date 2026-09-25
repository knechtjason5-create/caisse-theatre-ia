"use client";

import { useEffect, useRef } from "react";
import { Present, useCaisse } from "./store";
import { supabase } from "./supabase";
import { idAppareil, usePrenom } from "./appareil";

/**
 * Charge les données depuis Supabase au montage, puis se tient à jour en écoutant
 * les changements faits par les autres appareils (vente, carte, soirées).
 * Ne démarre qu'une fois la session déverrouillée (`actif`) : avant, la base ne renvoie rien.
 * Renseigne aussi l'état de connexion (en ligne, canal ouvert) et les appareils présents,
 * affichés par la pastille de l'en-tête.
 */
export function useSupabaseSync(actif: boolean): { pret: boolean; erreur: string | null } {
  const chargerDonnees = useCaisse((e) => e.chargerDonnees);
  const pret = useCaisse((e) => e.pret);
  const erreur = useCaisse((e) => e.erreur);
  const prenom = usePrenom((e) => e.prenom);
  const prenomLu = usePrenom((e) => e.lu);
  const delaiRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canalRef = useRef<ReturnType<NonNullable<typeof supabase>["channel"]> | null>(null);

  useEffect(() => {
    usePrenom.getState().charger();
    const majReseau = () => {
      useCaisse.setState({ enLigne: navigator.onLine });
      // Retour du réseau : on relit tout, des ventes ont pu être faites ailleurs entre-temps.
      if (navigator.onLine && actif) chargerDonnees();
    };
    useCaisse.setState({ enLigne: navigator.onLine });
    window.addEventListener("online", majReseau);
    window.addEventListener("offline", majReseau);
    return () => {
      window.removeEventListener("online", majReseau);
      window.removeEventListener("offline", majReseau);
    };
  }, [actif, chargerDonnees]);

  useEffect(() => {
    if (!actif) return;
    chargerDonnees();
    if (!supabase) return;

    const rafraichir = () => {
      if (delaiRef.current) clearTimeout(delaiRef.current);
      delaiRef.current = setTimeout(() => {
        chargerDonnees();
      }, 600);
    };

    const appareil = idAppareil();
    const canal = supabase
      .channel("caisse-sync", { config: { presence: { key: appareil } } })
      .on("postgres_changes", { event: "*", schema: "public", table: "produits" }, rafraichir)
      .on("postgres_changes", { event: "*", schema: "public", table: "soirees" }, rafraichir)
      .on("postgres_changes", { event: "*", schema: "public", table: "ventes" }, rafraichir)
      .on("postgres_changes", { event: "*", schema: "public", table: "lignes_vente" }, rafraichir)
      .on("postgres_changes", { event: "*", schema: "public", table: "paiements" }, rafraichir)
      .on("presence", { event: "sync" }, () => {
        const etat = canal.presenceState<{ prenom?: string }>();
        const presents: Present[] = Object.entries(etat).map(([cle, metas]) => ({
          appareil: cle,
          prenom: metas[metas.length - 1]?.prenom ?? "",
        }));
        useCaisse.setState({ presents });
      })
      .subscribe((statut) => {
        useCaisse.setState({ canalOk: statut === "SUBSCRIBED" });
        if (statut === "SUBSCRIBED") canal.track({ prenom: usePrenom.getState().prenom });
      });
    canalRef.current = canal;

    return () => {
      if (delaiRef.current) clearTimeout(delaiRef.current);
      canalRef.current = null;
      useCaisse.setState({ canalOk: false, presents: [] });
      supabase!.removeChannel(canal);
    };
  }, [actif, chargerDonnees]);

  // Le prénom change dans le menu : les collègues voient la nouvelle initiale.
  useEffect(() => {
    if (!prenomLu || !canalRef.current || !useCaisse.getState().canalOk) return;
    canalRef.current.track({ prenom });
  }, [prenom, prenomLu]);

  return { pret, erreur };
}
