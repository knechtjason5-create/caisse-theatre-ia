"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useSupabaseSync } from "@/lib/useSupabaseSync";
import { PinGateProvider, useDemanderCode, estDeverrouille } from "@/lib/pinGate";
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

function EntreeVerrouillee({ onEntrer }: { onEntrer: () => void }) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-4 px-6 text-center">
      <Image src="/brand/mask-black.png" alt="" width={36} height={39} className="dark:hidden" />
      <Image src="/brand/mask-white.png" alt="" width={36} height={39} className="hidden dark:block" />
      <div className="flex flex-col gap-1">
        <span className="font-mono text-xs uppercase tracking-wider text-ink-faint">
          Théâtre de l&rsquo;IA
        </span>
        <p className="text-sm text-ink-soft">Entrez le code à 4 chiffres pour accéder à la caisse.</p>
      </div>
      <button
        onClick={onEntrer}
        className="rounded-full bg-ink px-6 py-3 text-sm font-medium text-bg"
      >
        Entrer le code
      </button>
    </div>
  );
}

function Contenu() {
  const { pret, erreur } = useSupabaseSync();
  const demanderCode = useDemanderCode();
  const [deverrouille, setDeverrouille] = useState(false);
  const [onglet, setOnglet] = useState<Onglet>("vente");
  const [modalOuverte, setModalOuverte] = useState(false);

  const entrer = useCallback(() => {
    demanderCode("accéder à la caisse").then(setDeverrouille);
  }, [demanderCode]);

  useEffect(() => {
    if (estDeverrouille()) {
      setDeverrouille(true);
      return;
    }
    entrer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!pret) {
    return <div className="min-h-full bg-bg" />;
  }

  if (erreur) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-2 px-6 text-center">
        <p className="text-sm font-medium text-ink">Connexion à la base en ligne impossible</p>
        <p className="text-sm text-ink-soft">{erreur}</p>
      </div>
    );
  }

  if (!deverrouille) {
    return <EntreeVerrouillee onEntrer={entrer} />;
  }

  return (
    <div className="flex min-h-full flex-col">
      <Header onOuvrirSoiree={() => setModalOuverte(true)} />

      <main className="flex flex-1 flex-col pb-16">
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
