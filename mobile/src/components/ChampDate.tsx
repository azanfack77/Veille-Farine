import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { formatDateLongue, memeJour } from '../lib/format';
import { couleurs, polices } from '../theme';
import { GroupePuces } from './ui';

type Choix = 'auj' | 'hier' | 'autre';

export function ChampDate({ valeur, onChange }: { valeur: Date; onChange: (d: Date) => void }) {
  const [afficherCalendrier, setAfficherCalendrier] = useState(false);
  const aujourdhui = new Date();
  const hier = new Date(aujourdhui);
  hier.setDate(hier.getDate() - 1);

  const choix: Choix = memeJour(valeur, aujourdhui) ? 'auj' : memeJour(valeur, hier) ? 'hier' : 'autre';

  const selectionner = (c: Choix) => {
    if (c === 'auj') onChange(aujourdhui);
    else if (c === 'hier') onChange(hier);
    else setAfficherCalendrier(true);
  };

  const surChoixCalendrier = (e: DateTimePickerEvent, d?: Date) => {
    if (Platform.OS === 'android') setAfficherCalendrier(false);
    if (e.type === 'set' && d) onChange(d);
    if (e.type === 'dismissed') setAfficherCalendrier(false);
  };

  return (
    <View style={{ gap: 8 }}>
      <GroupePuces<Choix>
        options={[
          { valeur: 'auj', libelle: "Aujourd'hui" },
          { valeur: 'hier', libelle: 'Hier' },
          { valeur: 'autre', libelle: 'Autre date' },
        ]}
        valeur={choix}
        onChange={selectionner}
      />
      <Text style={s.date}>{formatDateLongue(valeur)}</Text>
      {afficherCalendrier ? (
        <DateTimePicker
          value={valeur}
          mode="date"
          maximumDate={aujourdhui}
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={surChoixCalendrier}
          locale="fr-FR"
        />
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  date: { fontFamily: polices.moyen, fontSize: 14, color: couleurs.encreDouce },
});
