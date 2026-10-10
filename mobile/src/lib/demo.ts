import type { Session } from '@supabase/supabase-js';
import type { Referentiel, Utilisateur } from './types';

// Mode démonstration : saute la connexion et utilise des listes locales.
// Actif uniquement en développement, avec EXPO_PUBLIC_DEMO=1 (voir « npm run demo »).
// Aucune session Supabase n'existe : les relevés restent dans la file du téléphone.
export const MODE_DEMO = __DEV__ && process.env.EXPO_PUBLIC_DEMO === '1';

export const SESSION_DEMO = { user: { id: 'demo', email: 'demo@exemple.cm' } } as Session;

export const UTILISATEUR_DEMO: Utilisateur = {
  id_utilisateur: 0,
  nom: 'DÉMO',
  prenom: 'Enquêteur',
  email: 'demo@exemple.cm',
  id_minoterie: 3,
};

// Extrait de supabase/sql/01_farines_db_supabase.sql
export const REFERENTIEL_DEMO: Referentiel = {
  regions: [
    { id_region: 1, code_region: 'LSO' },
    { id_region: 2, code_region: 'CS' },
    { id_region: 3, code_region: 'ONO' },
  ],
  villes: [
    { id_ville: 1, nom_ville: 'DOUALA', id_region: 1 },
    { id_ville: 2, nom_ville: 'KRIBI', id_region: 1 },
    { id_ville: 3, nom_ville: 'CENTRE', id_region: 2 },
    { id_ville: 4, nom_ville: 'SUD', id_region: 2 },
    { id_ville: 5, nom_ville: 'BAFOUSSAM', id_region: 3 },
    { id_ville: 6, nom_ville: 'DSCHANG', id_region: 3 },
  ],
  grammages: [
    { id_grammage: 1, valeur_kg: 5 },
    { id_grammage: 2, valeur_kg: 25 },
    { id_grammage: 3, valeur_kg: 50 },
  ],
  segments: [
    { id_segment: 1, nom_segment: 'Beignets' },
    { id_segment: 2, nom_segment: 'Boulangeres' },
  ],
  gammes: [
    { id_gamme: 1, nom_gamme: 'Beignets', id_segment: 1 },
    { id_gamme: 2, nom_gamme: 'Standard', id_segment: 2 },
    { id_gamme: 3, nom_gamme: 'Moyen de Gamme', id_segment: 2 },
    { id_gamme: 4, nom_gamme: 'Haut de Gamme', id_segment: 2 },
  ],
  minoteries: [
    { id_minoterie: 1, nom_minoterie: 'AFISA' },
    { id_minoterie: 3, nom_minoterie: 'CADYST GRAIN' },
    { id_minoterie: 5, nom_minoterie: 'MIMOSA' },
    { id_minoterie: 6, nom_minoterie: 'OLAM' },
  ],
  marques: [
    { id_marque: 1, nom_marque: 'MAMA MAKALA', id_gamme: 1, id_minoterie: 1 },
    { id_marque: 2, nom_marque: 'CHOIX DU BOULANGER', id_gamme: 2, id_minoterie: 1 },
    { id_marque: 3, nom_marque: 'PRIMO', id_gamme: 4, id_minoterie: 1 },
    { id_marque: 4, nom_marque: 'AMIGO', id_gamme: 1, id_minoterie: 3 },
    { id_marque: 5, nom_marque: 'CAMEROUNAISE', id_gamme: 2, id_minoterie: 3 },
    { id_marque: 6, nom_marque: 'COLOMBE', id_gamme: 3, id_minoterie: 3 },
    { id_marque: 7, nom_marque: 'PELICAN', id_gamme: 4, id_minoterie: 3 },
    { id_marque: 8, nom_marque: 'TESSA MAKALA', id_gamme: 1, id_minoterie: 5 },
    { id_marque: 9, nom_marque: 'TESSA PREMIUM', id_gamme: 3, id_minoterie: 5 },
    { id_marque: 10, nom_marque: 'BIJOU MAMMY', id_gamme: 1, id_minoterie: 6 },
    { id_marque: 11, nom_marque: 'BIJOU STAND', id_gamme: 2, id_minoterie: 6 },
  ],
  gammeGrammages: [
    { id_gamme: 1, id_grammage: 1 },
    { id_gamme: 1, id_grammage: 2 },
    { id_gamme: 1, id_grammage: 3 },
    { id_gamme: 2, id_grammage: 2 },
    { id_gamme: 2, id_grammage: 3 },
    { id_gamme: 3, id_grammage: 3 },
    { id_gamme: 4, id_grammage: 3 },
  ],
  majLe: new Date().toISOString(),
};
