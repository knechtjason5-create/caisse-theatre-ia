"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useSupabaseSync } from "@/lib/useSupabaseSync";
import { PinGateProvider, useDemanderCode, marquerDeverrouille } from "@/lib/pinGate";
import { sessionAutorisee } from "@/lib/supabase";
import Header from "@/components/Header";
import Nav, { Onglet } from "@/components/Nav";
import VenteView from "@/components/VenteView";
import CarteView from "@/components/CarteView";
import HistoriqueView from "@/components/HistoriqueView";
import OuvrirSoireeModal from "@/components/OuvrirSoireeModal";

export default function Page() {
  return (
    <PinGateProvider>
      <Contenu />
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
    <div className="flex min-h-full items-center justify-center bg-bg">
      <div className="anim-fondu" style={{ animationDelay: "200ms" }}>
        <Masque className="anim-respirer" />
      </div>
    </div>
  );
}

function EntreeVerrouillee({ onEntrer }: { onEntrer: () => void }) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-4 px-6 text-center">
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
  const [modalOuverte, setModalOuverte] = useState(false);

  const entrer = useCallback(() => {
    demanderCode("accéder à la caisse").then(setDeverrouille);
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

  if (verificationInitiale) {
    return <Chargement />;
  }

  if (!deverrouille) {
    return <EntreeVerrouillee onEntrer={entrer} />;
  }

  if (!pret) {
    return <Chargement />;
  }

  if (erreur) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-2 px-6 text-center">
        <p className="text-sm font-medium text-ink">Connexion à la base en ligne impossible</p>
        <p className="text-sm text-ink-soft">{erreur}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      <Header onOuvrirSoiree={() => setModalOuverte(true)} />

      <main key={onglet} className="anim-fondu flex flex-1 flex-col pb-16">
        {onglet === "vente" && (
          <VenteView onOuvrirSoiree={() => setModalOuverte(true)} />
        )}
        {onglet === "carte" && <CarteView />}
        {onglet === "historique" && <HistoriqueView />}
      </main>

      <Nav actif={onglet} onChange={setOnglet} />

      {modalOuverte && (
        <OuvrirSoireeModal
          onOuverte={() => setModalOuverte(false)}
          onAnnuler={() => setModalOuverte(false)}
        />
      )}
    </div>
  );
}
