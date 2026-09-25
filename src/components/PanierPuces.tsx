"use client";

import { useEffect, useMemo, useRef } from "react";
import { useCaisse } from "@/lib/store";
import { vibrer } from "@/lib/haptique";

const DELAI_VIDER = 550;

/**
 * Le panier, visible sans quitter la vente : une pastille par boisson, dans l'ordre de la carte.
 * Toucher une pastille retire un verre ; la maintenir retire toute la ligne.
 */
export default function PanierPuces() {
  const panier = useCaisse((e) => e.panier);
  const produits = useCaisse((e) => e.produits);
  const ajouterAuPanier = useCaisse((e) => e.ajouterAuPanier);

  // Ordre stable (celui de la carte) : les pastilles ne sautent pas d'une place à l'autre à chaque ajout.
  const articles = useMemo(
    () =>
      produits
        .map((p) => ({ produit: p, quantite: panier.find((a) => a.produitId === p.id)?.quantite ?? 0 }))
        .filter((a) => a.quantite > 0),
    [panier, produits]
  );

  if (articles.length === 0) return null;

  return (
    <div
      data-no-swipe
      data-visite="panier"
      // Fondu vers le fond : les tuiles qui défilent dessous ne se mêlent pas aux pastilles.
      className="anim-monter fixed inset-x-0 bottom-[8.75rem] z-30 flex gap-1.5 overflow-x-auto bg-gradient-to-t from-bg via-bg/95 to-transparent px-4 pb-2.5 pt-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {articles.map(({ produit, quantite }) => (
        <Puce
          key={produit.id}
          nom={produit.nom}
          quantite={quantite}
          onRetirerUn={() => ajouterAuPanier(produit.id, -1)}
          onRetirerTout={() => ajouterAuPanier(produit.id, -quantite)}
        />
      ))}
    </div>
  );
}

function Puce({
  nom,
  quantite,
  onRetirerUn,
  onRetirerTout,
}: {
  nom: string;
  quantite: number;
  onRetirerUn: () => void;
  onRetirerTout: () => void;
}) {
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aVide = useRef(false);

  const arreter = () => {
    if (minuteur.current) clearTimeout(minuteur.current);
    minuteur.current = null;
  };
  useEffect(
    () => () => {
      if (minuteur.current) clearTimeout(minuteur.current);
    },
    []
  );

  return (
    <button
      aria-label={`Retirer un ${nom} (maintenir pour retirer les ${quantite})`}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        aVide.current = false;
        minuteur.current = setTimeout(() => {
          aVide.current = true;
          vibrer(20);
          onRetirerTout();
        }, DELAI_VIDER);
      }}
      onPointerUp={arreter}
      onPointerLeave={arreter}
      onPointerCancel={arreter}
      onContextMenu={(e) => e.preventDefault()}
      onClick={() => {
        if (aVide.current) {
          aVide.current = false;
          return;
        }
        vibrer(6);
        onRetirerUn();
      }}
      className="flex shrink-0 select-none items-center gap-1.5 rounded-full border border-line bg-surface py-1.5 pl-2 pr-3 text-sm text-ink shadow-sm"
    >
      <span
        key={quantite}
        className="anim-pop flex h-5 min-w-5 items-center justify-center rounded-full bg-or px-1 font-mono text-[11px] font-medium tabular-nums text-white dark:text-sur-choix"
      >
        {quantite}
      </span>
      {nom}
      <span aria-hidden className="text-ink-faint">
        −
      </span>
    </button>
  );
}
