"use client";

import { ReactNode, useRef, useState } from "react";
import { vibrer } from "@/lib/haptique";

const SEUIL_DECISION = 8;
const SEUIL_SUPPRESSION = 96;

/**
 * Ligne qu'on glisse vers la gauche pour la supprimer. Le geste ne démarre que s'il est
 * nettement horizontal, pour laisser le défilement vertical intact. `onGlisse` renvoie false
 * pour annuler (ex. confirmation refusée) : la ligne revient alors en place.
 */
export default function Glissable({
  children,
  onGlisse,
  libelle = "Supprimer",
  className = "",
}: {
  children: ReactNode;
  onGlisse: () => boolean | void | Promise<boolean | void>;
  libelle?: string;
  className?: string;
}) {
  const [dx, setDx] = useState(0);
  const [relache, setRelache] = useState(true);
  const depart = useRef<{ x: number; y: number; id: number } | null>(null);
  const horizontal = useRef<boolean | null>(null);
  const aGlisse = useRef(false);

  const fin = () => {
    depart.current = null;
    horizontal.current = null;
    setRelache(true);
  };

  return (
    <div data-glissable className={`relative overflow-hidden rounded-xl ${className}`}>
      <div
        aria-hidden
        className="glissable-fond absolute inset-0 flex items-center justify-end rounded-xl px-4 text-sm font-medium"
        style={{ opacity: Math.min(1, -dx / SEUIL_SUPPRESSION) }}
      >
        {libelle}
      </div>
      <div
        style={{
          transform: `translateX(${dx}px)`,
          transition: relache ? "transform 200ms var(--ease-out)" : "none",
          touchAction: "pan-y",
        }}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          depart.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
          horizontal.current = null;
          aGlisse.current = false;
        }}
        onPointerMove={(e) => {
          const d = depart.current;
          if (!d || d.id !== e.pointerId) return;
          const mx = e.clientX - d.x;
          const my = e.clientY - d.y;
          if (horizontal.current === null) {
            if (Math.abs(mx) < SEUIL_DECISION && Math.abs(my) < SEUIL_DECISION) return;
            horizontal.current = Math.abs(mx) > Math.abs(my);
            if (!horizontal.current) return fin();
            e.currentTarget.setPointerCapture(e.pointerId);
            aGlisse.current = true;
            setRelache(false);
          }
          setDx(Math.min(0, mx));
        }}
        onPointerUp={() => {
          if (!depart.current) return;
          const valide = -dx >= SEUIL_SUPPRESSION;
          fin();
          if (!valide) return setDx(0);
          vibrer(15);
          setDx(-600);
          // Laisse la ligne sortir avant de la retirer ; si l'action est annulée, elle revient.
          setTimeout(async () => {
            if ((await onGlisse()) === false) setDx(0);
          }, 180);
        }}
        onPointerCancel={() => {
          fin();
          setDx(0);
        }}
        onClickCapture={(e) => {
          if (aGlisse.current) {
            e.stopPropagation();
            aGlisse.current = false;
          }
        }}
      >
        {children}
      </div>
    </div>
  );
}
