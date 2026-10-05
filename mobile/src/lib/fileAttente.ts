import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import type { PostgrestError } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { ElementFile } from './types';

// Chaque relevé est d'abord écrit sur le téléphone, puis envoyé dès que possible.
// client_uuid garantit qu'un relevé renvoyé deux fois n'est enregistré qu'une fois.

const CLE_FILE = 'veille:file_attente';
const CLE_DERNIERE_SYNC = 'veille:derniere_sync';

type Ecouteur = (file: ElementFile[]) => void;
const ecouteurs = new Set<Ecouteur>();

export async function lireFile(): Promise<ElementFile[]> {
  const brut = await AsyncStorage.getItem(CLE_FILE);
  return brut ? (JSON.parse(brut) as ElementFile[]) : [];
}

async function ecrireFile(file: ElementFile[]): Promise<void> {
  await AsyncStorage.setItem(CLE_FILE, JSON.stringify(file));
  ecouteurs.forEach((fn) => fn(file));
}

export function ecouterFile(fn: Ecouteur): () => void {
  ecouteurs.add(fn);
  return () => {
    ecouteurs.delete(fn);
  };
}

export async function ajouterALaFile(element: ElementFile): Promise<void> {
  const file = await lireFile();
  await ecrireFile([...file, element]);
}

export async function retirerDeLaFile(clientUuid: string): Promise<void> {
  const file = await lireFile();
  await ecrireFile(file.filter((e) => e.saisie.client_uuid !== clientUuid));
}

export async function lireDerniereSync(): Promise<string | null> {
  return AsyncStorage.getItem(CLE_DERNIERE_SYNC);
}

export type ResultatSync = { envoyes: number; restants: number; horsLigne: boolean };

let enCours: Promise<ResultatSync> | null = null;

/** Envoie les relevés en attente. Les appels simultanés partagent le même envoi. */
export function synchroniser(): Promise<ResultatSync> {
  if (!enCours) {
    enCours = envoyer().finally(() => {
      enCours = null;
    });
  }
  return enCours;
}

async function envoyer(): Promise<ResultatSync> {
  const file = await lireFile();
  if (file.length === 0) return { envoyes: 0, restants: 0, horsLigne: false };

  const reseau = await NetInfo.fetch();
  if (reseau.isConnected === false) return { envoyes: 0, restants: file.length, horsLigne: true };

  const { data } = await supabase.auth.getSession();
  if (!data.session) return { envoyes: 0, restants: file.length, horsLigne: false };

  const envoyes = new Set<string>();
  const refus = new Map<string, string>();
  let horsLigne = false;

  for (const element of file) {
    const { error } = await supabase
      .from('tb_veille_concurrentielle')
      .upsert(element.saisie, { onConflict: 'client_uuid', ignoreDuplicates: true });

    if (!error) {
      envoyes.add(element.saisie.client_uuid);
    } else if (estTemporaire(error)) {
      horsLigne = true;
      break;
    } else {
      refus.set(element.saisie.client_uuid, traduireErreur(error));
    }
  }

  // Relit la file : un relevé a pu être ajouté pendant l'envoi
  const actuelle = await lireFile();
  const miseAJour = actuelle
    .filter((e) => !envoyes.has(e.saisie.client_uuid))
    .map((e): ElementFile => {
      const message = refus.get(e.saisie.client_uuid);
      return message ? { ...e, statut: 'refuse', erreur: message } : e;
    });
  await ecrireFile(miseAJour);

  if (!horsLigne) await AsyncStorage.setItem(CLE_DERNIERE_SYNC, new Date().toISOString());
  return { envoyes: envoyes.size, restants: miseAJour.length, horsLigne };
}

function estTemporaire(e: PostgrestError): boolean {
  if (!e.code) return true; // erreur réseau : pas de code PostgreSQL
  if (e.code === 'PGRST301' || e.code === 'PGRST303') return true; // jeton expiré
  return /network|fetch|timeout|failed to fetch/i.test(e.message);
}

function traduireErreur(e: PostgrestError): string {
  const texte = `${e.message} ${e.details ?? ''}`;
  if (e.code === '42501')
    return "Votre compte n'est pas autorisé à enregistrer : votre email doit figurer dans tb_utilisateurs.";
  if (texte.includes('fk_veille_ville_region')) return "La ville ne fait pas partie de la région choisie.";
  if (texte.includes('fk_veille_marque_gamme')) return 'La gamme ne correspond pas à la marque.';
  if (texte.includes('fk_veille_gamme_grammage')) return "Ce grammage n'existe pas pour cette gamme.";
  if (e.code === '23503') return 'Une valeur de référence est introuvable : mettez à jour les listes.';
  return e.message;
}
