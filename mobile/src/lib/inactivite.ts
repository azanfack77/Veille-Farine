import AsyncStorage from '@react-native-async-storage/async-storage';

// La session est fermée si l'application n'a pas été utilisée pendant 60 jours.
// La date de dernière activité est notée à la connexion et à chaque retour au premier plan.

export const JOURS_INACTIVITE = 60;
const DELAI_MS = JOURS_INACTIVITE * 24 * 60 * 60 * 1000;
const CLE = 'veille:derniere_activite';

export async function noterActivite(): Promise<void> {
  await AsyncStorage.setItem(CLE, String(Date.now()));
}

/** Vrai si la dernière activité connue remonte à plus de 60 jours. */
export async function inactifTropLongtemps(): Promise<boolean> {
  const brut = await AsyncStorage.getItem(CLE);
  if (!brut) return false; // première ouverture depuis l'installation de cette version
  return Date.now() - Number(brut) > DELAI_MS;
}

export async function oublierActivite(): Promise<void> {
  await AsyncStorage.removeItem(CLE);
}
