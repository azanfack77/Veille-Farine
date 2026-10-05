// Export CSV lisible directement par Excel en français (séparateur ; et BOM UTF-8)
export function telechargerCsv<T>(
  nomFichier: string,
  lignes: T[],
  colonnes: { titre: string; valeur: (l: T) => string | number | null | undefined }[],
): void {
  const echapper = (v: string | number | null | undefined) => {
    if (v == null) return '';
    const s = typeof v === 'number' ? String(v).replace('.', ',') : v;
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const contenu = [
    colonnes.map((c) => echapper(c.titre)).join(';'),
    ...lignes.map((l) => colonnes.map((c) => echapper(c.valeur(l))).join(';')),
  ].join('\r\n');
  const blob = new Blob(['\uFEFF' + contenu], { type: 'text/csv;charset=utf-8' });
  const lien = document.createElement('a');
  lien.href = URL.createObjectURL(blob);
  lien.download = nomFichier;
  lien.click();
  URL.revokeObjectURL(lien.href);
}
