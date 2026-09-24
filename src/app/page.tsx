"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useSupabaseSync } from "@/lib/useSupabaseSync";
import { PinGateProvider, useDemanderCode, marquerDeverrouille } from "@/lib/pinGate";
import { sessionAutorisee } from "@/lib/supabase";
import { ConfirmationProvider, useConfirmer } from "@/lib/confirmation";
import { useCaisse } from "@/lib/store";
import { Soiree } from "@/lib/types";
import Header from "@/components/Header";
import Nav, { Onglet, ONGLETS } from "@/components/Nav";
import VenteView from "@/components/VenteView";
import CarteView from "@/components/CarteView";
import HistoriqueView from "@/components/HistoriqueView";
import OuvrirSoireeModal from "@/components/OuvrirSoireeModal";
import Rideau, { ModeRideau } from "@/components/Rideau";
import { lesTroisCoups } from "@/lib/son";
import RecapSoiree from "@/components/RecapSoiree";
import JalonRecette from "@/components/JalonRecette";
import AlerteSync from "@/components/AlerteSync";
import BandeauRepetition from "@/components/BandeauRepetition";

type EtatRideau = { mode: ModeRideau; titre: string } | null;

/** Un glissement de doigt ne change d'onglet que s'il part d'une zone qui ne gère pas elle-même le geste. */
const ZONES_SANS_BALAYAGE = "[data-no-swipe], [data-glissable], input, textarea, select";

export default function Page() {
  return (
    <PinGateProvider>
      <ConfirmationProvider>
        <Contenu />
      </ConfirmationProvider>
    </PinGateProvider>
  );
}

function Masque({ className = "" }: { className?: string }) {
  return (
    <div className={className}>
      <Image src="/brand/mask-black.png" alt="" width={36} height={39} className="dark:hidden" />
      <Image src="/brand/mask-white.png" alt="" width={36} height={39} className="hidden dark:block" />
    </div>
  );
}

/** Attente : le masque respire. N'apparaît qu'après 200 ms pour ne pas clignoter sur un chargement rapide. */
function Chargement() {
  return (
    <div className="flex flex-1 items-center justify-center bg-bg">
      <div className="anim-fondu" style={{ animationDelay: "200ms" }}>
        <Masque className="anim-respirer" />
      </div>
    </div>
  );
}

/** Chargement des données : silhouette de l'écran de vente qui scintille. */
function Squelette() {
  return (
    <div aria-busy className="anim-fondu flex flex-1 flex-col bg-bg">
      <div className="flex items-center justify-between border-b border-line bg-surface px-4 py-3">
        <div className="squelette h-7 w-24 rounded-md" />
        <div className="squelette h-5 w-36 rounded-full" />
      </div>
      <div className="flex flex-col gap-6 px-4 pt-4">
        {[2, 2, 3].map((n, s) => (
          <div key={s} className="flex flex-col gap-2.5">
            <div className="squelette h-3 w-16 rounded" />
            <div className="grid grid-cols-2 gap-2.5">
              {Array.from({ length: n }, (_, i) => (
                <div key={i} className="squelette h-[88px] rounded-xl border border-line" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EntreeVerrouillee({ onEntrer }: { onEntrer: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <Masque className="anim-apparaitre" />
      <div className="anim-monter flex flex-col gap-1" style={{ animationDelay: "100ms" }}>
        <span className="font-mono text-xs uppercase tracking-wider text-ink-faint">
          Théâtre de l&rsquo;IA
        </span>
        <p className="text-sm text-ink-soft">Entrez le code à 4 chiffres pour accéder à la caisse.</p>
      </div>
      <button
        onClick={onEntrer}
        style={{ animationDelay: "200ms" }}
        className="anim-monter rounded-full bg-ink px-6 py-3 text-sm font-medium text-bg"
      >
        Entrer le code
      </button>
    </div>
  );
}

function Contenu() {
  const demanderCode = useDemanderCode();
  const [deverrouille, setDeverrouille] = useState(false);
  const [verificationInitiale, setVerificationInitiale] = useState(true);
  const { pret, erreur } = useSupabaseSync(deverrouille);
  const [onglet, setOnglet] = useState<Onglet>("vente");
  const [sens, setSens] = useState<"droite" | "gauche" | null>(null);
  const [modalOuverte, setModalOuverte] = useState(false);
  const [rideau, setRideau] = useState<EtatRideau>(null);
  const [recap, setRecap] = useState<Soiree | null>(null);
  const soiree = useCaisse((e) => e.soireeActive());
  const cloturerSoiree = useCaisse((e) => e.cloturerSoiree);
  const repetition = useCaisse((e) => e.repetition);
  const commencerRepetition = useCaisse((e) => e.commencerRepetition);
  const terminerRepetition = useCaisse((e) => e.terminerRepetition);
  const confirmer = useConfirmer();
  const toucher = useRef<{ x: number; y: number } | null>(null);

  const changerOnglet = useCallback(
    (suivant: Onglet) => {
      if (suivant === onglet) return;
      const i = ONGLETS.findIndex((o) => o.id === onglet);
      const j = ONGLETS.findIndex((o) => o.id === suivant);
      setSens(j > i ? "droite" : "gauche");
      setOnglet(suivant);
    },
    [onglet]
  );

  const cloturer = async () => {
    if (!soiree) return;
    const ok = await confirmer({
      titre: `Clôturer « ${soiree.nom} » ?`,
      message: "Le panier en cours sera perdu s'il n'est pas encaissé.",
      libelle: "Clôturer",
    });
    if (!ok) return;
    cloturerSoiree();
    setRecap(null);
    setRideau({ mode: "ferme", titre: soiree.nom });
    // Le récap s'affiche sur le rideau baissé, une fois le rideau tombé.
    const cloturee = soiree;
    setTimeout(() => setRecap(cloturee), 1000);
  };

  /** Entrer en répétition (caisse d'entraînement) ou en sortir ; le rideau marque le changement de plateau. */
  const basculerRepetition = async () => {
    const ok = await confirmer(
      repetition
        ? {
            titre: "Terminer la répétition ?",
            message: "Les ventes d'entraînement sont effacées et la vraie caisse reprend.",
            libelle: "Terminer",
          }
        : {
            titre: "Passer en répétition ?",
            message:
              "Pour s'entraîner ou former quelqu'un : tout fonctionne comme d'habitude, mais rien n'est enregistré et les autres appareils ne voient rien.",
            libelle: "Commencer",
          }
    );
    if (!ok) return;
    setModalOuverte(false);
    setRecap(null);
    if (repetition) {
      terminerRepetition();
      setRideau({ mode: "ouvre", titre: "Théâtre de l’IA" });
    } else {
      commencerRepetition();
      setRideau({ mode: "ouvre", titre: "Répétition" });
    }
  };

  const entrer = useCallback(() => {
    demanderCode("accéder à la caisse").then((ok) => {
      setDeverrouille(ok);
      // Code validé : le rideau, tombé à la fermeture de la fenêtre, s'ouvre sur la caisse.
      if (ok) setRideau({ mode: "ouvre", titre: "Théâtre de l’IA" });
    });
  }, [demanderCode]);

  useEffect(() => {
    sessionAutorisee().then((ok) => {
      setVerificationInitiale(false);
      if (ok) {
        marquerDeverrouille();
        setDeverrouille(true);
      } else {
        entrer();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Le rideau reste à la même place dans l'arbre quel que soit l'écran affiché dessous
  // (squelette puis caisse) : sinon il serait recréé et son animation repartirait de zéro.
  return (
    <>
      {ecran()}
      <AlerteSync />
      {rideau && (
        <Rideau
          key={rideau.mode}
          mode={rideau.mode}
          titre={rideau.titre}
          onFin={() => {
            if (rideau.mode !== "ferme") setRideau(null);
          }}
        />
      )}
    </>
  );

  function ecran() {
    if (verificationInitiale) {
      return <Chargement />;
    }

    if (!deverrouille) {
      return <EntreeVerrouillee onEntrer={entrer} />;
    }

    if (!pret) {
      return <Squelette />;
    }

    if (erreur) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
          <p className="text-sm font-medium text-ink">Connexion à la base en ligne impossible</p>
          <p className="text-sm text-ink-soft">{erreur}</p>
        </div>
      );
    }

    return (
      <div className="flex flex-1 flex-col">
        {repetition && <BandeauRepetition onTerminer={basculerRepetition} />}
        <Header
          onOuvrirSoiree={() => setModalOuverte(true)}
          onCloturer={cloturer}
          onRepetition={basculerRepetition}
        />

        <main
          key={onglet}
          className={`${
            sens === "droite" ? "anim-entre-droite" : sens === "gauche" ? "anim-entre-gauche" : "anim-fondu"
          } flex flex-1 flex-col pb-16`}
          onTouchStart={(e) => {
            const cible = e.target as HTMLElement;
            const t = e.touches[0];
            toucher.current = e.touches.length === 1 && !cible.closest(ZONES_SANS_BALAYAGE) ? { x: t.clientX, y: t.clientY } : null;
          }}
          onTouchEnd={(e) => {
            const d = toucher.current;
            toucher.current = null;
            if (!d) return;
            const t = e.changedTouches[0];
            const dx = t.clientX - d.x;
            const dy = t.clientY - d.y;
            if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
            const i = ONGLETS.findIndex((o) => o.id === onglet);
            const j = i + (dx < 0 ? 1 : -1);
            if (j >= 0 && j < ONGLETS.length) changerOnglet(ONGLETS[j].id);
          }}
        >
          {onglet === "vente" && (
            <VenteView onOuvrirSoiree={() => setModalOuverte(true)} onRepetition={basculerRepetition} />
          )}
          {onglet === "carte" && <CarteView />}
          {onglet === "historique" && <HistoriqueView />}
        </main>

        <Nav actif={onglet} onChange={changerOnglet} />

        <JalonRecette />

        {modalOuverte && (
          <OuvrirSoireeModal
            onOuverte={(nom) => {
              setModalOuverte(false);
              // Appelé dans le geste « Démarrer la soirée » : condition pour que l'iPhone joue le son.
              lesTroisCoups();
              setRideau({ mode: "coups", titre: nom });
            }}
            onAnnuler={() => setModalOuverte(false)}
          />
        )}

        {recap && (
          <RecapSoiree
            soiree={recap}
            onFermer={() => {
              setRecap(null);
              // Le rideau se relève sur l'application.
              setRideau({ mode: "ouvre", titre: repetition ? "Répétition" : "Théâtre de l’IA" });
            }}
          />
        )}
      </div>
    );
  }
}
