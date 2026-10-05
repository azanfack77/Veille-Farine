import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bandeau } from '../../src/components/ui';
import { useFileAttente } from '../../src/hooks/useFileAttente';
import { retirerDeLaFile, synchroniser } from '../../src/lib/fileAttente';
import { formatDateISO, formatNombre } from '../../src/lib/format';
import { supabase } from '../../src/lib/supabase';
import type { ElementFile, LigneVeille } from '../../src/lib/types';
import { couleurs, polices } from '../../src/theme';

const COLONNES =
  'id_veille,date_veille,region,ville,marque,grammage_kg,minoterie,segment,sortie_usine,net_rendu_grossiste,prix_marche_grossiste,volume';

export default function EcranHistorique() {
  const file = useFileAttente();
  const [lignes, setLignes] = useState<LigneVeille[]>([]);
  const [actualisation, setActualisation] = useState(false);
  const [horsLigne, setHorsLigne] = useState(false);

  const charger = useCallback(async () => {
    setActualisation(true);
    await synchroniser().catch(() => null);
    const { data, error } = await supabase
      .from('v_veille_concurrentielle')
      .select(COLONNES)
      .order('date_veille', { ascending: false })
      .order('id_veille', { ascending: false })
      .limit(150);
    if (error) setHorsLigne(true);
    else {
      setHorsLigne(false);
      setLignes((data ?? []) as LigneVeille[]);
    }
    setActualisation(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      charger();
    }, [charger]),
  );

  const supprimer = (e: ElementFile) =>
    Alert.alert(
      'Supprimer ce relevé ?',
      `${e.libelle.marque} ${e.libelle.grammage_kg} kg n'a pas été envoyé. Il sera effacé du téléphone.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => retirerDeLaFile(e.saisie.client_uuid) },
      ],
    );

  // Regroupe les relevés envoyés par date
  const parDate = lignes.reduce<Record<string, LigneVeille[]>>((acc, l) => {
    (acc[l.date_veille] ??= []).push(l);
    return acc;
  }, {});

  return (
    <SafeAreaView style={s.page} edges={['top']}>
      <Text style={s.titre}>Historique</Text>
      <ScrollView
        contentContainerStyle={s.contenu}
        refreshControl={<RefreshControl refreshing={actualisation} onRefresh={charger} tintColor={couleurs.primaire} />}
      >
        {horsLigne ? (
          <Bandeau ton="attente">Hors ligne : seuls les relevés encore sur le téléphone sont affichés.</Bandeau>
        ) : null}

        {file.length > 0 ? (
          <View style={s.bloc}>
            <Text style={s.titreBloc}>Sur le téléphone, pas encore envoyés</Text>
            {file.map((e) => (
              <View key={e.saisie.client_uuid} style={[s.ligne, e.statut === 'refuse' && s.ligneRefusee]}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={s.marque}>
                    {e.libelle.marque} <Text style={s.kg}>{e.libelle.grammage_kg} kg</Text>
                  </Text>
                  <Text style={s.lieu}>
                    {formatDateISO(e.saisie.date_veille)}, {e.libelle.ville ?? e.libelle.region}
                  </Text>
                  {e.statut === 'refuse' ? (
                    <Text style={s.refus}>Refusé par le serveur : {e.erreur}</Text>
                  ) : (
                    <Text style={s.enAttente}>En attente de réseau</Text>
                  )}
                </View>
                <Pressable
                  onPress={() => supprimer(e)}
                  hitSlop={10}
                  accessibilityLabel={`Supprimer le relevé ${e.libelle.marque}`}
                >
                  <Ionicons name="trash-outline" size={20} color={couleurs.encreDouce} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}

        {Object.entries(parDate).map(([jour, items]) => (
          <View key={jour} style={s.bloc}>
            <Text style={s.titreBloc}>{formatDateISO(jour)}</Text>
            {items.map((l) => (
              <View key={l.id_veille} style={s.ligne}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={s.marque}>
                    {l.marque} <Text style={s.kg}>{l.grammage_kg} kg</Text>
                  </Text>
                  <Text style={s.lieu}>
                    {l.minoterie}, {l.ville ?? l.region}
                  </Text>
                </View>
                <View style={s.chiffres}>
                  <Text style={s.net}>{formatNombre(l.net_rendu_grossiste)}</Text>
                  <Text style={s.legende}>net rendu</Text>
                  {l.prix_marche_grossiste != null ? (
                    <Text style={s.marche}>marché {formatNombre(l.prix_marche_grossiste)}</Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        ))}

        {!actualisation && file.length === 0 && lignes.length === 0 && !horsLigne ? (
          <View style={s.vide}>
            <Text style={s.titreVide}>Aucun relevé pour l'instant</Text>
            <Text style={s.texteVide}>Vos relevés apparaîtront ici dès le premier enregistrement.</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: couleurs.fond },
  titre: { fontFamily: polices.chiffreGras, fontSize: 30, color: couleurs.encre, paddingHorizontal: 20, paddingVertical: 8 },
  contenu: { padding: 20, paddingTop: 4, gap: 20 },
  bloc: { gap: 1, borderRadius: 12, overflow: 'hidden' },
  titreBloc: { fontFamily: polices.gras, fontSize: 14, color: couleurs.encreDouce, marginBottom: 8 },
  ligne: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: couleurs.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  ligneRefusee: { borderLeftWidth: 3, borderLeftColor: couleurs.erreur },
  marque: { fontFamily: polices.chiffre, fontSize: 19, color: couleurs.encre },
  kg: { fontFamily: polices.moyen, fontSize: 14, color: couleurs.encreDouce },
  lieu: { fontFamily: polices.regulier, fontSize: 14, color: couleurs.encreDouce },
  enAttente: { fontFamily: polices.moyen, fontSize: 13, color: couleurs.attente },
  refus: { fontFamily: polices.moyen, fontSize: 13, color: couleurs.erreur },
  chiffres: { alignItems: 'flex-end' },
  net: { fontFamily: polices.chiffreGras, fontSize: 22, color: couleurs.primaire },
  legende: { fontFamily: polices.regulier, fontSize: 12, color: couleurs.encreDouce, marginTop: -2 },
  marche: { fontFamily: polices.moyen, fontSize: 13, color: couleurs.encre, marginTop: 2 },
  vide: { paddingVertical: 48, gap: 6 },
  titreVide: { fontFamily: polices.gras, fontSize: 18, color: couleurs.encre },
  texteVide: { fontFamily: polices.regulier, fontSize: 15, color: couleurs.encreDouce },
});
