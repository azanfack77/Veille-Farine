import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { MODE_DEMO, SESSION_DEMO, UTILISATEUR_DEMO } from '../lib/demo';
import { supabase } from '../lib/supabase';
import type { Utilisateur } from '../lib/types';

type EtatAuth = {
  session: Session | null;
  utilisateur: Utilisateur | null;
  pret: boolean;
  erreurProfil: string | null;
  rechargerProfil: () => Promise<void>;
  deconnecter: () => Promise<void>;
};

const Contexte = createContext<EtatAuth | null>(null);
const cleProfil = (id: string) => `veille:profil:${id}`;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [utilisateur, setUtilisateur] = useState<Utilisateur | null>(null);
  const [pret, setPret] = useState(false);
  const [erreurProfil, setErreurProfil] = useState<string | null>(null);

  useEffect(() => {
    if (MODE_DEMO) {
      setSession(SESSION_DEMO);
      setPret(true);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setPret(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_evenement, nouvelle) => setSession(nouvelle));
    return () => data.subscription.unsubscribe();
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
    await supabase.auth.signOut();
  }, [session]);

  return (
    <Contexte.Provider value={{ session, utilisateur, pret, erreurProfil, rechargerProfil, deconnecter }}>
      {children}
    </Contexte.Provider>
  );
}

export function useAuth(): EtatAuth {
  const c = useContext(Contexte);
  if (!c) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return c;
}
