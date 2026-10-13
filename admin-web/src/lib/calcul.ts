// Même formule que la colonne générée net_rendu_grossiste :
// NET RENDU = Sortie usine + transport - (somme des autres déductions)
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
export type CleMontant = 'sortie_usine' | CleDeduction | 'prix_marche_grossiste' | 'volume';
export const CLES_MONTANTS: CleMontant[] = [
  'sortie_usine',
  ...DEDUCTIONS.map((d) => d.cle),
  'prix_marche_grossiste',
  'volume',
];

export function calculerNetRendu(m: Partial<Record<CleMontant, number | null>>): number | null {
  if (m.sortie_usine == null) return null;
  const total = DEDUCTIONS.reduce((s, d) => s + d.signe * (m[d.cle] ?? 0), 0);
  return Math.round((m.sortie_usine + total) * 100) / 100;
}

export function moyenne(valeurs: (number | null | undefined)[]): number | null {
  const v = valeurs.filter((x): x is number => x != null && Number.isFinite(x));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}
