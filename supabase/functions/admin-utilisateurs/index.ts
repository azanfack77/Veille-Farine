// Fonction Edge Supabase : gestion des comptes de connexion des enquêteurs et administrateurs.
// Console web : connexion par mot de passe. Application mobile : mot de passe ou code reçu par email.
// La clé "service_role" nécessaire pour créer un compte ne doit jamais être
// dans le navigateur : elle reste ici, côté serveur.
//
// Déploiement automatique par GitHub Actions (.github/workflows/supabase-fonction.yml)
import { createClient } from 'npm:@supabase/supabase-js@2';

const entetes = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function reponse(corps: unknown, statut = 200) {
  return new Response(JSON.stringify(corps), {
    status: statut,
    headers: { ...entetes, 'Content-Type': 'application/json' },
  });
}

const url = Deno.env.get('SUPABASE_URL')!;
// Avec les nouvelles clés Supabase, la clé anon peut être absente : la clé service suffit,
// car c'est le jeton de l'utilisateur (en-tête Authorization) qui détermine ses droits.
const cleAnon = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const cleService = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: entetes });
  if (req.method !== 'POST') return reponse({ erreur: 'Méthode non autorisée' }, 405);

  // 1. L'appelant doit être administrateur
  const jeton = req.headers.get('Authorization') ?? '';
  if (!jeton.startsWith('Bearer ')) return reponse({ erreur: 'Connexion requise.' }, 401);
  const appelant = createClient(url, cleAnon, { global: { headers: { Authorization: jeton } } });
  const { data: estAdmin, error: erreurAdmin } = await appelant.rpc('fn_est_admin');
  if (erreurAdmin || estAdmin !== true) return reponse({ erreur: 'Accès réservé aux administrateurs.' }, 403);

  const admin = createClient(url, cleService, { auth: { persistSession: false, autoRefreshToken: false } });
  let corps: Record<string, unknown>;
  try {
    corps = await req.json();
  } catch {
    return reponse({ erreur: 'Requête invalide.' }, 400);
  }

  const email = String(corps.email ?? '').trim().toLowerCase();
  if (!email) return reponse({ erreur: 'Email manquant.' }, 400);

  switch (corps.action) {
    // Crée le compte de connexion + la fiche tb_utilisateurs
    case 'creer': {
      // Champs obligatoires d'un enquêteur : nom, prénom, email, fonction et minoterie
      const manquants = [
        !String(corps.nom ?? '').trim() && 'nom',
        !String(corps.prenom ?? '').trim() && 'prénom',
        !corps.id_fonction && 'fonction',
        !corps.id_minoterie && 'minoterie',
      ].filter(Boolean);
      if (manquants.length > 0) return reponse({ erreur: `Champs obligatoires manquants : ${manquants.join(', ')}.` }, 400);

      const motDePasse = String(corps.mot_de_passe ?? '');
      if (motDePasse.length < 8) return reponse({ erreur: 'Le mot de passe doit contenir au moins 8 caractères.' }, 400);

      const { data: cree, error: e1 } = await admin.auth.admin.createUser({
        email,
        password: motDePasse,
        email_confirm: true,
      });
      if (e1) {
        const deja = /already|registered|exists/i.test(e1.message);
        return reponse({ erreur: deja ? 'Un compte de connexion existe déjà pour cet email.' : e1.message }, 400);
      }

      const { error: e2 } = await admin.from('tb_utilisateurs').insert({
        email,
        nom: String(corps.nom ?? '').trim().toUpperCase(),
        prenom: String(corps.prenom ?? '').trim(),
        phone: corps.phone ? String(corps.phone).trim() : null,
        id_fonction: corps.id_fonction,
        id_minoterie: corps.id_minoterie,
      });
      if (e2) {
        await admin.auth.admin.deleteUser(cree.user.id); // annule la création du compte
        return reponse({ erreur: e2.message }, 400);
      }
      return reponse({ ok: true });
    }

    // Crée seulement le compte de connexion s'il n'existe pas (nouvel administrateur).
    // Renvoie cree: false si le compte existait déjà : son mot de passe n'est alors pas modifié.
    case 'compte': {
      const motDePasse = String(corps.mot_de_passe ?? '');
      if (motDePasse.length < 8) return reponse({ erreur: 'Le mot de passe doit contenir au moins 8 caractères.' }, 400);
      const { error } = await admin.auth.admin.createUser({ email, password: motDePasse, email_confirm: true });
      if (!error) return reponse({ ok: true, cree: true });
      if (/already|registered|exists/i.test(error.message)) return reponse({ ok: true, cree: false });
      return reponse({ erreur: error.message }, 400);
    }

    // Nouveau mot de passe, ou blocage / déblocage de la connexion
    case 'mot_de_passe':
    case 'bloquer': {
      const utilisateur = await trouverParEmail(admin, email);
      if (!utilisateur) return reponse({ erreur: 'Aucun compte de connexion pour cet email.' }, 404);

      if (corps.action === 'mot_de_passe') {
        const motDePasse = String(corps.mot_de_passe ?? '');
        if (motDePasse.length < 8) return reponse({ erreur: 'Le mot de passe doit contenir au moins 8 caractères.' }, 400);
        const { error } = await admin.auth.admin.updateUserById(utilisateur.id, { password: motDePasse });
        return error ? reponse({ erreur: error.message }, 400) : reponse({ ok: true });
      }

      const { error } = await admin.auth.admin.updateUserById(utilisateur.id, {
        ban_duration: corps.bloque ? '876000h' : 'none',
      });
      return error ? reponse({ erreur: error.message }, 400) : reponse({ ok: true });
    }

    default:
      return reponse({ erreur: 'Action inconnue.' }, 400);
  }
});

// deno-lint-ignore no-explicit-any
async function trouverParEmail(admin: any, email: string) {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 500 });
    if (error) return null;
    // deno-lint-ignore no-explicit-any
    const trouve = data.users.find((u: any) => (u.email ?? '').toLowerCase() === email);
    if (trouve) return trouve;
    if (data.users.length < 500) return null;
  }
  return null;
}
