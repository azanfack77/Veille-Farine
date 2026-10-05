import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Chargement, Message } from './components/ui';
import { useSession } from './context/Session';
import { configurationManquante } from './lib/supabase';
import { Administrateurs } from './pages/Administrateurs';
import { Connexion } from './pages/Connexion';
import { Referentiels } from './pages/Referentiels';
import { Releves } from './pages/Releves';
import { TableauDeBord } from './pages/TableauDeBord';
import { Utilisateurs } from './pages/Utilisateurs';

export function App() {
  const { session, pret, estAdmin, ref, erreurRef, rechargerRef, deconnecter } = useSession();

  if (configurationManquante) {
    return (
      <div className="page-seule">
        <Message ton="erreur">
          Configuration manquante : créez le fichier .env avec VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY (voir
          .env.example), puis relancez l'application.
        </Message>
      </div>
    );
  }
  if (!pret) return <Chargement />;
  if (!session) return <Connexion />;
  if (estAdmin === null) return <div className="page-seule"><Chargement texte="Vérification des droits…" /></div>;
  if (!estAdmin) {
    return (
      <div className="page-seule">
        <h1>Accès réservé</h1>
        <p className="description">
          Le compte {session.user.email} n'est pas administrateur. Demandez à un administrateur de l'ajouter, ou
          ajoutez-le dans la table tb_administrateurs.
        </p>
        <button className="bouton" onClick={deconnecter}>
          Se déconnecter
        </button>
      </div>
    );
  }
  if (!ref) {
    return (
      <div className="page-seule">
        {erreurRef ? (
          <>
            <Message ton="erreur">Listes de référence impossibles à charger : {erreurRef}</Message>
            <button className="bouton" onClick={rechargerRef}>
              Réessayer
            </button>
          </>
        ) : (
          <Chargement texte="Chargement des listes…" />
        )}
      </div>
    );
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<TableauDeBord />} />
        <Route path="releves" element={<Releves />} />
        <Route path="utilisateurs" element={<Utilisateurs />} />
        <Route path="referentiels" element={<Referentiels />} />
        <Route path="administrateurs" element={<Administrateurs />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
