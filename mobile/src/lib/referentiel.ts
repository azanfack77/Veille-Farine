import AsyncStorage from '@react-native-async-storage/async-storage';
import { MODE_DEMO, REFERENTIEL_DEMO } from './demo';
import { supabase } from './supabase';
import type { Referentiel } from './types';

const CLE_CACHE = 'veille:referentiel';

async function lire<T>(table: string, colonnes: string, tri: string): Promise<T[]> {
  const { data, error } = await supabase.from(table).select(colonnes).order(tri);
  if (error) throw error;
  return (data ?? []) as T[];
}

export type ResultatReferentiel = { ref: Referentiel; source: 'reseau' | 'cache' };

/**
 * Télécharge les listes (régions, villes, marques…) et les garde sur le téléphone.
 * Hors ligne, renvoie la dernière copie enregistrée.
 */
export async function chargerReferentiel(): Promise<ResultatReferentiel> {
  if (MODE_DEMO) return { ref: REFERENTIEL_DEMO, source: 'cache' };
  try {
    const [regions, villes, grammages, segments, gammes, minoteries, marques, gammeGrammages] =
      await Promise.all([
        lire<Referentiel['regions'][number]>('tb_regions', 'id_region,code_region', 'id_region'),
        lire<Referentiel['villes'][number]>('tb_villes', 'id_ville,nom_ville,id_region', 'nom_ville'),
        lire<Referentiel['grammages'][number]>('tb_grammages', 'id_grammage,valeur_kg', 'valeur_kg'),
        lire<Referentiel['segments'][number]>('tb_segments', 'id_segment,nom_segment', 'id_segment'),
        lire<Referentiel['gammes'][number]>('tb_gammes', 'id_gamme,nom_gamme,id_segment', 'id_gamme'),
        lire<Referentiel['minoteries'][number]>('tb_minoteries', 'id_minoterie,nom_minoterie', 'nom_minoterie'),
        lire<Referentiel['marques'][number]>('tb_marques', 'id_marque,nom_marque,id_gamme,id_minoterie', 'nom_marque'),
        lire<Referentiel['gammeGrammages'][number]>('tb_gamme_grammages', 'id_gamme,id_grammage', 'id_gamme'),
      ]);

    if (regions.length === 0 || marques.length === 0) {
      throw new ErreurConfiguration(
        "Les listes sont vides : vérifiez que le script supabase/migration_app.sql a bien été exécuté (droits de lecture).",
      );
    }

    const ref: Referentiel = {
      regions, villes, grammages, segments, gammes, minoteries, marques, gammeGrammages,
      majLe: new Date().toISOString(),
    };
    await AsyncStorage.setItem(CLE_CACHE, JSON.stringify(ref));
    return { ref, source: 'reseau' };
  } catch (e) {
    if (e instanceof ErreurConfiguration) throw e;
    const brut = await AsyncStorage.getItem(CLE_CACHE);
    if (brut) return { ref: JSON.parse(brut) as Referentiel, source: 'cache' };
    throw new Error(
      'Listes indisponibles. Connectez le téléphone à internet une première fois pour les télécharger.',
    );
  }
}

class ErreurConfiguration extends Error {}
