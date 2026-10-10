import { NavLink, Outlet } from 'react-router-dom';
import { useSession } from '../context/Session';

const LIENS = [
  { vers: '/', libelle: 'Tableau de bord' },
  { vers: '/releves', libelle: 'Relevés' },
  { vers: '/utilisateurs', libelle: 'Enquêteurs' },
  { vers: '/referentiels', libelle: 'Listes de référence' },
  { vers: '/administrateurs', libelle: 'Administrateurs' },
];

// Les administrateurs appartiennent au groupe : la console affiche le logo du groupe.
// (Les enquêteurs voient le logo de leur société, CADYST GRAIN ou SGMC, dans l'application mobile.)
const LOGO_GROUPE = { src: '/logo-cadyst.png', alt: 'Groupe CADYST' };

/** Logo du groupe, en bas de chaque page. */
export function PiedDePage() {
  return (
    <footer className="pied-page">
      <img src={LOGO_GROUPE.src} alt={LOGO_GROUPE.alt} className="pied-page-logo" />
    </footer>
  );
}

export function Layout() {
  const { session, deconnecter } = useSession();
  return (
    <div className="coque">
      <aside className="barre">
        <div className="barre-logo">
          <img src={LOGO_GROUPE.src} alt={LOGO_GROUPE.alt} />
        </div>
        <div className="barre-marque">
          <span className="barre-titre">Veille Farines</span>
          <span className="barre-sous-titre">Administration</span>
        </div>
        <nav className="barre-nav" aria-label="Navigation principale">
          {LIENS.map((l) => (
            <NavLink key={l.vers} to={l.vers} end={l.vers === '/'} className="barre-lien">
              {l.libelle}
            </NavLink>
          ))}
        </nav>
        <div className="barre-pied">
          <span className="barre-email">{session?.user.email}</span>
          <button className="lien-discret clair" onClick={deconnecter}>
            Se déconnecter
          </button>
        </div>
      </aside>
      <main className="contenu">
        <Outlet />
        <PiedDePage />
      </main>
    </div>
  );
}
