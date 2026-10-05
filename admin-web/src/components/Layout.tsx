import { NavLink, Outlet } from 'react-router-dom';
import { useSession } from '../context/Session';

const LIENS = [
  { vers: '/', libelle: 'Tableau de bord' },
  { vers: '/releves', libelle: 'Relevés' },
  { vers: '/utilisateurs', libelle: 'Enquêteurs' },
  { vers: '/referentiels', libelle: 'Listes de référence' },
  { vers: '/administrateurs', libelle: 'Administrateurs' },
];

export function Layout() {
  const { session, deconnecter } = useSession();
  return (
    <div className="coque">
      <aside className="barre">
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
      </main>
    </div>
  );
}
