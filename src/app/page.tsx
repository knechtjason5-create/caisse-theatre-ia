"use client";

import { useState } from "react";
import { useSupabaseSync } from "@/lib/useSupabaseSync";
import { demanderCode } from "@/lib/pin";
import Header from "@/components/Header";
import Nav, { Onglet } from "@/components/Nav";
import VenteView from "@/components/VenteView";
import CarteView from "@/components/CarteView";
import HistoriqueView from "@/components/HistoriqueView";
import OuvrirSoireeModal from "@/components/OuvrirSoireeModal";

export default function Page() {
  const { pret, erreur } = useSupabaseSync();
  const [onglet, setOnglet] = useState<Onglet>("vente");
  const [modalOuverte, setModalOuverte] = useState(false);

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

  const changerOnglet = (o: Onglet) => {
    if (o === "carte" && onglet !== "carte" && !demanderCode("accéder à la carte")) return;
    setOnglet(o);
  };

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

      <Nav actif={onglet} onChange={changerOnglet} />

      {modalOuverte && (
        <OuvrirSoireeModal
          onOuverte={() => setModalOuverte(false)}
          onAnnuler={() => setModalOuverte(false)}
        />
      )}
    </div>
  );
}
