import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { createElement, useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { dateISO, formatDateLongue, memeJour } from '../lib/format';
import { couleurs, polices } from '../theme';
import { GroupePuces } from './ui';

type Choix = 'auj' | 'hier' | 'autre';

/** Une date ne peut jamais dépasser aujourd'hui : un relevé porte sur un prix déjà observé. */
function auPlusAujourdhui(d: Date): Date {
  const aujourdhui = new Date();
  return d > aujourdhui ? aujourdhui : d;
}

export function ChampDate({ valeur, onChange }: { valeur: Date; onChange: (d: Date) => void }) {
  const [afficherCalendrier, setAfficherCalendrier] = useState(false);
  const aujourdhui = new Date();
  const hier = new Date(aujourdhui);
  hier.setDate(hier.getDate() - 1);

  const choix: Choix = memeJour(valeur, aujourdhui) ? 'auj' : memeJour(valeur, hier) ? 'hier' : 'autre';

  const selectionner = (c: Choix) => {
    setAfficherCalendrier(c === 'autre');
    if (c === 'auj') onChange(aujourdhui);
    else if (c === 'hier') onChange(hier);
  };

  const surChoixCalendrier = (e: DateTimePickerEvent, d?: Date) => {
    if (Platform.OS === 'android') setAfficherCalendrier(false);
    if (e.type === 'set' && d) onChange(auPlusAujourdhui(d));
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
        valeur={afficherCalendrier ? 'autre' : choix}
        onChange={selectionner}
      />
      <Text style={s.date}>{formatDateLongue(valeur)}</Text>
      {afficherCalendrier ? (
        Platform.OS === 'web' ? (
          <CalendrierWeb valeur={valeur} max={aujourdhui} onChange={(d) => onChange(auPlusAujourdhui(d))} />
        ) : (
          <DateTimePicker
            value={valeur}
            mode="date"
            maximumDate={aujourdhui}
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onChange={surChoixCalendrier}
            locale="fr-FR"
          />
        )
      ) : null}
    </View>
  );
}

/**
 * Navigateur (test sur ordinateur) : le sélecteur natif n'existe pas, on utilise le champ date
 * du navigateur, ouvert directement et limité à aujourd'hui.
 */
function CalendrierWeb({ valeur, max, onChange }: { valeur: Date; max: Date; onChange: (d: Date) => void }) {
  const champ = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    try {
      champ.current?.focus();
      champ.current?.showPicker?.();
    } catch {
      // Certains navigateurs refusent l'ouverture automatique : un clic sur le champ l'ouvre.
    }
  }, []);

  return createElement('input', {
    ref: champ,
    type: 'date',
    value: dateISO(valeur),
    max: dateISO(max),
    'aria-label': 'Date du relevé',
    onChange: (e: { target: { value: string } }) => {
      const [a, m, j] = e.target.value.split('-').map(Number);
      if (a && m && j) onChange(new Date(a, m - 1, j));
    },
    style: {
      fontFamily: polices.moyen,
      fontSize: 16,
      padding: 10,
      borderRadius: 10,
      border: `1px solid ${couleurs.trait}`,
      backgroundColor: couleurs.surface,
      color: couleurs.encre,
    },
  });
}

const s = StyleSheet.create({
  date: { fontFamily: polices.moyen, fontSize: 14, color: couleurs.encreDouce },
});
