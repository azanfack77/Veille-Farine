import { StyleSheet, Text, View } from 'react-native';
import { calculerNetRendu, DEDUCTIONS, Montants } from '../lib/calcul';
import { formatNombre } from '../lib/format';
import { couleurs, polices } from '../theme';

/**
 * Montre, pendant la saisie, comment on passe du prix sortie usine
 * au net rendu grossiste (même formule que la base).
 */
export function CascadeNetRendu({
  montants,
  prixMarche,
  kg,
}: {
  montants: Montants;
  prixMarche: number | null;
  kg: number | null;
}) {
  const net = calculerNetRendu(montants);
  const lignes = DEDUCTIONS.filter((d) => (montants[d.cle] ?? 0) !== 0);

  return (
    <View style={s.carte} accessibilityLabel={`Net rendu grossiste : ${formatNombre(net)} francs CFA`}>
      <Text style={s.titre}>Net rendu grossiste</Text>

      {montants.sortie_usine == null ? (
        <Text style={s.vide}>Le calcul s'affiche dès que le prix sortie usine est saisi.</Text>
      ) : (
        <>
          <Ligne libelle="Sortie usine" valeur={formatNombre(montants.sortie_usine)} />
          {lignes.map((d) => {
            const v = montants[d.cle] ?? 0;
            return (
              <Ligne
                key={d.cle}
                libelle={d.libelle}
                valeur={v >= 0 ? `− ${formatNombre(v)}` : `+ ${formatNombre(-v)}`}
                discret
              />
            );
          })}
          <View style={s.filet} />
          <View style={s.resultat}>
            <Text style={[s.net, net != null && net < 0 && { color: '#FF9B8F' }]}>{formatNombre(net)}</Text>
            <Text style={s.devise}>FCFA / sac</Text>
          </View>
          {kg && net != null ? <Text style={s.parKg}>soit {formatNombre(net / kg)} FCFA le kilo</Text> : null}
          {net != null && net < 0 ? (
            <Text style={s.alerte}>Les déductions dépassent le prix sortie usine : vérifiez les montants.</Text>
          ) : null}
          {prixMarche != null && net != null ? (
            <View style={s.ecart}>
              <Text style={s.libelleEcart}>Écart prix marché − net rendu</Text>
              <Text style={s.valeurEcart}>
                {prixMarche - net >= 0 ? '+' : ''}
                {formatNombre(prixMarche - net)}
              </Text>
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

function Ligne({ libelle, valeur, discret }: { libelle: string; valeur: string; discret?: boolean }) {
  return (
    <View style={s.ligne}>
      <Text style={[s.libelle, discret && s.libelleDiscret]}>{libelle}</Text>
      <Text style={[s.valeur, discret && s.libelleDiscret]}>{valeur}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  carte: {
    marginHorizontal: 20,
    marginTop: 24,
    backgroundColor: couleurs.primaire,
    borderRadius: 14,
    padding: 18,
    gap: 6,
  },
  titre: { fontFamily: polices.gras, fontSize: 15, color: '#C9CFF0', marginBottom: 6 },
  vide: { fontFamily: polices.regulier, fontSize: 15, color: '#DDE1F7', lineHeight: 21 },
  ligne: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  libelle: { fontFamily: polices.moyen, fontSize: 15, color: '#FFFFFF' },
  libelleDiscret: { color: '#B9C0EA', fontFamily: polices.regulier },
  valeur: { fontFamily: polices.chiffre, fontSize: 17, color: '#FFFFFF' },
  filet: { height: 1, backgroundColor: '#4A58B3', marginVertical: 8 },
  resultat: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  net: { fontFamily: polices.chiffreGras, fontSize: 52, lineHeight: 56, color: couleurs.ble },
  devise: { fontFamily: polices.moyen, fontSize: 15, color: '#DDE1F7' },
  parKg: { fontFamily: polices.regulier, fontSize: 14, color: '#C9CFF0' },
  alerte: { fontFamily: polices.moyen, fontSize: 14, color: '#FFD2CC', marginTop: 4 },
  ecart: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#4A58B3',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  libelleEcart: { fontFamily: polices.regulier, fontSize: 14, color: '#DDE1F7', flex: 1 },
  valeurEcart: { fontFamily: polices.chiffre, fontSize: 20, color: '#FFFFFF' },
});
