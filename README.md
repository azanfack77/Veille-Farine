# Veille Farines

Collecte terrain des prix des minoteries concurrentes, avec :

| Dossier | Contenu | Mise en ligne |
|---|---|---|
| `mobile/` | Application Android / iOS des enquêteurs (Expo) | APK construit par Expo (EAS), déclenché depuis GitHub |
| `admin-web/` | Console d'administration (React) | Netlify, republiée à chaque push |
| `supabase/sql/` | Scripts de la base, à exécuter **à la main**, dans l'ordre | Supabase > SQL Editor |
| `supabase/functions/` | Fonction de gestion des comptes | Redéployée par GitHub Actions |

## Mise en place (une seule fois)

### 1. Base de données

Dans Supabase > SQL Editor, exécutez dans l'ordre `01_…`, `02_…`, `03_…` du dossier `supabase/sql/`.
Puis créez votre compte dans *Authentication > Users > Add user > Create new user* (cochez
*Auto Confirm User* ; si un mot de passe est demandé, mettez-en un au hasard : il ne sert pas) et
déclarez-vous administrateur :

```sql
INSERT INTO tb_administrateurs (email) VALUES ('votre.email@...');
```

Les administrateurs suivants s'ajoutent depuis la console, qui crée leur compte de connexion.

### 1 bis. Connexion par code reçu par email

Les deux applications n'utilisent **pas de mot de passe** : l'utilisateur saisit son email, reçoit un
code, et le recopie. Dans Supabase :

1. **Envoi des emails (obligatoire)** : *Authentication > Emails > SMTP Settings*, renseignez un
   serveur SMTP (messagerie de l'entreprise, Brevo, SendGrid…). Sans cela, Supabase n'envoie des
   emails qu'aux membres de l'équipe du projet Supabase, et seulement quelques-uns par heure.
2. **Modèle d'email (obligatoire)** : *Authentication > Emails > Templates > Magic Link*, remplacez
   le contenu par un texte qui contient `{{ .Token }}`, par exemple :

   - Sujet : `Votre code de connexion Veille Farines`
   - Corps : `<p>Votre code de connexion : <strong>{{ .Token }}</strong></p><p>Il expire dans une heure. Si vous n'avez rien demandé, ignorez cet email.</p>`

   Sans `{{ .Token }}`, l'email contient un lien au lieu d'un code, et la connexion échoue.
3. **Inscriptions** : *Authentication > Sign In / Providers > Email*, désactivez *Allow new users to
   sign up*. Seuls les comptes créés depuis la console peuvent se connecter.

**Déconnexion après 60 jours d'inactivité** : chaque application ferme la session si elle n'a pas
été utilisée pendant 60 jours (application mobile non ouverte ; console sans clic ni frappe). Il faut
alors redemander un code. Avec un abonnement Supabase Pro, vous pouvez ajouter la même règle côté
serveur : *Authentication > Sessions > Inactivity timeout* = `1440` heures.

> ⚠️ `01_farines_db_supabase.sql` commence par supprimer les tables. Ne le relancez jamais une
> fois la collecte commencée. C'est pour cette raison qu'aucun script SQL n'est automatisé.

### 2. Préparer l'application mobile (sur votre ordinateur)

```bash
cd mobile
npm install
npx expo install expo@latest
npx expo install --fix
npm install -g eas-cli
eas login
eas build -p android --profile apk
```

Cette première construction se fait sur votre ordinateur. Elle crée le projet chez Expo (elle
ajoute son identifiant dans `app.json`) et génère la clé de signature Android : répondez **Yes**
aux deux questions. Les constructions suivantes pourront partir de GitHub.

### 3. Envoyer le code sur GitHub

Créez un dépôt **privé** vide nommé `veille-farines` sur github.com, puis, depuis ce dossier :

```bash
git init
git add .
git commit -m "Version initiale"
git branch -M main
git remote add origin https://github.com/VOTRE-COMPTE/veille-farines.git
git push -u origin main
```

### 4. Secrets GitHub

Dans le dépôt, ouvrez *Settings > Secrets and variables > Actions*.

| Type | Nom | Valeur |
|---|---|---|
| Secret | `SUPABASE_ACCESS_TOKEN` | supabase.com > Account > Access Tokens > Generate new token |
| Secret | `EXPO_TOKEN` | expo.dev > Account settings > Access tokens > Create token |
| Variable | `SUPABASE_PROJECT_REF` | `bktwecnhdrnkvcjdiext` |

Ensuite, dans l'onglet *Actions*, lancez une fois « Supabase - fonction admin-utilisateurs »
(bouton *Run workflow*) pour déployer la fonction.

### 5. Relier Netlify

Sur app.netlify.com, cliquez sur *Add new site*, puis *Import an existing project*, puis choisissez
GitHub et le dépôt `veille-farines`. Netlify lit `netlify.toml` : ne changez aucun réglage de
construction. Avant de cliquer sur **Deploy**, ajoutez dans *Environment variables* :

| Nom | Valeur |
|---|---|
| `VITE_SUPABASE_URL` | l'URL du projet Supabase (voir `admin-web/.env.example`) |
| `VITE_SUPABASE_ANON_KEY` | la clé **publishable** (ou ancienne clé `anon`) |

Sans ces deux variables, la console affiche « configuration manquante ». Si vous les ajoutez
après coup, relancez une publication (*Deploys > Trigger deploy*).

Ensuite, dans Supabase, ouvrez *Authentication > URL Configuration* et mettez l'adresse Netlify
dans *Site URL*.

## Au quotidien

| Vous faites… | Il se passe… |
|---|---|
| un push qui modifie `admin-web/` | GitHub vérifie la compilation, Netlify republie la console (1 à 2 min) |
| un push qui modifie `supabase/functions/` | GitHub redéploie la fonction Edge |
| *Actions > Mobile - construire l'APK > Run workflow* | Expo construit un nouvel APK. Le lien apparaît sur expo.dev (10 à 20 min) |
| `git tag v1.0.1 && git push --tags` | Même chose, pour une version numérotée. Augmentez aussi `version` dans `mobile/app.json` |
| une modification de la base | Ajoutez un script `04_…sql` et exécutez-le à la main dans Supabase |

## À propos des fichiers `.env`

Ils ne contiennent que l'URL du projet et la clé **publishable**, qui est publique par conception
(la sécurité repose sur les règles RLS de la base).

- `mobile/.env` est versionné : EAS Build en a besoin pour construire l'APK.
- `admin-web/.env` n'est **pas** versionné : copiez `admin-web/.env.example` pour travailler en
  local, et renseignez les variables dans Netlify (étape 5).

N'ajoutez **jamais** la clé secrète (`sb_secret_…` / `service_role`) au dépôt.

## Tester l'application mobile sur l'ordinateur

```bash
cd mobile
npm run demo
```

Ouvre l'application dans le navigateur (http://localhost:8081, affichage téléphone avec F12 puis
Ctrl+Maj+M), **sans connexion** et avec des listes d'exemple. Les relevés restent sur l'ordinateur et
ne sont jamais envoyés à la base. Ce mode n'existe qu'en développement : l'APK affiche toujours
l'écran de connexion. Le calendrier « Autre date » ne fonctionne pas dans le navigateur.
