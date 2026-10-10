// La session est fermée si la console n'a pas été utilisée pendant 60 jours.
// La date de dernière activité est gardée dans le navigateur.

export const JOURS_INACTIVITE = 60;
const DELAI_MS = JOURS_INACTIVITE * 24 * 60 * 60 * 1000;
const CLE = 'veille:derniere_activite';

export function noterActivite(): void {
  try {
    localStorage.setItem(CLE, String(Date.now()));
  } catch {
    // stockage indisponible (navigation privée) : la session expirera avec le navigateur
  }
}

/** Vrai si la dernière activité connue remonte à plus de 60 jours. */
export function inactifTropLongtemps(): boolean {
  try {
    const brut = localStorage.getItem(CLE);
    if (!brut) return false;
    return Date.now() - Number(brut) > DELAI_MS;
  } catch {
    return false;
  }
}

export function oublierActivite(): void {
  try {
    localStorage.removeItem(CLE);
  } catch {
    // rien à faire
  }
}
