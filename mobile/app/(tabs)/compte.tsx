import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bandeau, Bouton, Carte } from '../../src/components/ui';
import { useAuth } from '../../src/context/AuthContext';
import { useReferentiel } from '../../src/context/ReferentielContext';
import { useFileAttente } from '../../src/hooks/useFileAttente';
import { lireDerniereSync, synchroniser } from '../../src/lib/fileAttente';
import { formatHorodatage } from '../../src/lib/format';
import { couleurs, polices } from '../../src/theme';
import { LogoMinoterie } from '../../src/components/LogoMinoterie';

export default function EcranCompte() {
  const { utilisateur, session, deconnecter } = useAuth();
  const { ref, source, recharger, chargement, erreur } = useReferentiel();
  const file = useFileAttente();
  const [derniereSync, setDerniereSync] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<{ ton: 'succes' | 'attente'; texte: string } | null>(null);

  useFocusEffect(
    useCallback(() => {
      lireDerniereSync().then(setDerniereSync);
    }, []),
  );

  const minoterie = ref?.minoteries.find((m) => m.id_minoterie === utilisateur?.id_minoterie)?.nom_minoterie;

  const envoyer = async () => {
    setEnvoi(true);
    const r = await synchroniser().catch(() => null);
    setEnvoi(false);
    setDerniereSync(await lireDerniereSync());
    if (!r || r.horsLigne) setMessage({ ton: 'attente', texte: 'Pas de réseau : les relevés restent sur le téléphone.' });
    else setMessage({ ton: 'succes', texte: r.envoyes > 0 ? `${r.envoyes} relevé(s) envoyé(s).` : 'Rien à envoyer.' });
  };

  const seDeconnecter = () => {
    if (file.length > 0) {
      Alert.alert(
        'Relevés non envoyés',
        `${file.length} relevé(s) sont encore sur le téléphone. Envoyez-les avant de vous déconnecter, sinon ils ne pourront plus partir.`,
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Se déconnecter quand même', style: 'destructive', onPress: deconnecter },
        ],
      );
    } else deconnecter();
  };

  return (
    <SafeAreaView style={s.page} edges={['top']}>
      <LogoMinoterie />
      <Text style={s.titre}>Compte</Text>
      <ScrollView contentContainerStyle={s.contenu}>
        <Carte>
          <Text style={s.nom}>
            {utilisateur?.prenom} {utilisateur?.nom}
          </Text>
          <Text style={s.detail}>{session?.user.email}</Text>
          {minoterie ? <Text style={s.detail}>{minoterie}</Text> : null}
        </Carte>

        <Carte style={s.carte}>
          <Text style={s.titreCarte}>Envoi des relevés</Text>
          <Text style={s.detail}>
            {file.length === 0 ? 'Tous vos relevés sont envoyés.' : `${file.length} relevé(s) en attente sur le téléphone.`}
          </Text>
          <Text style={s.detail}>Dernier envoi réussi : {formatHorodatage(derniereSync)}</Text>
          {message ? <Bandeau ton={message.ton}>{message.texte}</Bandeau> : null}
          <Bouton titre="Envoyer maintenant" variante="contour" icone="cloud-upload-outline" onPress={envoyer} chargement={envoi} />
        </Carte>

        <Carte style={s.carte}>
          <Text style={s.titreCarte}>Listes de référence</Text>
          <Text style={s.detail}>
            {ref
              ? `${ref.marques.length} marques, ${ref.regions.length} régions, ${ref.villes.length} villes. Mises à jour le ${formatHorodatage(ref.majLe)}.`
              : 'Non chargées.'}
          </Text>
          {source === 'cache' ? <Text style={s.detail}>Copie enregistrée sur le téléphone (hors ligne).</Text> : null}
          {erreur ? <Bandeau ton="erreur">{erreur}</Bandeau> : null}
          <Bouton titre="Mettre à jour les listes" variante="contour" icone="refresh" onPress={recharger} chargement={chargement} />
        </Carte>

        <View style={{ marginTop: 8 }}>
          <Bouton titre="Se déconnecter" variante="discret" icone="log-out-outline" onPress={seDeconnecter} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: couleurs.fond },
  titre: { fontFamily: polices.chiffreGras, fontSize: 30, color: couleurs.encre, paddingHorizontal: 20, paddingVertical: 8 },
  contenu: { padding: 20, paddingTop: 4, gap: 14 },
  carte: { gap: 10 },
  nom: { fontFamily: polices.gras, fontSize: 20, color: couleurs.encre, marginBottom: 2 },
  titreCarte: { fontFamily: polices.gras, fontSize: 17, color: couleurs.encre },
  detail: { fontFamily: polices.regulier, fontSize: 15, color: couleurs.encreDouce, lineHeight: 21 },
});
