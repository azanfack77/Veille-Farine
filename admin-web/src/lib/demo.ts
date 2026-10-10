import type { Session } from '@supabase/supabase-js';
import type { Referentiel } from './types';

// Mode démonstration : saute la connexion pour voir les pages internes.
// Actif uniquement en développement, avec VITE_DEMO=1 (voir « npm run demo »).
// Aucune session Supabase n'existe : les pages qui lisent la base affichent une erreur de droits.
export const MODE_DEMO = import.meta.env.DEV && import.meta.env.VITE_DEMO === '1';

const ID_CADYST_GRAIN = 3;
const ID_SGMC = 9;

export const SESSION_DEMO = {
  user: { id: 'demo', email: 'demo@cadyst.com' },
} as Session;

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
    { id_ville: 5, nom_ville: 'BAFOUSSAM', id_region: 3 },
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
    { id_minoterie: 1, nom_minoterie: 'AFISA', autorisee_utilisateurs: false },
    { id_minoterie: ID_CADYST_GRAIN, nom_minoterie: 'CADYST GRAIN', autorisee_utilisateurs: true },
    { id_minoterie: 6, nom_minoterie: 'OLAM', autorisee_utilisateurs: false },
    { id_minoterie: ID_SGMC, nom_minoterie: 'SGMC', autorisee_utilisateurs: true },
  ],
  marques: [
    { id_marque: 1, nom_marque: 'MAMA MAKALA', id_gamme: 1, id_minoterie: 1 },
    { id_marque: 4, nom_marque: 'AMIGO', id_gamme: 1, id_minoterie: ID_CADYST_GRAIN },
    { id_marque: 5, nom_marque: 'CAMEROUNAISE', id_gamme: 2, id_minoterie: ID_CADYST_GRAIN },
    { id_marque: 7, nom_marque: 'PELICAN', id_gamme: 4, id_minoterie: ID_CADYST_GRAIN },
    { id_marque: 10, nom_marque: 'BIJOU MAMMY', id_gamme: 1, id_minoterie: 6 },
    { id_marque: 20, nom_marque: 'ASSO', id_gamme: 1, id_minoterie: ID_SGMC },
    { id_marque: 21, nom_marque: 'DUO', id_gamme: 2, id_minoterie: ID_SGMC },
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
  fonctions: [{ id_fonction: 1, nom_fonction: 'Commercial' }],
};
