import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bandeau, Bouton } from '../src/components/ui';
import { useAuth } from '../src/context/AuthContext';
import { noterActivite } from '../src/lib/inactivite';
import { supabase } from '../src/lib/supabase';
import { couleurs, polices } from '../src/theme';

// Deux façons de se connecter : email + mot de passe (par défaut), ou code à usage unique reçu par
// email (pratique en cas d'oubli du mot de passe). Pour le code, le modèle d'email « Magic Link »
// de Supabase doit contenir {{ .Token }} (voir le README).

const ATTENTE_RENVOI_S = 60; // Supabase refuse un nouvel envoi avant 60 secondes

type Message = { ton: 'erreur' | 'succes' | 'info'; texte: string };
type Etape = 'motDePasse' | 'email' | 'code';

export default function EcranConnexion() {
  const { motifDeconnexion } = useAuth();
  const [etape, setEtape] = useState<Etape>('motDePasse');
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [motDePasseVisible, setMotDePasseVisible] = useState(false);
  const [code, setCode] = useState('');
  const [chargement, setChargement] = useState(false);
  const [renvoiDans, setRenvoiDans] = useState(0);
  const [message, setMessage] = useState<Message | null>(
    motifDeconnexion ? { ton: 'info', texte: motifDeconnexion } : null,
  );

  useEffect(() => {
    if (renvoiDans <= 0) return;
    const minuteur = setTimeout(() => setRenvoiDans((s) => s - 1), 1000);
    return () => clearTimeout(minuteur);
  }, [renvoiDans]);

  const seConnecter = async () => {
    setMessage(null);
    if (!email.trim() || !motDePasse) {
      setMessage({ ton: 'erreur', texte: 'Saisissez votre email et votre mot de passe.' });
      return;
    }
    setChargement(true);
    await noterActivite(); // avant la connexion : le contrôle d'inactivité ne doit pas la refuser
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: motDePasse });
    setChargement(false);
    if (error) {
      setMessage({
        ton: 'erreur',
        texte: /invalid/i.test(error.message)
          ? 'Email ou mot de passe incorrect.'
          : /banned/i.test(error.message)
            ? "Ce compte est désactivé. Contactez l'administrateur."
            : 'Connexion impossible. Vérifiez votre accès à internet puis réessayez.',
      });
    }
  };

  const allerA = (e: Etape) => {
    setEtape(e);
    setCode('');
    setMessage(null);
  };

  const envoyerCode = async () => {
    setMessage(null);
    const adresse = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(adresse)) {
      setMessage({ ton: 'erreur', texte: 'Saisissez votre email professionnel.' });
      return;
    }
    setChargement(true);
    // shouldCreateUser: false — seuls les comptes créés depuis la console peuvent se connecter
    const { error } = await supabase.auth.signInWithOtp({ email: adresse, options: { shouldCreateUser: false } });
    setChargement(false);
    if (error) {
      setMessage({ ton: 'erreur', texte: traduireErreurEnvoi(error.message, error.code) });
      return;
    }
    setEmail(adresse);
    setCode('');
    setEtape('code');
    setRenvoiDans(ATTENTE_RENVOI_S);
    setMessage({ ton: 'succes', texte: `Un code a été envoyé à ${adresse}. Pensez à vérifier les courriers indésirables.` });
  };

  const verifierCode = async () => {
    setMessage(null);
    const jeton = code.replace(/\D/g, '');
    if (jeton.length < 6) {
      setMessage({ ton: 'erreur', texte: 'Saisissez le code reçu par email.' });
      return;
    }
    setChargement(true);
    await noterActivite(); // avant la connexion : le contrôle d'inactivité ne doit pas la refuser
    const { error } = await supabase.auth.verifyOtp({ email, token: jeton, type: 'email' });
    setChargement(false);
    if (error) {
      setMessage({
        ton: 'erreur',
        texte: /expired|invalid/i.test(error.message)
          ? 'Code incorrect ou expiré. Vérifiez le dernier email reçu, ou demandez un nouveau code.'
          : 'Connexion impossible. Vérifiez votre accès à internet puis réessayez.',
      });
    }
    // En cas de succès, la redirection est faite par la garde de navigation (app/_layout.tsx)
  };

  return (
    <SafeAreaView style={s.page}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.contenu} keyboardShouldPersistTaps="handled">
          <View style={s.marque}>
            <Text style={s.titre}>Veille{'\n'}Farines</Text>
            <Text style={s.sousTitre}>Relevés de prix des minoteries sur le terrain</Text>
          </View>

          {etape === 'motDePasse' ? (
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
                returnKeyType="next"
              />
              <Text style={s.libelle}>Mot de passe</Text>
              <View style={s.ligneMotDePasse}>
                <TextInput
                  value={motDePasse}
                  onChangeText={setMotDePasse}
                  secureTextEntry={!motDePasseVisible}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="password"
                  textContentType="password"
                  style={[s.saisie, s.saisieMotDePasse]}
                  onSubmitEditing={seConnecter}
                  returnKeyType="go"
                />
                <Pressable
                  onPress={() => setMotDePasseVisible((v) => !v)}
                  style={s.oeil}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={motDePasseVisible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  <Ionicons name={motDePasseVisible ? 'eye-off-outline' : 'eye-outline'} size={22} color={couleurs.encreDouce} />
                </Pressable>
              </View>
              {message ? <Bandeau ton={message.ton}>{message.texte}</Bandeau> : null}
              <Bouton titre="Se connecter" onPress={seConnecter} chargement={chargement} style={{ marginTop: 8 }} />
              <Bouton titre="Se connecter avec un code reçu par email" variante="discret" onPress={() => allerA('email')} />
            </View>
          ) : etape === 'email' ? (
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
                onSubmitEditing={envoyerCode}
                returnKeyType="send"
              />
              <Text style={s.aide}>Vous recevrez un code de connexion par email, sans avoir besoin de votre mot de passe.</Text>
              {message ? <Bandeau ton={message.ton}>{message.texte}</Bandeau> : null}
              <Bouton titre="Recevoir un code" onPress={envoyerCode} chargement={chargement} style={{ marginTop: 8 }} />
              <Bouton titre="Se connecter avec un mot de passe" variante="discret" onPress={() => allerA('motDePasse')} />
            </View>
          ) : (
            <View style={s.formulaire}>
              <Text style={s.libelle}>Code reçu par email</Text>
              <TextInput
                value={code}
                onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 10))}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                style={[s.saisie, s.saisieCode]}
                placeholder="123456"
                placeholderTextColor="#98A2AD"
                maxLength={10}
                autoFocus
                onSubmitEditing={verifierCode}
                returnKeyType="go"
              />
              <Text style={s.aide}>Envoyé à {email}</Text>
              {message ? <Bandeau ton={message.ton}>{message.texte}</Bandeau> : null}
              <Bouton titre="Se connecter" onPress={verifierCode} chargement={chargement} style={{ marginTop: 8 }} />
              <Bouton
                titre={renvoiDans > 0 ? `Renvoyer un code (${renvoiDans} s)` : 'Renvoyer un code'}
                variante="discret"
                onPress={envoyerCode}
                desactive={renvoiDans > 0 || chargement}
              />
              <Bouton titre="Changer d'email" variante="discret" onPress={() => allerA('email')} />
              <Bouton titre="Se connecter avec un mot de passe" variante="discret" onPress={() => allerA('motDePasse')} />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function traduireErreurEnvoi(message: string, code?: string): string {
  // Limite globale du projet (2 emails par heure sans serveur SMTP configuré dans Supabase)
  if (code === 'over_email_send_rate_limit' || /email rate limit/i.test(message))
    return "Limite d'envoi d'emails atteinte pour le moment. Réessayez dans une heure, ou demandez à l'administrateur de configurer l'envoi d'emails (SMTP) dans Supabase.";
  if (/signups not allowed|user not found/i.test(message))
    return "Aucun compte n'existe pour cet email. Demandez à l'administrateur de vous ajouter.";
  if (/banned/i.test(message)) return "Ce compte est désactivé. Contactez l'administrateur.";
  if (/rate limit|security purposes|seconds/i.test(message))
    return 'Trop de demandes. Patientez une minute avant de demander un nouveau code.';
  return 'Envoi impossible. Vérifiez votre accès à internet puis réessayez.';
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
  aide: { fontFamily: polices.regulier, fontSize: 13, color: couleurs.encreDouce },
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
  ligneMotDePasse: { justifyContent: 'center' },
  saisieMotDePasse: { paddingRight: 48 },
  oeil: { position: 'absolute', right: 4, height: 44, width: 44, alignItems: 'center', justifyContent: 'center' },
  saisieCode: { fontFamily: polices.chiffreGras, fontSize: 26, letterSpacing: 6, textAlign: 'center' },
});
