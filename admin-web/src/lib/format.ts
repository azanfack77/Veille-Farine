const FINE = '\u202F';

export function formatNombre(v: number | null | undefined, decimales = 0): string {
  if (v == null || !Number.isFinite(v)) return '—';
  const neg = v < 0;
  const [ent, frac] = Math.abs(v).toFixed(decimales).split('.');
  const groupes = ent.replace(/\B(?=(\d{3})+(?!\d))/g, FINE);
  return (neg ? '−' : '') + groupes + (frac ? ',' + frac : '');
}

export function parseNombre(t: string): number | null {
  const n = t.replace(/[\s\u00A0\u202F]/g, '').replace(',', '.');
  if (n === '') return null;
  const v = Number(n);
  return Number.isFinite(v) ? v : null;
}

const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

export function formatDate(iso: string): string {
  const [a, m, j] = iso.slice(0, 10).split('-').map(Number);
  return `${j} ${MOIS[m - 1]} ${a}`;
}

export function dateISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function ilYA(jours: number): string {
  const d = new Date();
  d.setDate(d.getDate() - jours);
  return dateISO(d);
}

/** Lundi de la semaine d'une date AAAA-MM-JJ. */
export function debutSemaine(iso: string): string {
  const [a, m, j] = iso.split('-').map(Number);
  const d = new Date(a, m - 1, j);
  const decalage = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - decalage);
  return dateISO(d);
}
