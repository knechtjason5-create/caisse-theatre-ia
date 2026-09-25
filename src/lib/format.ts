export function formaterEuros(montant: number): string {
  return montant.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
  });
}

/** Montant tel qu'on l'écrit dans un champ : « 8,75 », virgule française, sans symbole. */
export function formaterSaisie(montant: number): string {
  return montant.toFixed(2).replace(".", ",");
}

/**
 * Lit un montant tapé à la main (« 8,75 », « 8.75 », « 8 € »). null si ce n'est pas un nombre ;
 * un montant négatif est renvoyé tel quel, c'est à l'appelant de le refuser avec un message.
 */
export function lireMontant(texte: string): number | null {
  const nettoye = texte.replace(/\s|€/g, "").replace(",", ".");
  if (nettoye === "" || !/^-?\d*\.?\d*$/.test(nettoye) || nettoye === "." || nettoye === "-") return null;
  const n = Number(nettoye);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

/** « 1 personne », « 2 personnes » : les libellés s'écrivent en entier, sans abréviation. */
export function pluriel(n: number, mot: string): string {
  return `${n} ${mot}${n > 1 ? "s" : ""}`;
}

export function formaterDate(horodatage: number): string {
  return new Date(horodatage).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function formaterHeure(horodatage: number): string {
  return new Date(horodatage).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
