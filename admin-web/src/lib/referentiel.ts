import { supabase } from './supabase';
import type { Referentiel } from './types';

async function lire<T>(table: string, tri: string): Promise<T[]> {
  const { data, error } = await supabase.from(table).select('*').order(tri);
  if (error) throw error;
  return (data ?? []) as T[];
}

export async function chargerReferentiel(): Promise<Referentiel> {
  const [regions, villes, grammages, segments, gammes, minoteries, marques, gammeGrammages, fonctions] =
    await Promise.all([
      lire<Referentiel['regions'][number]>('tb_regions', 'id_region'),
      lire<Referentiel['villes'][number]>('tb_villes', 'nom_ville'),
      lire<Referentiel['grammages'][number]>('tb_grammages', 'valeur_kg'),
      lire<Referentiel['segments'][number]>('tb_segments', 'id_segment'),
      lire<Referentiel['gammes'][number]>('tb_gammes', 'id_gamme'),
      lire<Referentiel['minoteries'][number]>('tb_minoteries', 'nom_minoterie'),
      lire<Referentiel['marques'][number]>('tb_marques', 'nom_marque'),
      lire<Referentiel['gammeGrammages'][number]>('tb_gamme_grammages', 'id_gamme'),
      lire<Referentiel['fonctions'][number]>('tb_fonctions', 'nom_fonction'),
    ]);
  return { regions, villes, grammages, segments, gammes, minoteries, marques, gammeGrammages, fonctions };
}
