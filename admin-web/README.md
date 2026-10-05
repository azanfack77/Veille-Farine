# Veille Farines, console d'administration web

Application web (React + Vite) réservée aux administrateurs. Elle utilise la même base Supabase
que l'application mobile.

## Fonctions

- **Tableau de bord** : nombre de relevés, enquêteurs actifs, couverture des marques et des régions ;
  net rendu grossiste moyen par marque, avec votre minoterie en doré ; évolution hebdomadaire par
  minoterie ; écart de chaque marque avec la vôtre dans la même gamme ; activité des enquêteurs.
  Les prix ne sont comparés qu'à taille de sac identique.
- **Relevés** : recherche par période, région, minoterie, marque, segment, sac et enquêteur.
  Vous pouvez corriger un relevé (date, ville, montants), et le net rendu est recalculé par la base.
  Vous pouvez aussi supprimer un relevé, ou exporter la sélection en CSV (s'ouvre directement dans Excel).
- **Enquêteurs** : création du compte de connexion et de la fiche en une seule étape, modification,
  nouveau mot de passe, désactivation. Un enquêteur désactivé ne peut plus se connecter ni saisir,
  et ses relevés sont conservés.
- **Listes de référence** : marques, minoteries, régions, villes, gammes, segments, tailles de sac,
  fonctions, et la grille « sacs par gamme ». Un élément déjà utilisé ne peut pas être supprimé :
  la console l'explique au lieu d'échouer silencieusement.
- **Administrateurs** : ajout et retrait des personnes qui ont accès à la console.

## Installation

### 1. Base de données

Dans Supabase > SQL Editor, exécutez **`../supabase/sql/03_migration_admin.sql`**. Il doit passer après
`farines_db_supabase.sql` et `migration_app.sql`. Ensuite, déclarez le premier administrateur :

```sql
INSERT INTO tb_administrateurs (email) VALUES ('votre.email@entreprise.cm');
```

Ce compte doit aussi exister dans *Authentication > Users*.

### 2. Fonction de gestion des comptes

La création des comptes de connexion demande la clé secrète `service_role`. Pour qu'elle ne soit
jamais exposée dans le navigateur, elle est utilisée dans une fonction Edge exécutée par Supabase :

```bash
npm install -g supabase
supabase login
supabase link --project-ref bktwecnhdrnkvcjdiext
supabase functions deploy admin-utilisateurs --no-verify-jwt
```

L'option `--no-verify-jwt` est recommandée avec les nouvelles clés Supabase (`sb_publishable_…`) :
la fonction vérifie elle-même, auprès de la base, que l'appelant est administrateur.

Sans cette fonction, toute la console fonctionne, sauf la création, le changement de mot de passe
et le blocage des comptes. Dans ce cas, créez les comptes à la main dans *Authentication > Users*.

### 3. Lancer la console

```bash
npm install              # le fichier .env est déjà configuré pour votre projet
npm run dev              # http://localhost:5173
```

### 4. Mettre en ligne

```bash
npm run build            # produit le dossier dist/
```

Déposez `dist/` sur Netlify, Vercel ou tout hébergement statique. Déploiement recommandé : Netlify relié au dépôt GitHub (voir le README à la racine). Les fichiers `public/_redirects`
(Netlify) et `vercel.json` (Vercel) sont déjà prêts pour la navigation entre les pages.
Déclarez `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` dans les variables d'environnement
de l'hébergeur.

## Sécurité

- Toutes les règles d'accès sont appliquées **dans la base** (RLS) par la fonction `fn_est_admin()`.
  Une personne qui n'est pas dans `tb_administrateurs` ne voit que ses propres relevés, même si
  elle ouvre la console.
- La clé `service_role` reste uniquement dans la fonction Edge.
