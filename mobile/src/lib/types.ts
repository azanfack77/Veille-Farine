import type { Montants } from './calcul';

export type Region = { id_region: number; code_region: string };
export type Ville = { id_ville: number; nom_ville: string; id_region: number };
export type Grammage = { id_grammage: number; valeur_kg: number };
export type Segment = { id_segment: number; nom_segment: string };
export type Gamme = { id_gamme: number; nom_gamme: string; id_segment: number };
export type Minoterie = { id_minoterie: number; nom_minoterie: string };
export type Marque = { id_marque: number; nom_marque: string; id_gamme: number; id_minoterie: number };
export type GammeGrammage = { id_gamme: number; id_grammage: number };

export type Referentiel = {
  regions: Region[];
  villes: Ville[];
  grammages: Grammage[];
  segments: Segment[];
  gammes: Gamme[];
  minoteries: Minoterie[];
  marques: Marque[];
  gammeGrammages: GammeGrammage[];
  majLe: string;
};

export type Utilisateur = {
  id_utilisateur: number;
  nom: string;
  prenom: string;
  email: string;
  id_minoterie: number;
};

/** Ligne envoyée à tb_veille_concurrentielle (net_rendu_grossiste est calculé par la base). */
export type SaisieVeille = Montants & {
  client_uuid: string;
  date_veille: string;
  id_utilisateur: number;
  id_region: number;
  id_ville: number | null;
  id_marque: number;
  id_gamme: number;
  id_grammage: number;
  volume: number | null;
  prix_marche_grossiste: number | null;
};

export type ElementFile = {
  saisie: SaisieVeille;
  libelle: { marque: string; grammage_kg: number; region: string; ville: string | null };
  creeLe: string;
  statut: 'en_attente' | 'refuse';
  erreur?: string;
};

/** Ligne de la vue v_veille_concurrentielle. */
export type LigneVeille = {
  id_veille: number;
  date_veille: string;
  region: string;
  ville: string | null;
  marque: string;
  grammage_kg: number;
  minoterie: string;
  segment: string;
  sortie_usine: number | null;
  net_rendu_grossiste: number | null;
  prix_marche_grossiste: number | null;
  volume: number | null;
};
