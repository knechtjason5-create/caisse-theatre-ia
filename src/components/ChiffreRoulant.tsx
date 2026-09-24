"use client";

import { useState } from "react";

/** Nombre qui roule verticalement : vers le haut quand il augmente, vers le bas quand il diminue. */
export default function ChiffreRoulant({ valeur }: { valeur: number }) {
  const [precedent, setPrecedent] = useState(valeur);
  const [sens, setSens] = useState<"haut" | "bas">("haut");
  if (valeur !== precedent) {
    setSens(valeur > precedent ? "haut" : "bas");
    setPrecedent(valeur);
  }
  return (
    <span className="inline-flex overflow-hidden align-bottom">
      <span key={valeur} className={`inline-block ${sens === "haut" ? "anim-roule-haut" : "anim-roule-bas"}`}>
        {valeur}
      </span>
    </span>
  );
}
