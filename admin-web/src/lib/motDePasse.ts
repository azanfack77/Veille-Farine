/** Mot de passe provisoire lisible (sans caractères ambigus comme 0/O ou 1/l). */
export function genererMotDePasse(): string {
  const car = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const octets = crypto.getRandomValues(new Uint32Array(10));
  return Array.from(octets, (n) => car[n % car.length]).join('');
}
