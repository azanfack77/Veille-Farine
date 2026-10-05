import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Modal, Pressable, SectionList, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Marque, Referentiel } from '../lib/types';
import { couleurs, polices } from '../theme';

type Props = {
  ref_: Referentiel;
  idMarque: number | null;
  idMinoterieUtilisateur: number;
  onChange: (idMarque: number) => void;
  enErreur?: boolean;
};

/** Bouton + liste plein écran, groupée par minoterie, avec recherche. */
export function SelecteurMarque({ ref_, idMarque, idMinoterieUtilisateur, onChange, enErreur }: Props) {
  const [ouvert, setOuvert] = useState(false);
  const [recherche, setRecherche] = useState('');

  const marque = ref_.marques.find((m) => m.id_marque === idMarque) ?? null;
  const gamme = marque ? ref_.gammes.find((g) => g.id_gamme === marque.id_gamme) : undefined;
  const segment = gamme ? ref_.segments.find((sg) => sg.id_segment === gamme.id_segment) : undefined;
  const minoterie = marque ? ref_.minoteries.find((m) => m.id_minoterie === marque.id_minoterie) : undefined;

  const sections = useMemo(() => {
    const q = recherche.trim().toUpperCase();
    return ref_.minoteries
      .map((mi) => ({
        mi,
        data: ref_.marques.filter(
          (ma) =>
            ma.id_minoterie === mi.id_minoterie &&
            (q === '' || ma.nom_marque.includes(q) || mi.nom_minoterie.toUpperCase().includes(q)),
        ),
      }))
      .filter((sct) => sct.data.length > 0)
      .sort((a, b) =>
        a.mi.id_minoterie === idMinoterieUtilisateur ? 1 : b.mi.id_minoterie === idMinoterieUtilisateur ? -1 : 0,
      )
      .map((sct) => ({
        titre:
          sct.mi.id_minoterie === idMinoterieUtilisateur
            ? `${sct.mi.nom_minoterie} (votre minoterie)`
            : sct.mi.nom_minoterie,
        data: sct.data,
      }));
  }, [recherche, ref_, idMinoterieUtilisateur]);

  const nomGamme = (m: Marque) => ref_.gammes.find((g) => g.id_gamme === m.id_gamme)?.nom_gamme ?? '';

  const choisir = (m: Marque) => {
    onChange(m.id_marque);
    setOuvert(false);
    setRecherche('');
  };

  return (
    <>
      <Pressable
        onPress={() => setOuvert(true)}
        accessibilityRole="button"
        accessibilityLabel={marque ? `Marque : ${marque.nom_marque}. Changer` : 'Choisir une marque'}
        style={({ pressed }) => [s.declencheur, enErreur && !marque && s.declencheurErreur, pressed && { opacity: 0.8 }]}
      >
        <View style={{ flex: 1 }}>
          {marque ? (
            <>
              <Text style={s.nomMarque}>{marque.nom_marque}</Text>
              <Text style={s.details}>
                {minoterie?.nom_minoterie}, {gamme?.nom_gamme.toLowerCase()} ({segment?.nom_segment.toLowerCase()})
              </Text>
            </>
          ) : (
            <Text style={s.invite}>Choisir la marque relevée</Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={22} color={couleurs.primaire} />
      </Pressable>

      <Modal visible={ouvert} animationType="slide" onRequestClose={() => setOuvert(false)}>
        <SafeAreaView style={s.modal} edges={['top', 'bottom']}>
          <View style={s.enteteModal}>
            <Text style={s.titreModal}>Choisir une marque</Text>
            <Pressable onPress={() => setOuvert(false)} hitSlop={12} accessibilityLabel="Fermer">
              <Ionicons name="close" size={26} color={couleurs.encre} />
            </Pressable>
          </View>
          <View style={s.recherche}>
            <Ionicons name="search" size={18} color={couleurs.encreDouce} />
            <TextInput
              value={recherche}
              onChangeText={setRecherche}
              placeholder="Marque ou minoterie"
              placeholderTextColor="#98A2AD"
              autoCapitalize="characters"
              autoCorrect={false}
              style={s.saisieRecherche}
              autoFocus
            />
          </View>
          <SectionList
            sections={sections}
            keyExtractor={(m) => String(m.id_marque)}
            keyboardShouldPersistTaps="handled"
            stickySectionHeadersEnabled
            renderSectionHeader={({ section }) => <Text style={s.titreSection}>{section.titre}</Text>}
            renderItem={({ item }) => {
              const actif = item.id_marque === idMarque;
              return (
                <Pressable
                  onPress={() => choisir(item)}
                  style={({ pressed }) => [s.ligne, pressed && { backgroundColor: couleurs.primaireDoux }]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: actif }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[s.nomLigne, actif && { color: couleurs.primaire }]}>{item.nom_marque}</Text>
                    <Text style={s.gammeLigne}>{nomGamme(item)}</Text>
                  </View>
                  {actif ? <Ionicons name="checkmark" size={22} color={couleurs.primaire} /> : null}
                </Pressable>
              );
            }}
            ListEmptyComponent={<Text style={s.vide}>Aucune marque ne correspond à « {recherche} ».</Text>}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  declencheur: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: couleurs.primaire,
    backgroundColor: couleurs.surface,
  },
  declencheurErreur: { borderColor: couleurs.erreur },
  nomMarque: { fontFamily: polices.chiffreGras, fontSize: 24, color: couleurs.encre, letterSpacing: 0.3 },
  details: { fontFamily: polices.regulier, fontSize: 14, color: couleurs.encreDouce, marginTop: 2 },
  invite: { fontFamily: polices.moyen, fontSize: 16, color: couleurs.primaire },
  modal: { flex: 1, backgroundColor: couleurs.surface },
  enteteModal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  titreModal: { fontFamily: polices.gras, fontSize: 20, color: couleurs.encre },
  recherche: {
    marginHorizontal: 20,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    height: 46,
    borderRadius: 10,
    backgroundColor: couleurs.fond,
  },
  saisieRecherche: { flex: 1, fontFamily: polices.moyen, fontSize: 16, color: couleurs.encre },
  titreSection: {
    fontFamily: polices.gras,
    fontSize: 14,
    color: couleurs.encreDouce,
    backgroundColor: couleurs.fond,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  ligne: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: couleurs.trait,
  },
  nomLigne: { fontFamily: polices.chiffre, fontSize: 20, color: couleurs.encre },
  gammeLigne: { fontFamily: polices.regulier, fontSize: 14, color: couleurs.encreDouce },
  vide: { padding: 20, fontFamily: polices.regulier, fontSize: 15, color: couleurs.encreDouce },
});
