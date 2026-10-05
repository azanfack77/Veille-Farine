const ESPACE_FINE = '\u202F';

/** Convertit une saisie ("12 500", "12500,5") en nombre, ou null si vide / invalide. */
export function parseMontant(texte: string): number | null {
  const net = texte.replace(/[\s\u00A0\u202F]/g, '').replace(',', '.');
  if (net === '') return null;
  const v = Number(net);
  return Number.isFinite(v) ? v : null;
}

/** Vrai si le texte est non vide mais n'est pas un nombre valide. */
export function saisieInvalide(texte: string): boolean {
  return texte.trim() !== '' && parseMontant(texte) === null;
}

/** Ne garde que les caractères utiles à la saisie d'un montant. */
export function filtrerSaisieMontant(texte: string): string {
  return texte.replace(/[^0-9.,\s]/g, '');
}

export function formatNombre(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—';
  const negatif = v < 0;
  const [entier, decimales] = Math.abs(v).toFixed(2).split('.');
  const groupes = entier.replace(/\B(?=(\d{3})+(?!\d))/g, ESPACE_FINE);
  const suffixe = decimales === '00' ? '' : ',' + decimales.replace(/0$/, '');
  return (negatif ? '−' : '') + groupes + suffixe;
}

export function formatFcfa(v: number | null | undefined): string {
  return v == null ? '—' : `${formatNombre(v)} FCFA`;
}

/** Date locale au format AAAA-MM-JJ (colonne DATE de la base). */
export function dateISO(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const jj = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${jj}`;
}

const JOURS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

export function formatDateLongue(d: Date): string {
  return `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDateISO(iso: string): string {
  const [a, m, j] = iso.split('-').map(Number);
  return formatDateLongue(new Date(a, m - 1, j));
}

export function formatHorodatage(iso: string | null): string {
  if (!iso) return 'jamais';
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${d.getDate()} ${MOIS[d.getMonth()]} à ${hh}h${mi}`;
}

export function memeJour(a: Date, b: Date): boolean {
  return dateISO(a) === dateISO(b);
}
