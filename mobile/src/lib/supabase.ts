import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const cle = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !cle) {
  throw new Error(
    'Configuration manquante : renseignez EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_ANON_KEY dans le fichier .env',
  );
}

export const supabase = createClient(url, cle, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Rafraîchit le jeton uniquement quand l'application est au premier plan
AppState.addEventListener('change', (etat) => {
  if (etat === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
