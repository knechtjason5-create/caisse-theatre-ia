export function formaterEuros(montant: number): string {
  return montant.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
  });
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
