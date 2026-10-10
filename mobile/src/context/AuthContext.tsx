import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { MODE_DEMO, SESSION_DEMO, UTILISATEUR_DEMO } from '../lib/demo';
import { inactifTropLongtemps, JOURS_INACTIVITE, noterActivite, oublierActivite } from '../lib/inactivite';
import { supabase } from '../lib/supabase';
import type { Utilisateur } from '../lib/types';

type EtatAuth = {
  session: Session | null;
  utilisateur: Utilisateur | null;
  pret: boolean;
  erreurProfil: string | null;
  rechargerProfil: () => Promise<void>;
  deconnecter: () => Promise<void>;
  motifDeconnexion: string | null; // affiché sur l'écran de connexion
};

const Contexte = createContext<EtatAuth | null>(null);
const cleProfil = (id: string) => `veille:profil:${id}`;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [utilisateur, setUtilisateur] = useState<Utilisateur | null>(null);
  const [pret, setPret] = useState(false);
  const [erreurProfil, setErreurProfil] = useState<string | null>(null);
  const [motifDeconnexion, setMotifDeconnexion] = useState<string | null>(null);

  useEffect(() => {
    if (MODE_DEMO) {
      setSession(SESSION_DEMO);
      setPret(true);
      return;
    }

    /** Ferme la session si l'application n'a pas servi depuis 60 jours, sinon note l'activité. */
    const verifierInactivite = async (s: Session | null): Promise<Session | null> => {
      if (!s) return null;
      if (await inactifTropLongtemps()) {
        await oublierActivite();
        await supabase.auth.signOut({ scope: 'local' });
        setMotifDeconnexion(
          `Vous avez été déconnecté après ${JOURS_INACTIVITE} jours sans utilisation. Reconnectez-vous avec votre mot de passe ou un code reçu par email.`,
        );
        return null;
      }
      await noterActivite();
      return s;
    };

    supabase.auth.getSession().then(async ({ data }) => {
      setSession(await verifierInactivite(data.session));
      setPret(true);
    });
    const { data } = supabase.auth.onAuthStateChange((evenement, nouvelle) => {
      if (evenement === 'INITIAL_SESSION') return; // traité par getSession, après le contrôle d'inactivité
      if (evenement === 'SIGNED_IN') setMotifDeconnexion(null); // activité notée par l'écran de connexion
      setSession(nouvelle);
    });
    const premierPlan = AppState.addEventListener('change', async (etat) => {
      if (etat !== 'active') return;
      const { data: actuelle } = await supabase.auth.getSession();
      if (actuelle.session) await verifierInactivite(actuelle.session);
    });
    return () => {
      data.subscription.unsubscribe();
      premierPlan.remove();
    };
  }, []);

  const chargerProfil = useCallback(async (s: Session) => {
    setErreurProfil(null);
    if (MODE_DEMO) {
      setUtilisateur(UTILISATEUR_DEMO);
      return;
    }
    const email = s.user.email ?? '';
    // La politique RLS ne renvoie que la fiche de l'utilisateur connecté
    const { data, error } = await supabase
      .from('tb_utilisateurs')
      .select('id_utilisateur,nom,prenom,email,id_minoterie')
      .ilike('email', email)
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      setUtilisateur(data as Utilisateur);
      await AsyncStorage.setItem(cleProfil(s.user.id), JSON.stringify(data));
      return;
    }
    const cache = await AsyncStorage.getItem(cleProfil(s.user.id));
    if (cache) {
      setUtilisateur(JSON.parse(cache) as Utilisateur);
      return;
    }
    setUtilisateur(null);
    setErreurProfil(
      error
        ? 'Profil impossible à charger. Vérifiez la connexion internet puis réessayez.'
        : `L'adresse ${email} n'est rattachée à aucun enquêteur. Demandez à l'administrateur de l'ajouter dans tb_utilisateurs.`,
    );
  }, []);

  useEffect(() => {
    if (session) chargerProfil(session);
    else {
      setUtilisateur(null);
      setErreurProfil(null);
    }
  }, [session?.user.id, chargerProfil]);

  const rechargerProfil = useCallback(async () => {
    if (session) await chargerProfil(session);
  }, [session, chargerProfil]);

  const deconnecter = useCallback(async () => {
    if (MODE_DEMO) return;
    if (session) await AsyncStorage.removeItem(cleProfil(session.user.id));
    await oublierActivite();
    await supabase.auth.signOut();
  }, [session]);

  return (
    <Contexte.Provider value={{ session, utilisateur, pret, erreurProfil, rechargerProfil, deconnecter, motifDeconnexion }}>
      {children}
    </Contexte.Provider>
  );
}

export function useAuth(): EtatAuth {
  const c = useContext(Contexte);
  if (!c) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return c;
}
