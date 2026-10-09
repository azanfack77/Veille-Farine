import type { Session as SessionSupabase } from '@supabase/supabase-js';
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { chargerReferentiel } from '../lib/referentiel';
import { supabase } from '../lib/supabase';
import type { Referentiel } from '../lib/types';

type Etat = {
  session: SessionSupabase | null;
  estAdmin: boolean | null; // null = vérification en cours
  pret: boolean;
  ref: Referentiel | null;
  erreurRef: string | null;
  rechargerRef: () => Promise<void>;
  deconnecter: () => Promise<void>;
  recuperation: boolean; // ouvert depuis un lien « mot de passe oublié »
  terminerRecuperation: () => void;
};

// Lien de réinitialisation : à lire avant que Supabase ne nettoie l'URL
const lienRecuperation = /type=recovery/.test(window.location.hash);
const parametresLien = new URLSearchParams(window.location.hash.slice(1));

/** Message à afficher si le lien reçu par email est expiré ou invalide. */
export const erreurLien: string | null = parametresLien.get('error_code')
  ? parametresLien.get('error_code') === 'otp_expired'
    ? 'Ce lien a expiré ou a déjà été utilisé. Demandez un nouveau lien ci-dessous.'
    : parametresLien.get('error_description')
  : null;

const Contexte = createContext<Etat | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionSupabase | null>(null);
  const [pret, setPret] = useState(false);
  const [estAdmin, setEstAdmin] = useState<boolean | null>(null);
  const [ref, setRef] = useState<Referentiel | null>(null);
  const [erreurRef, setErreurRef] = useState<string | null>(null);
  const [recuperation, setRecuperation] = useState(lienRecuperation);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setPret(true);
    });
    const { data } = supabase.auth.onAuthStateChange((evenement, s) => {
      if (evenement === 'PASSWORD_RECOVERY') setRecuperation(true);
      setSession(s);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const rechargerRef = useCallback(async () => {
    try {
      setErreurRef(null);
      setRef(await chargerReferentiel());
    } catch (e) {
      setErreurRef(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    if (!session) {
      setEstAdmin(null);
      setRef(null);
      return;
    }
    setEstAdmin(null);
    supabase.rpc('fn_est_admin').then(({ data, error }) => {
      const admin = !error && data === true;
      setEstAdmin(admin);
      if (admin) rechargerRef();
    });
  }, [session?.user.id, rechargerRef]);

  const deconnecter = useCallback(async () => {
    setRecuperation(false);
    await supabase.auth.signOut();
  }, []);

  const terminerRecuperation = useCallback(() => setRecuperation(false), []);

  return (
    <Contexte.Provider value={{ session, estAdmin, pret, ref, erreurRef, rechargerRef, deconnecter, recuperation, terminerRecuperation }}>
      {children}
    </Contexte.Provider>
  );
}

export function useSession(): Etat {
  const c = useContext(Contexte);
  if (!c) throw new Error('useSession hors de SessionProvider');
  return c;
}

/** Référentiel garanti chargé (utilisé dans les pages protégées). */
export function useReferentiel(): Referentiel {
  const { ref } = useSession();
  if (!ref) throw new Error('Référentiel non chargé');
  return ref;
}
