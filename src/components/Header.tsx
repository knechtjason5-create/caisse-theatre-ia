"use client";

import Image from "next/image";
import { useCaisse } from "@/lib/store";
import { useDemanderCode } from "@/lib/pinGate";

export default function Header({ onOuvrirSoiree }: { onOuvrirSoiree: () => void }) {
  const soiree = useCaisse((e) => e.soireeActive());
  const cloturerSoiree = useCaisse((e) => e.cloturerSoiree);
  const demanderCode = useDemanderCode();

  const cloturer = async () => {
    if (!(await demanderCode("clôturer la soirée"))) return;
    if (confirm(`Clôturer « ${soiree?.nom} » ? Le panier en cours sera perdu s'il n'est pas encaissé.`)) {
      cloturerSoiree();
    }
  };

  return (
    <header className="flex items-center justify-between gap-3 border-b border-line bg-surface px-4 py-3">
      <div className="flex items-center gap-2.5">
        <Image
          src="/brand/mask-black.png"
          alt=""
          width={24}
          height={26}
          className="dark:hidden"
        />
        <Image
          src="/brand/mask-white.png"
          alt=""
          width={24}
          height={26}
          className="hidden dark:block"
        />
        <span className="font-mono text-[11px] uppercase leading-tight tracking-wider text-ink-faint">
          Théâtre
          <br />
          de l&rsquo;IA
        </span>
      </div>

      {soiree ? (
        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-1.5 text-sm text-ink">
            <span className="h-1.5 w-1.5 rounded-full bg-ink" />
            {soiree.nom}
          </span>
          <button onClick={cloturer} className="text-xs text-ink-faint underline">
            Clôturer
          </button>
        </div>
      ) : (
        <button
          onClick={onOuvrirSoiree}
          className="rounded-full bg-ink px-3.5 py-1.5 text-xs font-medium text-bg"
        >
          Ouvrir une soirée
        </button>
      )}
    </header>
  );
}
