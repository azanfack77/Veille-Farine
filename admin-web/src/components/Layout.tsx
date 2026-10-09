import { NavLink, Outlet } from 'react-router-dom';
import { useSession } from '../context/Session';
import { logoMinoterie } from '../lib/logos';

const LIENS = [
  { vers: '/', libelle: 'Tableau de bord' },
  { vers: '/releves', libelle: 'Relevés' },
  { vers: '/utilisateurs', libelle: 'Enquêteurs' },
  { vers: '/referentiels', libelle: 'Listes de référence' },
  { vers: '/administrateurs', libelle: 'Administrateurs' },
];

/** Logo du groupe, en bas de chaque page. */
export function PiedDePage() {
  return (
    <footer className="pied-page">
      <img src="/logo-cadyst.png" alt="Groupe CADYST" className="pied-page-logo" />
    </footer>
  );
}

export function Layout() {
  const { session, deconnecter, ref, idMinoterie } = useSession();
  const nomMinoterie = ref?.minoteries.find((m) => m.id_minoterie === idMinoterie)?.nom_minoterie;
  const logo = logoMinoterie(nomMinoterie);
  return (
    <div className="coque">
      <aside className="barre">
        <div className="barre-logo">
          <img src={logo.src} alt={logo.alt} />
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
