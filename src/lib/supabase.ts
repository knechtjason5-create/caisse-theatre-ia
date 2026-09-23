import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const CLE_SESSION_CODE = "caisse-code";

/** Code d'accès mémorisé pour la session en cours (sessionStorage), ou null si non saisi. */
export function recupererCodeSession(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(CLE_SESSION_CODE);
  } catch {
    return null;
  }
}

function memoriserCodeSession(code: string): void {
  try {
    sessionStorage.setItem(CLE_SESSION_CODE, code);
  } catch {
    // stockage indisponible (navigation privée…) — le code sera redemandé
  }
}

function creerClient(codeAcces: string | null): SupabaseClient | null {
  if (!url || !anonKey) return null;
  return createClient(
    url,
    anonKey,
    codeAcces ? { global: { headers: { "x-caisse-code": codeAcces } } } : undefined
  );
}

/**
 * null si l'app n'est pas configurée (variables d'environnement manquantes).
 * Reconstruit avec le code d'accès de la session (s'il y en a un) dès le chargement du
 * module, pour que les écritures fonctionnent immédiatement après un rechargement de page.
 */
export let supabase = creerClient(recupererCodeSession());

/**
 * Reconfigure le client avec le code d'accès validé par le serveur : nécessaire pour que
 * Supabase autorise les écritures (RLS côté base, voir supabase/schema.sql). Sans cet
 * en-tête, la base refuse tout insert/update/delete — la lecture reste, elle, publique.
 */
export function configurerCodeAcces(codeAcces: string): void {
  supabase = creerClient(codeAcces);
  memoriserCodeSession(codeAcces);
}
