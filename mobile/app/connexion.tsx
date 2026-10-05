import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bandeau, Bouton } from '../src/components/ui';
import { supabase } from '../src/lib/supabase';
import { couleurs, polices } from '../src/theme';

export default function EcranConnexion() {
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [chargement, setChargement] = useState(false);
  const [message, setMessage] = useState<{ ton: 'erreur' | 'succes'; texte: string } | null>(null);

  const seConnecter = async () => {
    setMessage(null);
    if (!email.trim() || !motDePasse) {
      setMessage({ ton: 'erreur', texte: 'Saisissez votre email et votre mot de passe.' });
      return;
    }
    setChargement(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: motDePasse });
    setChargement(false);
    if (error) {
      setMessage({
        ton: 'erreur',
        texte: /invalid/i.test(error.message)
          ? 'Email ou mot de passe incorrect.'
          : 'Connexion impossible. Vérifiez votre accès à internet puis réessayez.',
      });
    }
  };

  const motDePasseOublie = async () => {
    if (!email.trim()) {
      setMessage({ ton: 'erreur', texte: 'Saisissez d’abord votre email, puis appuyez de nouveau.' });
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    setMessage(
      error
        ? { ton: 'erreur', texte: 'Envoi impossible pour le moment. Réessayez plus tard.' }
        : { ton: 'succes', texte: `Un lien de réinitialisation a été envoyé à ${email.trim()}.` },
    );
  };

  return (
    <SafeAreaView style={s.page}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.contenu} keyboardShouldPersistTaps="handled">
          <View style={s.marque}>
            <Text style={s.titre}>Veille{'\n'}Farines</Text>
            <Text style={s.sousTitre}>Relevés de prix des minoteries sur le terrain</Text>
          </View>

          <View style={s.formulaire}>
            <Text style={s.libelle}>Email professionnel</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              style={s.saisie}
              placeholder="prenom.nom@entreprise.cm"
              placeholderTextColor="#98A2AD"
            />
            <Text style={s.libelle}>Mot de passe</Text>
            <TextInput
              value={motDePasse}
              onChangeText={setMotDePasse}
              secureTextEntry
              autoComplete="password"
              textContentType="password"
              style={s.saisie}
              onSubmitEditing={seConnecter}
              returnKeyType="go"
            />
            {message ? <Bandeau ton={message.ton}>{message.texte}</Bandeau> : null}
            <Bouton titre="Se connecter" onPress={seConnecter} chargement={chargement} style={{ marginTop: 8 }} />
            <Bouton titre="Mot de passe oublié" variante="discret" onPress={motDePasseOublie} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: couleurs.primaire },
  contenu: { flexGrow: 1, justifyContent: 'space-between' },
  marque: { paddingHorizontal: 28, paddingTop: 56, paddingBottom: 36 },
  titre: { fontFamily: polices.chiffreGras, fontSize: 64, lineHeight: 62, color: '#FFFFFF' },
  sousTitre: { fontFamily: polices.moyen, fontSize: 17, color: couleurs.ble, marginTop: 14, maxWidth: 280 },
  formulaire: {
    backgroundColor: couleurs.fond,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 24,
    paddingBottom: 40,
    gap: 10,
  },
  libelle: { fontFamily: polices.moyen, fontSize: 14, color: couleurs.encreDouce, marginTop: 4 },
  saisie: {
    height: 50,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: couleurs.trait,
    backgroundColor: couleurs.surface,
    paddingHorizontal: 14,
    fontFamily: polices.moyen,
    fontSize: 16,
    color: couleurs.encre,
  },
});
