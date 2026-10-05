import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { chargerReferentiel } from '../lib/referentiel';
import type { Referentiel } from '../lib/types';

type EtatReferentiel = {
  ref: Referentiel | null;
  source: 'reseau' | 'cache' | null;
  chargement: boolean;
  erreur: string | null;
  recharger: () => Promise<void>;
};

const Contexte = createContext<EtatReferentiel | null>(null);

export function ReferentielProvider({ children }: { children: ReactNode }) {
  const [ref, setRef] = useState<Referentiel | null>(null);
  const [source, setSource] = useState<'reseau' | 'cache' | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  const recharger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const r = await chargerReferentiel();
      setRef(r.ref);
      setSource(r.source);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    recharger();
  }, [recharger]);

  return (
    <Contexte.Provider value={{ ref, source, chargement, erreur, recharger }}>{children}</Contexte.Provider>
  );
}

export function useReferentiel(): EtatReferentiel {
  const c = useContext(Contexte);
  if (!c) throw new Error('useReferentiel doit être utilisé dans ReferentielProvider');
  return c;
}
