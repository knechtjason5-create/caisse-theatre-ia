"use client";

import { useRef, useState } from "react";
import { useCaisse } from "@/lib/store";
import { formaterEuros, formaterDate, formaterHeure } from "@/lib/format";
import { telechargerCsvSoiree } from "@/lib/export";
import { parserCsvSoiree } from "@/lib/import";
import ModifierVenteModal from "./ModifierVenteModal";
import MontantAnime from "./MontantAnime";
import Glissable from "./Glissable";
import { useConfirmer } from "@/lib/confirmation";
import { cascade } from "@/lib/anim";
import { Vente } from "@/lib/types";

export default function HistoriqueView() {
  const soirees = useCaisse((e) => e.soirees);
  const ventes = useCaisse((e) => e.ventes);
  const produits = useCaisse((e) => e.produits);
  const supprimerVente = useCaisse((e) => e.supprimerVente);
  const importerVentes = useCaisse((e) => e.importerVentes);
  const confirmer = useConfirmer();
  const [ouverte, setOuverte] = useState<string | null>(null);
  const [messageImport, setMessageImport] = useState<{ texte: string; erreur: boolean } | null>(null);
  const [venteEnEdition, setVenteEnEdition] = useState<Vente | null>(null);
  const inputFichierRef = useRef<HTMLInputElement>(null);

  const supprimer = async (venteId: string, montant: number): Promise<boolean> => {
    const ok = await confirmer({
      titre: `Supprimer cette vente de ${formaterEuros(montant)} ?`,
      message: "Cette action est irréversible.",
      libelle: "Supprimer",
      danger: true,
    });
    if (ok) supprimerVente(venteId);
    return ok;
  };

  const importerFichier = async (fichier: File) => {
    const texte = await fichier.text();
    const resultat = parserCsvSoiree(texte, produits);
    if (!resultat.ok) {
      setMessageImport({ texte: resultat.erreur, erreur: true });
      return;
    }
    const { nombreImportees, nombreIgnorees } = importerVentes(resultat.nomSoiree, resultat.ventes);
    setMessageImport({
      texte:
        nombreImportees === 0
          ? `Rien à importer : ces ventes étaient déjà présentes dans « ${resultat.nomSoiree} ».`
          : `${nombreImportees} vente(s) importée(s) dans « ${resultat.nomSoiree} »` +
            (nombreIgnorees > 0 ? ` (${nombreIgnorees} déjà présente(s), ignorée(s))` : "") +
            ".",
      erreur: false,
    });
  };

  const soireesTriees = [...soirees].sort((a, b) => b.ouverteLe - a.ouverteLe);

  const blocImport = (
    <div className="mb-4 flex flex-col gap-2">
      <input
        ref={inputFichierRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const fichier = e.target.files?.[0];
          if (fichier) importerFichier(fichier);
          e.target.value = "";
        }}
      />
      <button
        onClick={() => inputFichierRef.current?.click()}
        className="w-full rounded-full border border-line px-4 py-2.5 text-center text-sm font-medium text-ink"
      >
        Importer un CSV de ventes
      </button>
      {messageImport && (
        <p className={`text-center text-xs ${messageImport.erreur ? "text-danger" : "text-ink-soft"}`}>
          {messageImport.texte}
        </p>
      )}
    </div>
  );

  if (soireesTriees.length === 0) {
    return (
      <div className="flex-1 px-4 pb-8 pt-4">
        {blocImport}
        <p className="text-center text-sm text-ink-soft">
          Aucune soirée enregistrée pour l&rsquo;instant.
        </p>
      </div>
    );
  }

  return (
    <>
    <div className="flex-1 overflow-y-auto px-4 pb-8 pt-4">
      {blocImport}
      <div className="flex flex-col gap-2.5">
        {soireesTriees.map((s, si) => {
          const ventesSoiree = ventes.filter((v) => v.soireeId === s.id);
          const recette = ventesSoiree.reduce((t, v) => t + v.montantTotal, 0);

          const parMode = ventesSoiree
            .flatMap((v) => v.paiements)
            .reduce<Record<string, number>>((acc, p) => {
              acc[p.mode] = (acc[p.mode] ?? 0) + p.montant;
              return acc;
            }, {});

          const parProduit = ventesSoiree
            .flatMap((v) => v.lignes)
            .reduce<Record<string, number>>((acc, l) => {
              acc[l.nom] = (acc[l.nom] ?? 0) + l.quantite;
              return acc;
            }, {});
          const produitPhare = Object.entries(parProduit).sort((a, b) => b[1] - a[1])[0];

          const estOuverte = ouverte === s.id;

          return (
            <div
              key={s.id}
              style={cascade(si)}
              className="anim-monter rounded-xl border border-line bg-surface overflow-hidden"
            >
              <button
                onClick={() => setOuverte(estOuverte ? null : s.id)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-ink">{s.nom}</span>
                  <span className="font-mono text-xs text-ink-faint">
                    {formaterDate(s.ouverteLe)}
                    {s.cloturéeLe ? "" : " · en cours"}
                  </span>
                </div>
                <span className="flex items-center gap-2.5">
                  <span className="font-mono text-base tabular-nums text-ink">
                    <MontantAnime valeur={recette} />
                  </span>
                  <span
                    aria-hidden
                    className={`text-xs text-ink-faint transition-transform duration-200 ${estOuverte ? "rotate-180" : ""}`}
                  >
                    ▾
                  </span>
                </span>
              </button>

              {estOuverte && (
                <div className="anim-deplier border-t border-line px-4 py-3.5">
                  <div className="mb-3 flex justify-between gap-4 text-sm">
                    <div className="flex flex-col">
                      <span className="font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                        Espèces
                      </span>
                      <span className="tabular-nums text-ink">
                        {formaterEuros(parMode["Espèces"] ?? 0)}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                        CB
                      </span>
                      <span className="tabular-nums text-ink">
                        {formaterEuros(parMode["CB"] ?? 0)}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                        Ventes
                      </span>
                      <span className="tabular-nums text-ink">{ventesSoiree.length}</span>
                    </div>
                  </div>

                  {ventesSoiree.length > 0 && (
                    <button
                      onClick={() => telechargerCsvSoiree(s, ventesSoiree, produits)}
                      className="mb-3 w-full rounded-full border border-line px-4 py-2.5 text-center text-sm font-medium text-ink"
                    >
                      Télécharger le CSV des ventes
                    </button>
                  )}

                  {produitPhare && (
                    <p className="mb-3 text-sm text-ink-soft">
                      Produit phare : <span className="text-ink">{produitPhare[0]}</span>{" "}
                      ({produitPhare[1]} vendus)
                    </p>
                  )}

                  <div className="flex flex-col gap-1">
                    {Object.entries(parProduit)
                      .sort((a, b) => b[1] - a[1])
                      .map(([nom, quantite]) => (
                        <div key={nom} className="flex justify-between text-xs">
                          <span className="text-ink-soft">{nom}</span>
                          <span className="font-mono tabular-nums text-ink-faint">
                            × {quantite}
                          </span>
                        </div>
                      ))}
                  </div>

                  {ventesSoiree.length > 0 && (
                    <div className="mt-4 border-t border-line pt-3">
                      <span className="font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                        Ventes de la soirée
                      </span>
                      <div className="mt-2 flex flex-col gap-1.5">
                        {[...ventesSoiree]
                          .sort((a, b) => b.horodatage - a.horodatage)
                          .map((v, vi) => {
                            const modes = [...new Set(v.paiements.map((p) => p.mode))].join(" + ");
                            return (
                              <Glissable
                                key={v.id}
                                onGlisse={() => supprimer(v.id, v.montantTotal)}
                              >
                              <div
                                style={cascade(vi, 35, 8)}
                                className="anim-deplier flex items-start justify-between gap-3 rounded-lg border border-line bg-bg px-3 py-2"
                              >
                                <div className="flex flex-col">
                                  <span className="font-mono text-xs tabular-nums text-ink">
                                    {formaterEuros(v.montantTotal)}
                                  </span>
                                  <span className="text-[11px] text-ink-faint">
                                    {v.lignes.map((l) => `${l.nom} ×${l.quantite}`).join(", ")}
                                    {modes ? ` · ${modes}` : ""}
                                  </span>
                                </div>
                                <div className="flex shrink-0 flex-col items-end gap-1">
                                  <span className="font-mono text-[11px] tabular-nums text-ink-faint">
                                    {formaterHeure(v.horodatage)}
                                  </span>
                                  <div className="flex items-center gap-3">
                                    <button
                                      onClick={() => setVenteEnEdition(v)}
                                      className="text-xs text-ink-soft underline"
                                    >
                                      Modifier
                                    </button>
                                    <button
                                      onClick={() => supprimer(v.id, v.montantTotal)}
                                      className="text-xs text-danger underline"
                                    >
                                      Supprimer
                                    </button>
                                  </div>
                                </div>
                              </div>
                              </Glissable>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
    {venteEnEdition && (
      <ModifierVenteModal vente={venteEnEdition} onFermer={() => setVenteEnEdition(null)} />
    )}
    </>
  );
}
