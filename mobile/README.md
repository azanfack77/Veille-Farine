# Veille Farines, application mobile de veille concurrentielle

Application Android / iOS (React Native + Expo) pour saisir sur le terrain les relevés de prix
des minoteries, branchée directement sur la base Supabase `farines_db_supabase.sql`.

## Ce que fait l'application

- **Connexion** par email et mot de passe (Supabase Auth). L'email doit exister dans `tb_utilisateurs`.
- **Saisie d'un relevé** en respectant toutes les règles de la base :
  - la ville proposée dépend de la région (TCHAD, RCA, GUINEE : pas de ville) ;
  - la gamme et le segment se déduisent de la marque (pas de double saisie) ;
  - seuls les grammages autorisés pour la gamme sont proposés (pas de 5 kg en Haut de Gamme) ;
  - le **net rendu grossiste** s'affiche en direct avec le détail des déductions, le prix au kilo
    et l'écart avec le prix marché ; la base recalcule elle-même la valeur enregistrée.
- **Enchaînement rapide** : après l'enregistrement, la date, la région et la ville restent remplies
  pour relever la marque suivante au même endroit.
- **Hors ligne** : chaque relevé est d'abord écrit sur le téléphone puis envoyé automatiquement
  au retour du réseau (démarrage, reconnexion, retour dans l'appli, toutes les 5 minutes).
  Un identifiant unique (`client_uuid`) empêche les doublons si un envoi est répété.
- **Historique** des relevés envoyés (vue `v_veille_concurrentielle`) et de ceux en attente,
  avec le motif en cas de refus par le serveur.
- **Compte** : état des envois, mise à jour des listes (marques, villes…), déconnexion protégée
  s'il reste des relevés non envoyés.

## Mise en place

### 1. Base de données Supabase

1. Si ce n'est pas déjà fait, exécutez `farines_db_supabase.sql` dans *SQL Editor*.
2. Exécutez ensuite **`../supabase/sql/02_migration_app.sql`** (droits d'accès, lien compte ↔ utilisateur,
   anti-doublon). Il peut être relancé sans risque.

> ⚠️ Ne relancez plus `farines_db_supabase.sql` une fois la collecte commencée : il commence par
> `DROP TABLE … CASCADE` et effacerait tous les relevés.

### 2. Créer les enquêteurs

Pour chaque personne :

1. *Authentication > Users > Add user* : email + mot de passe (cochez *Auto Confirm User*).
2. Ajoutez la ligne correspondante dans `tb_utilisateurs` **avec exactement le même email**
   (minoterie CADYST GRAIN ou SGMC ; un exemple SQL est en bas de `migration_app.sql`).

Conseil : dans *Authentication > Providers > Email*, désactivez *Allow new users to sign up*
pour que seuls les comptes que vous créez puissent se connecter.

### 3. Lancer l'application

Prérequis : Node.js 20 ou plus.

```bash
# Le fichier .env est déjà configuré pour votre projet Supabase
npm install
npx expo install expo@latest && npx expo install --fix   # aligne sur la version d'Expo Go actuelle
npx expo start
```

Scannez le QR code avec l'application **Expo Go** sur le téléphone (Android ou iOS).

### 4. Générer l'APK à distribuer

```bash
npm install -g eas-cli
eas login
eas build -p android --profile apk
```

EAS fournit un lien de téléchargement de l'APK à installer sur les téléphones des commerciaux.
Pensez à déclarer les deux variables `EXPO_PUBLIC_…` dans EAS (*eas env:create*) ou à garder le
fichier `.env` présent lors du build.

## Structure

```
app/
  _layout.tsx           polices, session, redirection vers la connexion
  connexion.tsx
  (tabs)/index.tsx      saisie d'un relevé
  (tabs)/historique.tsx
  (tabs)/compte.tsx
src/
  lib/calcul.ts         formule du net rendu (identique à la colonne générée)
  lib/fileAttente.ts    stockage local + envoi, traduction des erreurs de contrainte
  lib/referentiel.ts    téléchargement et cache des listes
  components/           cascade du net rendu, sélecteur de marque, champs…
../supabase/sql/02_migration_app.sql
```

## Aller plus loin

- **Responsables** : un exemple de politique pour lire tous les relevés est fourni (commenté)
  dans `migration_app.sql`.
- **Tableau de bord** : la vue `v_veille_concurrentielle` se branche directement sur Power BI
  ou Excel (connecteur PostgreSQL) pour analyser les relevés.
- **Unité du volume** : l'application l'affiche en sacs ; modifiez `unite="sacs"` dans
  `app/(tabs)/index.tsx` si vous suivez une autre unité (tonnes…).
