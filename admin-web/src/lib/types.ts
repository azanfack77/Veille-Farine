export type Region = { id_region: number; code_region: string };
export type Ville = { id_ville: number; nom_ville: string; id_region: number };
export type Grammage = { id_grammage: number; valeur_kg: number };
export type Segment = { id_segment: number; nom_segment: string };
export type Gamme = { id_gamme: number; nom_gamme: string; id_segment: number };
export type Minoterie = { id_minoterie: number; nom_minoterie: string; autorisee_utilisateurs: boolean };
export type Marque = { id_marque: number; nom_marque: string; id_gamme: number; id_minoterie: number };
export type GammeGrammage = { id_gamme: number; id_grammage: number };
export type Fonction = { id_fonction: number; nom_fonction: string };

export type Referentiel = {
  regions: Region[];
  villes: Ville[];
  grammages: Grammage[];
  segments: Segment[];
  gammes: Gamme[];
  minoteries: Minoterie[];
  marques: Marque[];
  gammeGrammages: GammeGrammage[];
  fonctions: Fonction[];
};

export type Utilisateur = {
  id_utilisateur: number;
  nom: string;
  prenom: string;
  email: string;
  phone: string | null;
  id_fonction: number | null;
  id_minoterie: number;
  actif: boolean;
};

export type Releve = {
  id_veille: number;
  date_veille: string;
  cree_le: string;
  id_utilisateur: number;
  utilisateur: string;
  id_region: number;
  region: string;
  id_ville: number | null;
  ville: string | null;
  id_marque: number;
  marque: string;
  id_minoterie: number;
  minoterie: string;
  id_gamme: number;
  gamme: string;
  id_segment: number;
  segment: string;
  id_grammage: number;
  grammage_kg: number;
  sortie_usine: number | null;
  cout_transport: number | null;
  subvention_transport: number | null;
  baisse_prix: number | null;
  remise_paiement_comptant: number | null;
  bpi: number | null;
  ristourne_mensuelle: number | null;
  ristourne_trimestrielle: number | null;
  net_rendu_grossiste: number | null;
  prix_marche_grossiste: number | null;
  volume: number | null;
};
