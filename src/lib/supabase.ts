import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * sessionStorage si disponible : la session (et donc le déverrouillage) ne vaut que pour
 * l'onglet en cours, comme avant. Indisponible (navigation privée…) → session en mémoire,
 * le code sera redemandé au prochain chargement.
 */
function stockageSession(): Storage | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const test = "__caisse_test__";
    window.sessionStorage.setItem(test, test);
    window.sessionStorage.removeItem(test);
    return window.sessionStorage;
  } catch {
    return undefined;
  }
}

/**
 * null si l'app n'est pas configurée (variables d'environnement manquantes).
 * Chaque appareil ouvre une session anonyme Supabase ; la base (RLS, voir
 * supabase/schema.sql) ne lui donne accès aux données, en lecture comme en écriture et
 * en temps réel, qu'une fois le code à 4 chiffres validé par la fonction deverrouiller().
 */
export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: { storage: stockageSession(), persistSession: true, autoRefreshToken: true },
      })
    : null;

async function assurerSession(): Promise<boolean> {
  if (!supabase) return false;
  const { data } = await supabase.auth.getSession();
  if (data.session) return true;
  const { error } = await supabase.auth.signInAnonymously();
  return !error;
}

/** Vrai si la session de cet appareil a déjà été déverrouillée par le code. */
export async function sessionAutorisee(): Promise<boolean> {
  if (!supabase) return false;
  const { data } = await supabase.auth.getSession();
  if (!data.session) return false;
  const { data: ok, error } = await supabase.rpc("est_autorise");
  return !error && ok === true;
}

/** Vérifie le code côté serveur ; s'il est bon, la base autorise cette session. */
export async function deverrouiller(code: string): Promise<boolean> {
  if (!supabase || !(await assurerSession())) return false;
  const { data, error } = await supabase.rpc("deverrouiller", { code_saisi: code });
  return !error && data === true;
}
