import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { useFileAttente } from '../hooks/useFileAttente';
import { synchroniser } from '../lib/fileAttente';
import { couleurs, polices } from '../theme';

/** Indique en permanence s'il reste des relevés à envoyer ; un appui relance l'envoi. */
export function PastilleSynchro() {
  const file = useFileAttente();
  const [envoi, setEnvoi] = useState(false);
  const n = file.length;
  const refuses = file.filter((e) => e.statut === 'refuse').length;

  const lancer = async () => {
    setEnvoi(true);
    try {
      await synchroniser();
    } finally {
      setEnvoi(false);
    }
  };

  const ton = refuses > 0 ? 'erreur' : n > 0 ? 'attente' : 'ok';
  const texte = refuses > 0 ? `${refuses} refusé${refuses > 1 ? 's' : ''}` : n > 0 ? `${n} à envoyer` : 'Tout est envoyé';

  return (
    <Pressable
      onPress={lancer}
      disabled={envoi || n === 0}
      accessibilityRole="button"
      accessibilityLabel={`${texte}. ${n > 0 ? 'Appuyer pour envoyer maintenant' : ''}`}
      style={[s.pastille, ton === 'attente' && s.attente, ton === 'erreur' && s.erreur]}
    >
      {envoi ? (
        <ActivityIndicator size="small" color={couleurs.attente} />
      ) : (
        <Ionicons
          name={ton === 'ok' ? 'cloud-done' : ton === 'erreur' ? 'alert-circle' : 'cloud-upload'}
          size={16}
          color={ton === 'ok' ? couleurs.succes : ton === 'erreur' ? couleurs.erreur : couleurs.attente}
        />
      )}
      <Text style={[s.texte, ton === 'attente' && { color: couleurs.attente }, ton === 'erreur' && { color: couleurs.erreur }]}>
        {texte}
      </Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  pastille: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    height: 30,
    borderRadius: 15,
    backgroundColor: couleurs.succesDoux,
  },
  attente: { backgroundColor: couleurs.bleDoux },
  erreur: { backgroundColor: couleurs.erreurDoux },
  texte: { fontFamily: polices.moyen, fontSize: 13, color: couleurs.succes },
});
