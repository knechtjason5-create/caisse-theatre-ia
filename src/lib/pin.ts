const CODE = "1234";
const CLE_SESSION = "caisse-code-ok";

function dejaDeverrouille(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(CLE_SESSION) === "1";
  } catch {
    return false;
  }
}

function memoriser(): void {
  try {
    sessionStorage.setItem(CLE_SESSION, "1");
  } catch {
    // stockage indisponible (navigation privée…) — le code sera redemandé
  }
}

/**
 * Demande le code à 4 chiffres pour une action sensible (carte, suppression, clôture).
 * Une fois saisi correctement, reste déverrouillé pour le reste de la session sur cet appareil.
 */
export function demanderCode(action: string): boolean {
  if (dejaDeverrouille()) return true;
  const saisie = prompt(`Code à 4 chiffres requis pour ${action}.`);
  if (saisie === null) return false;
  if (saisie.trim() !== CODE) {
    alert("Code incorrect.");
    return false;
  }
  memoriser();
  return true;
}
