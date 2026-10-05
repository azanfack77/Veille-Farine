import { Barlow_400Regular, Barlow_500Medium, Barlow_600SemiBold } from '@expo-google-fonts/barlow';
import { BarlowCondensed_600SemiBold, BarlowCondensed_700Bold } from '@expo-google-fonts/barlow-condensed';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { couleurs } from '../src/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function Racine() {
  const [policesPretes] = useFonts({
    Barlow_400Regular,
    Barlow_500Medium,
    Barlow_600SemiBold,
    BarlowCondensed_600SemiBold,
    BarlowCondensed_700Bold,
  });

  if (!policesPretes) return null;

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Garde />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

/** Redirige vers la connexion si nécessaire. */
function Garde() {
  const { session, pret } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!pret) return;
    SplashScreen.hideAsync().catch(() => undefined);
    const surConnexion = segments[0] === 'connexion';
    if (!session && !surConnexion) router.replace('/connexion');
    else if (session && surConnexion) router.replace('/');
  }, [session, pret, segments, router]);

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: couleurs.fond } }} />
    </>
  );
}
