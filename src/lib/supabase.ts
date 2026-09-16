import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** null si l'app n'est pas configurée (variables d'environnement manquantes). */
export const supabase = url && anonKey ? createClient(url, anonKey) : null;
