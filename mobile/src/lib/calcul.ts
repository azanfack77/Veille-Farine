// Reproduit exactement la colonne générée net_rendu_grossiste de la base :
// NET RENDU = Sortie usine - (somme des déductions, une déduction vide = 0)
// Si la sortie usine est vide, le résultat est vide.

export const DEDUCTIONS = [
  { cle: 'cout_transport', libelle: 'Coût de transport' },
  { cle: 'subvention_transport', libelle: 'Subvention transport' },
  { cle: 'baisse_prix', libelle: 'Baisse de prix' },
  { cle: 'remise_paiement_comptant', libelle: 'Remise paiement comptant' },
  { cle: 'bpi', libelle: 'BPI' },
  { cle: 'ristourne_mensuelle', libelle: 'Ristourne mensuelle' },
  { cle: 'ristourne_trimestrielle', libelle: 'Ristourne trimestrielle' },
] as const;

export type CleDeduction = (typeof DEDUCTIONS)[number]['cle'];
export type CleMontant = 'sortie_usine' | CleDeduction;
export type Montants = Record<CleMontant, number | null>;

export const CLES_MONTANTS: CleMontant[] = ['sortie_usine', ...DEDUCTIONS.map((d) => d.cle)];

export function totalDeductions(m: Montants): number {
  return DEDUCTIONS.reduce((somme, d) => somme + (m[d.cle] ?? 0), 0);
}

export function calculerNetRendu(m: Montants): number | null {
  if (m.sortie_usine == null) return null;
  return arrondi(m.sortie_usine - totalDeductions(m));
}

function arrondi(v: number): number {
  return Math.round(v * 100) / 100;
}
