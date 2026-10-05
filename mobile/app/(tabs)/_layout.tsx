import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Bouton } from '../../src/components/ui';
import { useAuth } from '../../src/context/AuthContext';
import { ReferentielProvider } from '../../src/context/ReferentielContext';
import { useFileAttente } from '../../src/hooks/useFileAttente';
import { useSynchroAuto } from '../../src/hooks/useSynchroAuto';
import { couleurs, polices } from '../../src/theme';

export default function Onglets() {
  const { utilisateur, erreurProfil, rechargerProfil, deconnecter } = useAuth();
  useSynchroAuto();
  const file = useFileAttente();

  if (erreurProfil) {
    return (
      <View style={s.centre}>
        <Text style={s.titre}>Compte non rattaché</Text>
        <Text style={s.texte}>{erreurProfil}</Text>
        <Bouton titre="Réessayer" onPress={rechargerProfil} />
        <Bouton titre="Se déconnecter" variante="discret" onPress={deconnecter} />
      </View>
    );
  }

  if (!utilisateur) {
    return (
      <View style={s.centre}>
        <ActivityIndicator color={couleurs.primaire} size="large" />
      </View>
    );
  }

  return (
    <ReferentielProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: couleurs.primaire,
          tabBarInactiveTintColor: couleurs.encreDouce,
          tabBarLabelStyle: { fontFamily: polices.moyen, fontSize: 12 },
          tabBarStyle: { borderTopColor: couleurs.trait },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Relevé',
            tabBarIcon: ({ color, size }) => <Ionicons name="create-outline" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="historique"
          options={{
            title: 'Historique',
            tabBarBadge: file.length > 0 ? file.length : undefined,
            tabBarBadgeStyle: { backgroundColor: couleurs.ble, color: couleurs.encre },
            tabBarIcon: ({ color, size }) => <Ionicons name="list-outline" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="compte"
          options={{
            title: 'Compte',
            tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" color={color} size={size} />,
          }}
        />
      </Tabs>
    </ReferentielProvider>
  );
}

const s = StyleSheet.create({
  centre: { flex: 1, justifyContent: 'center', padding: 28, gap: 14, backgroundColor: couleurs.fond },
  titre: { fontFamily: polices.gras, fontSize: 22, color: couleurs.encre },
  texte: { fontFamily: polices.regulier, fontSize: 16, lineHeight: 22, color: couleurs.encreDouce },
});
