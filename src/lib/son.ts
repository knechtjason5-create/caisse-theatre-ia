/**
 * Un coup de brigadier sur le plancher, synthétisé (aucun fichier son) : un choc sourd
 * qui descend dans les graves, plus un bref claquement de bois. Sans effet si le navigateur
 * ne sait pas jouer de son.
 */
import { vibrer } from "./haptique";

let contexte: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  contexte ??= new Ctx();
  if (contexte.state === "suspended") contexte.resume().catch(() => {});
  return contexte;
}

/** Instants des trois coups, en ms (même rythme que les animations `[data-rideau="coups"]` de globals.css). */
export const COUPS = [350, 800, 1250];

/**
 * Les trois coups frappés avant le lever de rideau : son et vibration (Android).
 * À appeler directement dans le geste de l'utilisateur, sans quoi l'iPhone refuse de jouer le son.
 */
export function lesTroisCoups(): void {
  COUPS.forEach((ms) => coupDeBrigadier(ms / 1000));
  vibrer([0, COUPS[0], 30, COUPS[1] - COUPS[0] - 30, 30, COUPS[2] - COUPS[1] - 30, 30]);
}

function coupDeBrigadier(dansSecondes = 0): void {
  const ctx = audio();
  if (!ctx) return;
  const t = ctx.currentTime + dansSecondes;

  // Le choc : une sinusoïde qui plonge de 150 à 45 Hz et s'éteint vite.
  const osc = ctx.createOscillator();
  const volume = ctx.createGain();
  osc.frequency.setValueAtTime(150, t);
  osc.frequency.exponentialRampToValueAtTime(45, t + 0.18);
  volume.gain.setValueAtTime(0.0001, t);
  volume.gain.exponentialRampToValueAtTime(0.7, t + 0.005);
  volume.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
  osc.connect(volume).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.32);

  // Le bois : 25 ms de bruit filtré.
  const duree = 0.025;
  const tampon = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duree), ctx.sampleRate);
  const donnees = tampon.getChannelData(0);
  for (let i = 0; i < donnees.length; i++) donnees[i] = (Math.random() * 2 - 1) * (1 - i / donnees.length);
  const bruit = ctx.createBufferSource();
  bruit.buffer = tampon;
  const filtre = ctx.createBiquadFilter();
  filtre.type = "lowpass";
  filtre.frequency.value = 1400;
  const volumeBruit = ctx.createGain();
  volumeBruit.gain.value = 0.35;
  bruit.connect(filtre).connect(volumeBruit).connect(ctx.destination);
  bruit.start(t);
}
