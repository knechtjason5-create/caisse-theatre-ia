import type { CSSProperties } from "react";

/** Décalage d'entrée en cascade : l'élément n° i démarre i × pas ms après le premier (plafonné pour ne jamais faire attendre). */
export function cascade(i: number, pas = 40, max = 10): CSSProperties {
  return { animationDelay: `${Math.min(i, max) * pas}ms` };
}
