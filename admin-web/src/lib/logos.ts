// Logo affiché en haut à gauche selon la minoterie de la personne connectée.
// Les fichiers sont dans public/logos (fond transparent).

export type Logo = { src: string; alt: string };

const LOGOS: Record<string, Logo> = {
  'CADYST GRAIN': { src: '/logos/cadyst-grain.png', alt: 'CADYST grain' },
  SGMC: { src: '/logos/sgmc.png', alt: 'SGMC, Société le Grand Moulin du Cameroun' },
};

/** Logo du groupe, quand la minoterie est inconnue ou sans logo. */
export const LOGO_GROUPE: Logo = { src: '/logo-cadyst.png', alt: 'Groupe CADYST' };

export function logoMinoterie(nomMinoterie: string | null | undefined): Logo {
  return (nomMinoterie && LOGOS[nomMinoterie.trim().toUpperCase()]) || LOGO_GROUPE;
}
