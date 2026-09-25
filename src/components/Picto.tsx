import { Categorie } from "@/lib/types";

/**
 * Pictos au trait fin repris de la carte des boissons imprimée : chope, verres qui trinquent, cocktail.
 * Couleur héritée du texte (currentColor), pour suivre le thème.
 */
export function PictoCategorie({ categorie, className = "" }: { categorie: Categorie; className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      {categorie === "Bières" && (
        <>
          {/* mousse */}
          <path d="M11 15.5c-2.2 0-3.5-1.6-3.5-3.4 0-2 1.6-3.4 3.5-3.4.5-2.4 2.6-4 5-4 1.8 0 3.3.9 4.2 2.2A4.6 4.6 0 0 1 27.8 9c2.2 0 3.7 1.5 3.7 3.3S30 15.5 28 15.5" />
          {/* chope */}
          <path d="M9.5 15.5V41a1.5 1.5 0 0 0 1.5 1.5h16.5A1.5 1.5 0 0 0 29 41V15.5" />
          <path d="M29 20h4.5a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3H29" />
          <path d="M15 21v16M19.5 21v16M24 21v16" />
          {/* trait circuit */}
          <path d="M36.5 27.5h4V17" />
          <circle cx="40.5" cy="15.5" r="1.3" fill="currentColor" stroke="none" />
          <path d="M6 42.5h28" />
        </>
      )}
      {categorie === "Vins" && (
        <>
          {/* verre gauche, penché */}
          <path d="M10.5 8.5 7.8 18.6a6.4 6.4 0 0 0 4.6 7.8l.9.2a6.4 6.4 0 0 0 7.8-4.6L23.8 12z" />
          <path d="M8.6 16.8c3.8 1.5 8.3 2.4 12.4 3" />
          <path d="m16.9 26.8-3.4 12.8M9.2 38.2l8.7 2.3" />
          {/* verre droit, penché */}
          <path d="m37.5 8.5 2.7 10.1a6.4 6.4 0 0 1-4.6 7.8l-.9.2a6.4 6.4 0 0 1-7.8-4.6L24.2 12z" />
          <path d="M39.4 16.8c-3.8 1.5-8.3 2.4-12.4 3" />
          <path d="m31.1 26.8 3.4 12.8M38.8 38.2l-8.7 2.3" />
          {/* tintement */}
          <path d="M24 3.5v3M19.5 5l1.4 2.4M28.5 5l-1.4 2.4" />
        </>
      )}
      {categorie === "Softs" && (
        <>
          {/* paille */}
          <path d="m15 4.5 7.5 5.5V22" />
          {/* rondelle de citron */}
          <circle cx="33" cy="14" r="4.5" />
          <path d="M33 9.5v9M28.5 14h9M29.8 10.8l6.4 6.4M36.2 10.8l-6.4 6.4" />
          {/* verre */}
          <path d="M13 18h19l-2.4 24.5H15.4z" />
          <path d="M14 26h17" />
          {/* glaçons */}
          <rect x="17.5" y="29" width="4" height="4" rx=".6" transform="rotate(-12 19.5 31)" />
          <rect x="23" y="33.5" width="4" height="4" rx=".6" transform="rotate(10 25 35.5)" />
          {/* trait circuit */}
          <path d="M9.5 24v12.5H13" />
          <circle cx="9.5" cy="22.5" r="1.3" fill="currentColor" stroke="none" />
        </>
      )}
    </svg>
  );
}

/**
 * Traits « circuit » du masque et des coins de la carte imprimée, pour orner un angle.
 * `coin` choisit l'angle ; la taille suit className (h-/w-).
 */
export function Circuit({
  coin = "haut-gauche",
  className = "",
}: {
  coin?: "haut-gauche" | "bas-droite";
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      aria-hidden
      className={className}
      style={coin === "bas-droite" ? { transform: "rotate(180deg)" } : undefined}
    >
      <path d="M4 26V14l10-10h12" />
      <path d="M9 36V20l6-6" />
      <circle cx="27.5" cy="4" r="1.6" />
      <circle cx="9" cy="37.5" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="16" cy="13" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}
