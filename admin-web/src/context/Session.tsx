import type { Session as SessionSupabase } from '@supabase/supabase-js';
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { ID_MINOTERIE_DEMO, MODE_DEMO, REFERENTIEL_DEMO, SESSION_DEMO } from '../lib/demo';
import { inactifTropLongtemps, JOURS_INACTIVITE, noterActivite, oublierActivite } from '../lib/inactivite';
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
  motifDeconnexion: string | null; // affiché sur l'écran de connexion
  idMinoterie: number | null; // minoterie de la personne connectée (fiche tb_utilisateurs), si elle en a une
  recuperation: boolean; // ouvert depuis un lien « mot de passe oublié »
  terminerRecuperation: () => void;
};

// Lien de réinitialisation : à lire avant que Supabase ne nettoie l'URL
const lienRecuperation = /type=recovery/.test(window.location.hash);
const parametresLien = new URLSearchParams(window.location.hash.slice(1));
// Ouvrir le lien reçu par email est une utilisation : sans cela, une personne inactive depuis
// 60 jours serait déconnectée aussitôt arrivée et ne pourrait pas changer son mot de passe.
if (lienRecuperation) noterActivite();

/** Message à afficher si le lien reçu par email est expiré ou invalide. */
export const erreurLien: string | null = parametresLien.get('error_code')
  ? parametresLien.get('error_code') === 'otp_expired'
    ? 'Ce lien a expiré ou a déjà été utilisé. Demandez un nouveau lien ci-dessous.'
    : parametresLien.get('error_description')
  : null;

// Contrôle d'inactivité au retour sur l'onglet et toutes les heures (un onglet resté ouvert sans
// être utilisé ne compte pas comme une activité ; seuls les clics et frappes clavier comptent).
const VERIFICATION_MS = 60 * 60 * 1000;
const EVENEMENTS_ACTIVITE = ['pointerdown', 'keydown'] as const;

const Contexte = createContext<Etat | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionSupabase | null>(null);
  const [pret, setPret] = useState(false);
  const [estAdmin, setEstAdmin] = useState<boolean | null>(null);
  const [ref, setRef] = useState<Referentiel | null>(null);
  const [erreurRef, setErreurRef] = useState<string | null>(null);
  const [motifDeconnexion, setMotifDeconnexion] = useState<string | null>(null);
  const [idMinoterie, setIdMinoterie] = useState<number | null>(null);
  const [recuperation, setRecuperation] = useState(lienRecuperation);

  useEffect(() => {
    if (MODE_DEMO) {
      setSession(SESSION_DEMO);
      setPret(true);
      return;
    }
    /** Ferme la session si la console n'a pas servi depuis 60 jours, sinon note l'activité. */
    const verifierInactivite = async (s: SessionSupabase | null): Promise<SessionSupabase | null> => {
      if (!s) return null;
      if (inactifTropLongtemps()) {
        oublierActivite();
        await supabase.auth.signOut({ scope: 'local' });
        setMotifDeconnexion(
          `Vous avez été déconnecté après ${JOURS_INACTIVITE} jours sans utilisation. Reconnectez-vous.`,
        );
        return null;
      }
      noterActivite();
      return s;
    };
    const verifierSessionActuelle = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session || !inactifTropLongtemps()) return;
      await verifierInactivite(data.session);
    };
    let derniereNote = 0;
    const surInteraction = () => {
      if (Date.now() - derniereNote < 60_000) return;
      derniereNote = Date.now();
      verifierSessionActuelle().then(noterActiviteSiConnecte);
    };
    const noterActiviteSiConnecte = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) noterActivite();
    };

    supabase.auth.getSession().then(async ({ data }) => {
      setSession(await verifierInactivite(data.session));
      setPret(true);
    });
    const { data } = supabase.auth.onAuthStateChange((evenement, s) => {
      if (evenement === 'INITIAL_SESSION') return; // traité par getSession, après le contrôle d'inactivité
      if (evenement === 'PASSWORD_RECOVERY') setRecuperation(true);
      // L'activité est notée par l'écran de connexion, pas ici : Supabase émet aussi SIGNED_IN
      // au retour sur l'onglet, ce qui remettrait le compteur à zéro sans vraie utilisation.
      if (evenement === 'SIGNED_IN') setMotifDeconnexion(null);
      setSession(s);
    });
    const auRetour = () => {
      if (document.visibilityState === 'visible') verifierSessionActuelle();
    };
    document.addEventListener('visibilitychange', auRetour);
    EVENEMENTS_ACTIVITE.forEach((e) => window.addEventListener(e, surInteraction, { passive: true }));
    const minuteur = window.setInterval(verifierSessionActuelle, VERIFICATION_MS);
    return () => {
      data.subscription.unsubscribe();
      document.removeEventListener('visibilitychange', auRetour);
      EVENEMENTS_ACTIVITE.forEach((e) => window.removeEventListener(e, surInteraction));
      window.clearInterval(minuteur);
    };
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
      setIdMinoterie(null);
      return;
    }
    if (MODE_DEMO) {
      setEstAdmin(true);
      setRef(REFERENTIEL_DEMO);
      setIdMinoterie(ID_MINOTERIE_DEMO);
      return;
    }
    setEstAdmin(null);
    supabase.rpc('fn_est_admin').then(({ data, error }) => {
      const admin = !error && data === true;
      setEstAdmin(admin);
      if (admin) rechargerRef();
    });
    // Société de la personne connectée, pour afficher son logo
    supabase
      .from('tb_utilisateurs')
      .select('id_minoterie')
      .ilike('email', session.user.email ?? '')
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setIdMinoterie((data?.id_minoterie as number | undefined) ?? null));
  }, [session?.user.id, rechargerRef]);

  const deconnecter = useCallback(async () => {
    if (MODE_DEMO) return;
    setRecuperation(false);
    oublierActivite();
    await supabase.auth.signOut();
  }, []);

  const terminerRecuperation = useCallback(() => setRecuperation(false), []);

  return (
    <Contexte.Provider value={{ session, estAdmin, pret, ref, erreurRef, rechargerRef, deconnecter, motifDeconnexion, idMinoterie, recuperation, terminerRecuperation }}>
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
