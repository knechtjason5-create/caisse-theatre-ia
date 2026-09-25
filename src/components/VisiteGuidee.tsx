"use client";

import { useEffect, useMemo, useState } from "react";
import { useCaisse } from "@/lib/store";
import { formaterEuros } from "@/lib/format";
import { Circuit } from "./Picto";

type Etape = { cible: string; titre: string; texte: string; attendre?: "panier" };

/** Mêmes pastilles dorées numérotées que le guide PDF : l'app et le guide parlent la même langue. */
const ETAPES: Etape[] = [
  {
    cible: "tuile",
    titre: "Ajouter une boisson",
    texte: "Touchez une boisson pour l’ajouter. En la maintenant, les verres s’ajoutent de plus en plus vite. Essayez !",
    attendre: "panier",
  },
  {
    cible: "panier",
    titre: "Le panier, sous les yeux",
    texte: "Chaque pastille est une boisson du panier. La toucher retire un verre ; la maintenir retire la ligne.",
  },
  {
    cible: "barre",
    titre: "Encaisser en un geste",
    texte:
      "Une seule personne paie ? Espèces ou CB enregistrent la vente directement. Le total ouvre le détail : addition partagée, monnaie à rendre.",
  },
  {
    cible: "pastille",
    titre: "La soirée en un coup d’œil",
    texte:
      "Recette en direct et connexion : vert, tout est enregistré ; or, envoi en cours ; rouge, hors ligne. La toucher ouvre le menu : thème, clôture…",
  },
  {
    cible: "onglets",
    titre: "Carte et historique",
    texte: "Les onglets du bas. On peut aussi balayer l’écran vers la gauche ou la droite.",
  },
];

function useRect(selecteur: string | null): DOMRect | null {
  const [rect, setRect] = useState<DOMRect | null>(null);
  useEffect(() => {
    if (!selecteur) return;
    // La cible peut bouger (animations, défilement) : on la re-mesure régulièrement.
    const mesurer = () => {
      const el = document.querySelector<HTMLElement>(`[data-visite="${selecteur}"]`);
      setRect(el ? el.getBoundingClientRect() : null);
    };
    mesurer();
    const t = setInterval(mesurer, 250);
    window.addEventListener("resize", mesurer);
    return () => {
      clearInterval(t);
      window.removeEventListener("resize", mesurer);
    };
  }, [selecteur]);
  return selecteur ? rect : null;
}

/**
 * Visite guidée d'une minute, dans la caisse de répétition : cinq repères sur l'écran de vente,
 * puis un exercice d'encaissement vérifié par l'app.
 */
export default function VisiteGuidee({ onFin, proposer = false }: { onFin: () => void; proposer?: boolean }) {
  const produits = useCaisse((e) => e.produits);
  const ventes = useCaisse((e) => e.ventes);
  const nbArticles = useCaisse((e) => e.panier.reduce((n, a) => n + a.quantite, 0));
  const ajouterAuPanier = useCaisse((e) => e.ajouterAuPanier);
  const viderPanier = useCaisse((e) => e.viderPanier);

  // -1 : proposition ; 0..n-1 : repères ; n : exercice ; n+1 : bravo
  const [etape, setEtape] = useState(proposer ? -1 : 0);
  /** Nombre de ventes déjà examinées par l'exercice. */
  const [ventesVues, setVentesVues] = useState(0);
  const [indice, setIndice] = useState<string | null>(null);
  /** L'énoncé de l'exercice se réduit en une pastille pour laisser voir l'écran d'encaissement. */
  const [reduit, setReduit] = useState(false);

  const exercice = useMemo(() => {
    const visibles = produits.filter((p) => p.visible);
    const produit = visibles.find((p) => p.categorie === "Bières") ?? visibles[0];
    if (!produit) return null;
    const total = produit.prix * 2;
    const billet = total < 20 ? 20 : 50;
    return { produit, total, billet, rendu: billet - total };
  }, [produits]);

  const repere = etape >= 0 && etape < ETAPES.length ? ETAPES[etape] : null;
  const rect = useRect(repere?.cible ?? null);

  const suivante = (depuis: number) => {
    const prochaine = depuis + 1;
    const { panier } = useCaisse.getState();
    // Les repères suivants ont besoin d'un panier : si la première étape a été passée sans rien ajouter.
    if (prochaine === 1 && panier.length === 0 && exercice) ajouterAuPanier(exercice.produit.id, 1);
    // L'exercice part d'un panier vide ; seules les ventes faites ensuite comptent.
    if (prochaine === ETAPES.length) {
      viderPanier();
      setVentesVues(useCaisse.getState().ventes.length);
    }
    setEtape(prochaine);
  };

  // Étape 1 : la visite avance d'elle-même dès qu'une boisson est dans le panier.
  useEffect(() => {
    if (repere?.attendre === "panier" && nbArticles > 0) {
      const t = setTimeout(() => suivante(0), 500);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repere, nbArticles]);

  // Une vente annulée (bandeau « Annuler ») fait baisser le compte : la suivante doit être examinée.
  if (ventes.length < ventesVues) setVentesVues(ventes.length);
  // Exercice : une nouvelle vente vient d'être enregistrée, on la vérifie (pendant le rendu, sans effet).
  if (etape === ETAPES.length && exercice && ventes.length > ventesVues) {
    setVentesVues(ventes.length);
    const derniere = ventes[ventes.length - 1];
    const juste =
      derniere.lignes.length === 1 &&
      derniere.lignes[0].produitId === exercice.produit.id &&
      derniere.lignes[0].quantite === 2;
    if (juste) {
      setIndice(null);
      setEtape(ETAPES.length + 1);
    } else {
      setIndice(`Pas tout à fait : il fallait exactement 2 ${exercice.produit.nom}. Touchez « Annuler » sur le bandeau, puis réessayez.`);
      setReduit(false);
    }
  }

  const passer = () => {
    viderPanier();
    onFin();
  };

  // --- Proposition ---
  if (etape === -1) {
    return (
      <Bulle position={null} numero={null} titre="Faire le tour en une minute ?">
        <p className="text-sm text-ink-soft">
          Cinq repères sur l&rsquo;écran, puis un petit exercice d&rsquo;encaissement. Rien n&rsquo;est enregistré.
        </p>
        <div className="flex gap-2">
          <button onClick={onFin} className="flex-1 rounded-full border border-line px-4 py-2.5 text-sm text-ink-soft">
            Non merci
          </button>
          <button onClick={() => setEtape(0)} className="flex-1 rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-bg">
            C&rsquo;est parti
          </button>
        </div>
      </Bulle>
    );
  }

  // --- Repères ---
  if (repere) {
    return (
      <>
        {rect && (
          <div
            aria-hidden
            className="pointer-events-none fixed z-[61] rounded-2xl border-[2.5px] border-or transition-all duration-200"
            style={{
              left: rect.left - 6,
              top: rect.top - 6,
              width: rect.width + 12,
              height: rect.height + 12,
              boxShadow: "0 0 0 9999px rgba(10, 9, 8, 0.55)",
            }}
          />
        )}
        <Bulle position={rect} numero={etape + 1} titre={repere.titre}>
          <p className="text-sm text-ink-soft">{repere.texte}</p>
          <div className="flex items-center gap-2">
            <span className="mr-auto font-mono text-[11px] text-ink-faint">
              {etape + 1} / {ETAPES.length}
            </span>
            <button onClick={passer} className="rounded-full px-3 py-2 text-sm text-ink-faint">
              Passer
            </button>
            {/* Tant qu'on attend un geste, « Suivant » reste discret : on invite à essayer d'abord. */}
            <button
              onClick={() => suivante(etape)}
              className={`rounded-full px-4 py-2 text-sm ${
                repere.attendre ? "border border-line text-ink-soft" : "bg-ink font-medium text-bg"
              }`}
            >
              Suivant
            </button>
          </div>
        </Bulle>
      </>
    );
  }

  // --- Exercice ---
  if (etape === ETAPES.length && exercice) {
    if (reduit) {
      return (
        <button
          onClick={() => setReduit(false)}
          className="anim-apparaitre fixed left-1/2 top-2 z-[61] -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-or bg-surface px-3.5 py-1.5 text-xs font-medium text-ink shadow-lg"
        >
          Exercice : 2 {exercice.produit.nom}, billet de {exercice.billet} €
        </button>
      );
    }
    return (
      <div className="anim-deplier fixed inset-x-3 top-3 z-[61] flex flex-col gap-2 rounded-2xl border-2 border-or bg-surface p-4 shadow-2xl">
        <div className="flex items-center gap-2.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-or font-mono text-xs font-medium text-white">
            ✓
          </span>
          <span className="font-semibold text-ink">Exercice</span>
          <button onClick={passer} className="ml-auto text-xs text-ink-faint underline">
            Terminer la visite
          </button>
          <button
            onClick={() => setReduit(true)}
            className="rounded-full bg-ink px-3 py-1.5 text-xs font-medium text-bg"
          >
            Compris
          </button>
        </div>
        <p className="text-sm text-ink-soft">
          Un client prend <b className="text-ink">2 {exercice.produit.nom}</b> et paie avec un billet de{" "}
          <b className="text-ink">{exercice.billet} €</b>. Encaissez-le&nbsp;: touchez le total, puis «&nbsp;Reçu&nbsp;» pour
          trouver la monnaie à rendre.
        </p>
        {indice && <p className="text-sm text-danger">{indice}</p>}
      </div>
    );
  }

  // --- Bravo ---
  if (exercice) {
    return (
      <Bulle position={null} numero={null} titre="Bravo, la caisse n’a plus de secret !">
        <p className="text-sm text-ink-soft">
          Il fallait rendre <b className="text-ink">{formaterEuros(exercice.rendu)}</b>. Pour revenir à la vraie caisse,
          touchez « Terminer » sur le bandeau de répétition.
        </p>
        <button onClick={onFin} className="rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-bg">
          Fermer
        </button>
      </Bulle>
    );
  }

  return null;
}

/** Bulle de la visite : sous la cible si elle est en haut de l'écran, au-dessus sinon, au centre sans cible. */
function Bulle({
  position,
  numero,
  titre,
  children,
}: {
  position: DOMRect | null;
  numero: number | null;
  titre: string;
  children: React.ReactNode;
}) {
  const hauteurEcran = typeof window === "undefined" ? 800 : window.innerHeight;
  const style: React.CSSProperties = position
    ? position.top + position.height / 2 < hauteurEcran / 2
      ? { top: Math.min(position.bottom + 16, hauteurEcran - 220) }
      : { bottom: Math.max(hauteurEcran - position.top + 16, 16) }
    : { top: "50%", transform: "translateY(-50%)" };

  return (
    <div
      data-no-swipe
      role="dialog"
      aria-label={titre}
      className={`fixed inset-x-4 z-[62] mx-auto max-w-sm ${position ? "" : "flex items-center justify-center"}`}
      style={style}
    >
      <div key={titre} className="anim-apparaitre relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-line bg-surface p-4 shadow-2xl">
        <Circuit coin="bas-droite" className="pointer-events-none absolute bottom-2 right-2 h-7 w-7 text-or opacity-50" />
        <div className="flex items-center gap-2.5">
          {numero !== null && (
            <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-or font-mono text-[13px] font-semibold text-white shadow-[0_0_0_3px_var(--surface)]">
              {numero}
            </span>
          )}
          <h2 className="text-base font-semibold text-ink">{titre}</h2>
        </div>
        {children}
      </div>
    </div>
  );
}
