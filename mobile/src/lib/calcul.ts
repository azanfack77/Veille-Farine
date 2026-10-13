// Reproduit exactement la colonne générée net_rendu_grossiste de la base :
// NET RENDU = Sortie usine + transport - (somme des autres déductions)
// Chaque composante porte son signe (+1 ajouté, -1 déduit) ; une composante vide = 0.
// Si la sortie usine est vide, le résultat est vide.

export const DEDUCTIONS = [
  { cle: 'cout_transport', libelle: 'Coût de transport', signe: 1 },
  { cle: 'subvention_transport', libelle: 'Subvention transport', signe: -1 },
  { cle: 'baisse_prix', libelle: 'Baisse de prix', signe: -1 },
  { cle: 'remise_paiement_comptant', libelle: 'Remise paiement comptant', signe: -1 },
  { cle: 'bpi', libelle: 'BPI', signe: -1 },
  { cle: 'ristourne_mensuelle', libelle: 'Ristourne mensuelle', signe: -1 },
  { cle: 'ristourne_trimestrielle', libelle: 'Ristourne trimestrielle', signe: -1 },
] as const;

export type CleDeduction = (typeof DEDUCTIONS)[number]['cle'];
export type CleMontant = 'sortie_usine' | CleDeduction;
export type Montants = Record<CleMontant, number | null>;

export const CLES_MONTANTS: CleMontant[] = ['sortie_usine', ...DEDUCTIONS.map((d) => d.cle)];

/** Somme des composantes avec leur signe (transport ajouté, le reste déduit). */
export function totalAjustements(m: Montants): number {
  return DEDUCTIONS.reduce((somme, d) => somme + d.signe * (m[d.cle] ?? 0), 0);
}

export function calculerNetRendu(m: Montants): number | null {
  if (m.sortie_usine == null) return null;
  return arrondi(m.sortie_usine + totalAjustements(m));
}

function arrondi(v: number): number {
  return Math.round(v * 100) / 100;
}
