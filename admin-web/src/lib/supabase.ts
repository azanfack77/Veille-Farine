import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const cle = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const configurationManquante = !url || !cle;

export const supabase = createClient(url ?? 'http://localhost', cle ?? 'absent', {
  auth: { persistSession: true, autoRefreshToken: true },
});

/** Appelle la fonction Edge qui gère les comptes de connexion. */
export async function appelerGestionComptes(corps: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.functions.invoke('admin-utilisateurs', { body: corps });
  if (error) {
    // Récupère le message renvoyé par la fonction si disponible
    const contexte = (error as { context?: Response }).context;
    if (contexte && typeof contexte.json === 'function') {
      try {
        const detail = await contexte.json();
        if (detail?.erreur) throw new Error(detail.erreur);
      } catch (e) {
        if (e instanceof Error && e.message) throw e;
      }
    }
    throw new Error(
      "La fonction admin-utilisateurs ne répond pas. Vérifiez qu'elle est déployée (voir le README).",
    );
  }
  if (data?.erreur) throw new Error(data.erreur);
  return data ?? {};
}

/** Traduit les erreurs PostgreSQL les plus courantes en messages clairs. */
export function messageErreur(e: unknown): string {
  const err = e as { code?: string; message?: string; details?: string };
  if (err?.code === '23503')
    return "Opération impossible : cet élément est utilisé ailleurs (relevés, marques, villes, enquêteurs…).";
  if (err?.code === '23505') return 'Cette valeur existe déjà.';
  if (err?.code === '23514') return "Une valeur ne respecte pas les règles de la base (format d'email, minoterie autorisée…).";
  if (err?.code === '42501') return "Action refusée : votre compte n'a pas les droits administrateur.";
  return err?.message ?? String(e);
}
