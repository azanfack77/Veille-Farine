// Même formule que la colonne générée net_rendu_grossiste
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
export type CleMontant = 'sortie_usine' | CleDeduction | 'prix_marche_grossiste' | 'volume';
export const CLES_MONTANTS: CleMontant[] = [
  'sortie_usine',
  ...DEDUCTIONS.map((d) => d.cle),
  'prix_marche_grossiste',
  'volume',
];

export function calculerNetRendu(m: Partial<Record<CleMontant, number | null>>): number | null {
  if (m.sortie_usine == null) return null;
  const total = DEDUCTIONS.reduce((s, d) => s + (m[d.cle] ?? 0), 0);
  return Math.round((m.sortie_usine - total) * 100) / 100;
}

export function moyenne(valeurs: (number | null | undefined)[]): number | null {
  const v = valeurs.filter((x): x is number => x != null && Number.isFinite(x));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}
