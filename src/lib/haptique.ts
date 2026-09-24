/** Petite vibration de confirmation (Android/Chrome). Sans effet, et sans erreur, là où l'appareil ne la supporte pas. */
export function vibrer(motif: number | number[] = 8): void {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate(motif);
  } catch {
    // vibration refusée par le navigateur : on ignore
  }
}
