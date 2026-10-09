import { Image, ImageSourcePropType, StyleSheet, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useReferentiel } from '../context/ReferentielContext';

// Logo affiché en haut à gauche de chaque écran, selon la minoterie de l'enquêteur connecté.

const LOGOS: Record<string, ImageSourcePropType> = {
  'CADYST GRAIN': require('../../assets/logos/cadyst-grain.png'),
  SGMC: require('../../assets/logos/sgmc.png'),
};
const LOGO_GROUPE: ImageSourcePropType = require('../../assets/logos/groupe-cadyst.png');

export function LogoMinoterie() {
  const { utilisateur } = useAuth();
  const { ref } = useReferentiel();
  const nom = ref?.minoteries.find((m) => m.id_minoterie === utilisateur?.id_minoterie)?.nom_minoterie;
  const source = (nom && LOGOS[nom.trim().toUpperCase()]) || LOGO_GROUPE;

  return (
    <View style={s.cadre}>
      <Image source={source} style={s.logo} resizeMode="contain" accessibilityLabel={nom ?? 'Groupe CADYST'} />
    </View>
  );
}

const s = StyleSheet.create({
  cadre: { paddingHorizontal: 20, paddingTop: 8, alignItems: 'flex-start' },
  logo: { height: 36, width: 120 },
});
