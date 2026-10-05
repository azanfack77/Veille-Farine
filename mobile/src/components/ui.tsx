import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { couleurs, polices } from '../theme';

export function Section({ titre, aide, children }: { titre: string; aide?: string; children: ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.titreSection} accessibilityRole="header">
        {titre}
      </Text>
      {aide ? <Text style={s.aide}>{aide}</Text> : null}
      <View style={s.contenuSection}>{children}</View>
    </View>
  );
}

export function Libelle({ children }: { children: ReactNode }) {
  return <Text style={s.libelle}>{children}</Text>;
}

export function ErreurChamp({ texte }: { texte?: string | null }) {
  if (!texte) return null;
  return <Text style={s.erreurChamp}>{texte}</Text>;
}

export type Option<T> = { valeur: T; libelle: string };

export function GroupePuces<T extends string | number>({
  options,
  valeur,
  onChange,
  enErreur,
}: {
  options: Option<T>[];
  valeur: T | null;
  onChange: (v: T) => void;
  enErreur?: boolean;
}) {
  return (
    <View style={s.puces} accessibilityRole="radiogroup">
      {options.map((o) => {
        const actif = o.valeur === valeur;
        return (
          <Pressable
            key={String(o.valeur)}
            onPress={() => onChange(o.valeur)}
            accessibilityRole="radio"
            accessibilityState={{ selected: actif }}
            style={({ pressed }) => [
              s.puce,
              enErreur && !actif && s.puceErreur,
              actif && s.puceActive,
              pressed && !actif && s.pucePressee,
            ]}
          >
            <Text style={[s.textePuce, actif && s.textePuceActive]}>{o.libelle}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

type NomIcone = ComponentProps<typeof Ionicons>['name'];

export function Bouton({
  titre,
  onPress,
  variante = 'plein',
  chargement = false,
  desactive = false,
  icone,
  style,
}: {
  titre: string;
  onPress: () => void;
  variante?: 'plein' | 'contour' | 'discret';
  chargement?: boolean;
  desactive?: boolean;
  icone?: NomIcone;
  style?: StyleProp<ViewStyle>;
}) {
  const couleurTexte = variante === 'plein' ? '#FFFFFF' : couleurs.primaire;
  return (
    <Pressable
      onPress={onPress}
      disabled={desactive || chargement}
      accessibilityRole="button"
      style={({ pressed }) => [
        s.bouton,
        variante === 'plein' && s.boutonPlein,
        variante === 'contour' && s.boutonContour,
        variante === 'discret' && s.boutonDiscret,
        pressed && { opacity: 0.85 },
        (desactive || chargement) && { opacity: 0.55 },
        style,
      ]}
    >
      {chargement ? (
        <ActivityIndicator color={couleurTexte} />
      ) : (
        <>
          {icone ? <Ionicons name={icone} size={18} color={couleurTexte} /> : null}
          <Text style={[s.texteBouton, { color: couleurTexte }]}>{titre}</Text>
        </>
      )}
    </Pressable>
  );
}

const TONS = {
  info: { fond: couleurs.primaireDoux, texte: couleurs.primaireFonce, icone: 'information-circle' },
  succes: { fond: couleurs.succesDoux, texte: couleurs.succes, icone: 'checkmark-circle' },
  attente: { fond: couleurs.bleDoux, texte: couleurs.attente, icone: 'cloud-offline' },
  erreur: { fond: couleurs.erreurDoux, texte: couleurs.erreur, icone: 'alert-circle' },
} as const;

export function Bandeau({
  ton,
  children,
  onFermer,
}: {
  ton: keyof typeof TONS;
  children: ReactNode;
  onFermer?: () => void;
}) {
  const t = TONS[ton];
  return (
    <View style={[s.bandeau, { backgroundColor: t.fond }]} accessibilityLiveRegion="polite">
      <Ionicons name={t.icone} size={20} color={t.texte} />
      <Text style={[s.texteBandeau, { color: t.texte }]}>{children}</Text>
      {onFermer ? (
        <Pressable onPress={onFermer} hitSlop={12} accessibilityLabel="Fermer le message">
          <Ionicons name="close" size={18} color={t.texte} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function Carte({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.carte, style]}>{children}</View>;
}

const s = StyleSheet.create({
  section: { paddingHorizontal: 20, paddingTop: 24 },
  titreSection: { fontFamily: polices.gras, fontSize: 17, color: couleurs.encre, marginBottom: 4 },
  aide: { fontFamily: polices.regulier, fontSize: 14, color: couleurs.encreDouce, marginBottom: 4, lineHeight: 19 },
  contenuSection: { gap: 12, marginTop: 8 },
  libelle: { fontFamily: polices.moyen, fontSize: 14, color: couleurs.encreDouce, marginBottom: -4 },
  erreurChamp: { fontFamily: polices.moyen, fontSize: 13, color: couleurs.erreur },
  puces: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  puce: {
    minHeight: 40,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: couleurs.trait,
    backgroundColor: couleurs.surface,
  },
  pucePressee: { backgroundColor: couleurs.primaireDoux },
  puceErreur: { borderColor: couleurs.erreur },
  puceActive: { backgroundColor: couleurs.primaire, borderColor: couleurs.primaire },
  textePuce: { fontFamily: polices.moyen, fontSize: 15, color: couleurs.encre },
  textePuceActive: { color: '#FFFFFF' },
  bouton: {
    minHeight: 50,
    borderRadius: 10,
    paddingHorizontal: 18,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boutonPlein: { backgroundColor: couleurs.primaire },
  boutonContour: { borderWidth: 1.5, borderColor: couleurs.primaire, backgroundColor: couleurs.surface },
  boutonDiscret: { backgroundColor: 'transparent', minHeight: 40 },
  texteBouton: { fontFamily: polices.gras, fontSize: 16 },
  bandeau: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 10,
  },
  texteBandeau: { flex: 1, fontFamily: polices.moyen, fontSize: 14, lineHeight: 19 },
  carte: { backgroundColor: couleurs.surface, borderRadius: 12, padding: 16 },
});
