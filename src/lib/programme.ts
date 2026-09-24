import { formaterEuros } from "./format";
import { Soiree } from "./types";

export type DonneesProgramme = {
  soiree: Soiree;
  recette: number;
  nombreVentes: number;
  especes: number;
  cb: number;
  pic: number | null;
  /** [nom, quantité], du plus vendu au moins vendu. */
  classement: [string, number][];
};

const L = 1080;
const H = 1350; // portrait 4:5, le format le mieux accepté par les réseaux sociaux
const FOND = "#f6f4ef";
const ENCRE = "#1c1a17";
const ENCRE_DOUCE = "#4f4b42";
const ENCRE_PALE = "#8a8578";
const OR = "#b8923f";
const ROLES = ["dans le rôle-titre", "premier rôle", "second rôle"];

/** Familles de polices chargées par next/font (layout.tsx), lues sur les variables CSS. */
function police(variable: string, repli: string): string {
  const valeur = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return valeur ? `${valeur}, ${repli}` : repli;
}

function chargerImage(src: string): Promise<HTMLImageElement> {
  return new Promise((ok, echec) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = echec;
    img.src = src;
  });
}

function espacer(ctx: CanvasRenderingContext2D, px: number): void {
  // letterSpacing n'existe pas partout (anciens Safari) : sans lui, le texte reste simplement serré.
  (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${px}px`;
}

/**
 * Le « programme » de la soirée : une affiche façon programme de théâtre (recette, distribution
 * des boissons, modes de paiement), dessinée dans le navigateur. Renvoie une image PNG.
 */
export async function dessinerProgramme(d: DonneesProgramme): Promise<Blob> {
  const titre = police("--font-display", "Georgia, serif");
  const texte = police("--font-body", "system-ui, sans-serif");
  const mono = police("--font-mono", "monospace");
  await Promise.all([
    document.fonts.load(`600 110px ${titre}`),
    document.fonts.load(`400 30px ${texte}`),
    document.fonts.load(`400 24px ${mono}`),
  ]).catch(() => {});
  const masque = await chargerImage("/brand/mask-black.png").catch(() => null);

  const canvas = document.createElement("canvas");
  canvas.width = L;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.textBaseline = "alphabetic";

  const centre = (s: string, y: number) => {
    ctx.textAlign = "center";
    ctx.fillText(s, L / 2, y);
  };

  // Papier et double filet doré.
  ctx.fillStyle = FOND;
  ctx.fillRect(0, 0, L, H);
  ctx.strokeStyle = OR;
  ctx.lineWidth = 3;
  ctx.strokeRect(40, 40, L - 80, H - 80);
  ctx.lineWidth = 1;
  ctx.strokeRect(54, 54, L - 108, H - 108);

  // En-tête.
  if (masque) {
    const w = 64;
    const h = (masque.height / masque.width) * w;
    ctx.drawImage(masque, (L - w) / 2, 100, w, h);
  }
  ctx.fillStyle = ENCRE_PALE;
  ctx.font = `400 24px ${mono}`;
  espacer(ctx, 7);
  centre("THÉÂTRE DE L’IA", 225);
  espacer(ctx, 0);

  ctx.fillStyle = ENCRE;
  ctx.font = `600 112px ${titre}`;
  centre("Programme", 340);

  ctx.fillStyle = ENCRE_DOUCE;
  ctx.font = `400 38px ${texte}`;
  centre(d.soiree.nom, 412);
  ctx.fillStyle = ENCRE_PALE;
  ctx.font = `400 22px ${mono}`;
  centre(
    new Date(d.soiree.ouverteLe).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
    454
  );

  // Ornement : filet doré et losange.
  ctx.strokeStyle = OR;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(L / 2 - 200, 500);
  ctx.lineTo(L / 2 - 16, 500);
  ctx.moveTo(L / 2 + 16, 500);
  ctx.lineTo(L / 2 + 200, 500);
  ctx.stroke();
  ctx.fillStyle = OR;
  ctx.beginPath();
  ctx.moveTo(L / 2, 490);
  ctx.lineTo(L / 2 + 10, 500);
  ctx.lineTo(L / 2, 510);
  ctx.lineTo(L / 2 - 10, 500);
  ctx.fill();

  // Recette.
  ctx.fillStyle = ENCRE;
  ctx.font = `700 120px ${titre}`;
  centre(formaterEuros(d.recette), 635);
  ctx.fillStyle = ENCRE_DOUCE;
  ctx.font = `400 30px ${texte}`;
  const pic = d.pic !== null ? ` · pic entre ${d.pic} h et ${d.pic + 1} h` : "";
  centre(`${d.nombreVentes} vente${d.nombreVentes > 1 ? "s" : ""}${pic}`, 688);

  // Distribution : les boissons, par ordre d'apparition au comptoir.
  ctx.fillStyle = OR;
  ctx.font = `400 24px ${mono}`;
  espacer(ctx, 6);
  centre("DISTRIBUTION", 775);
  espacer(ctx, 0);

  const gauche = 150;
  const droite = L - 150;
  d.classement.slice(0, 5).forEach(([nom, quantite], i) => {
    const y = 850 + i * 76;
    ctx.textAlign = "left";
    ctx.fillStyle = ENCRE;
    ctx.font = `600 40px ${titre}`;
    ctx.fillText(nom, gauche, y);
    const finNom = gauche + ctx.measureText(nom).width;

    ctx.textAlign = "right";
    ctx.font = `400 30px ${mono}`;
    const montant = `× ${quantite}`;
    ctx.fillText(montant, droite, y);
    const debutMontant = droite - ctx.measureText(montant).width;

    // Points de conduite entre le nom et la quantité.
    ctx.fillStyle = OR;
    for (let x = finNom + 20; x < debutMontant - 16; x += 12) {
      ctx.beginPath();
      ctx.arc(x, y - 8, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.textAlign = "left";
    ctx.fillStyle = ENCRE_PALE;
    ctx.font = `400 19px ${mono}`;
    ctx.fillText(ROLES[i] ?? "figuration remarquée", gauche, y + 28);
  });

  // Pied : paiements et heure du rideau.
  ctx.fillStyle = ENCRE_DOUCE;
  ctx.font = `400 28px ${texte}`;
  centre(`Espèces ${formaterEuros(d.especes)}  ·  CB ${formaterEuros(d.cb)}`, 1235);
  ctx.fillStyle = ENCRE_PALE;
  ctx.font = `400 20px ${mono}`;
  const fin = d.soiree.cloturéeLe ?? Date.now();
  const heure = new Date(fin).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }).replace(":", " h ");
  espacer(ctx, 3);
  centre(`RIDEAU À ${heure.toUpperCase()} · MERCI AU PUBLIC`, 1280);
  espacer(ctx, 0);

  return new Promise((ok, echec) => canvas.toBlob((b) => (b ? ok(b) : echec(new Error("Image impossible"))), "image/png"));
}

/** Partage l'image (feuille de partage du téléphone) ou, à défaut, la télécharge. */
export async function partagerProgramme(image: Blob, soiree: Soiree): Promise<void> {
  const nomFichier = `programme-${soiree.nom.normalize("NFD").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").toLowerCase()}.png`;
  const fichier = new File([image], nomFichier, { type: "image/png" });
  if (navigator.canShare?.({ files: [fichier] })) {
    try {
      await navigator.share({ files: [fichier], title: `Programme — ${soiree.nom}` });
      return;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return; // partage annulé
    }
  }
  const url = URL.createObjectURL(image);
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = nomFichier;
  lien.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
