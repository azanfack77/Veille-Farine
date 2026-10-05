import NetInfo from '@react-native-community/netinfo';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { synchroniser } from '../lib/fileAttente';

/** Envoie la file au démarrage, au retour du réseau et au retour dans l'application. */
export function useSynchroAuto(): void {
  useEffect(() => {
    const lancer = () => {
      synchroniser().catch(() => undefined);
    };
    lancer();
    const arreterReseau = NetInfo.addEventListener((etat) => {
      if (etat.isConnected) lancer();
    });
    const abonnement = AppState.addEventListener('change', (etat) => {
      if (etat === 'active') lancer();
    });
    const minuteur = setInterval(lancer, 5 * 60 * 1000);
    return () => {
      arreterReseau();
      abonnement.remove();
      clearInterval(minuteur);
    };
  }, []);
}
