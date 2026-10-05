import { forwardRef } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { filtrerSaisieMontant, saisieInvalide } from '../lib/format';
import { couleurs, polices } from '../theme';

type Props = {
  libelle: string;
  valeur: string;
  onChange: (texte: string) => void;
  unite?: string;
  mis_en_avant?: boolean;
} & Pick<TextInputProps, 'onSubmitEditing' | 'returnKeyType'>;

/** Ligne "libellé ... [montant] unité", pensée pour enchaîner les saisies rapidement. */
export const ChampMontant = forwardRef<TextInput, Props>(function ChampMontant(
  { libelle, valeur, onChange, unite = 'FCFA', mis_en_avant = false, onSubmitEditing, returnKeyType = 'next' },
  ref,
) {
  const invalide = saisieInvalide(valeur);
  return (
    <View>
      <View style={s.ligne}>
        <Text style={[s.libelle, mis_en_avant && s.libelleFort]} numberOfLines={2}>
          {libelle}
        </Text>
        <View style={[s.boite, mis_en_avant && s.boiteForte, invalide && s.boiteErreur]}>
          <TextInput
            ref={ref}
            value={valeur}
            onChangeText={(t) => onChange(filtrerSaisieMontant(t))}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor="#A7B0BA"
            style={[s.saisie, mis_en_avant && s.saisieForte]}
            returnKeyType={returnKeyType}
            onSubmitEditing={onSubmitEditing}
            blurOnSubmit={returnKeyType !== 'next'}
            accessibilityLabel={`${libelle} en ${unite}`}
            selectTextOnFocus
          />
          <Text style={s.unite}>{unite}</Text>
        </View>
      </View>
      {invalide ? <Text style={s.erreur}>Saisissez un nombre, par exemple 12500</Text> : null}
    </View>
  );
});

const s = StyleSheet.create({
  ligne: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  libelle: { flex: 1, fontFamily: polices.regulier, fontSize: 15, color: couleurs.encre },
  libelleFort: { fontFamily: polices.gras, fontSize: 16 },
  boite: {
    width: 160,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: couleurs.trait,
    borderRadius: 8,
    backgroundColor: couleurs.surface,
    paddingHorizontal: 10,
  },
  boiteForte: { borderColor: couleurs.primaire, borderWidth: 1.5, height: 52 },
  boiteErreur: { borderColor: couleurs.erreur },
  saisie: {
    flex: 1,
    textAlign: 'right',
    fontFamily: polices.chiffre,
    fontSize: 20,
    color: couleurs.encre,
    paddingVertical: 0,
  },
  saisieForte: { fontSize: 23 },
  unite: { marginLeft: 6, fontFamily: polices.moyen, fontSize: 12, color: couleurs.encreDouce },
  erreur: { fontFamily: polices.moyen, fontSize: 13, color: couleurs.erreur, textAlign: 'right', marginTop: 4 },
});
