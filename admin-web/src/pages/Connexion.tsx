import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { Champ, Message } from '../components/ui';
import { useSession } from '../context/Session';
import { noterActivite } from '../lib/inactivite';
import { supabase } from '../lib/supabase';

// Connexion sans mot de passe : un code à usage unique est envoyé par email.
// Le modèle d'email « Magic Link » de Supabase doit contenir {{ .Token }} (voir le README).

const ATTENTE_RENVOI_S = 60; // Supabase refuse un nouvel envoi avant 60 secondes

export function Connexion() {
  const { motifDeconnexion } = useSession();
  const [etape, setEtape] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(motifDeconnexion);
  const [chargement, setChargement] = useState(false);
  const [renvoiDans, setRenvoiDans] = useState(0);

  useEffect(() => {
    if (renvoiDans <= 0) return;
    const minuteur = window.setTimeout(() => setRenvoiDans((s) => s - 1), 1000);
    return () => window.clearTimeout(minuteur);
  }, [renvoiDans]);

  const envoyerCode = async (e?: FormEvent) => {
    e?.preventDefault();
    setErreur(null);
    setInfo(null);
    const adresse = email.trim().toLowerCase();
    setChargement(true);
    // shouldCreateUser: false — seuls les comptes existants peuvent recevoir un code
    const { error } = await supabase.auth.signInWithOtp({ email: adresse, options: { shouldCreateUser: false } });
    setChargement(false);
    if (error) {
      setErreur(traduireErreurEnvoi(error.message, error.code));
      return;
    }
    setEmail(adresse);
    setCode('');
    setEtape('code');
    setRenvoiDans(ATTENTE_RENVOI_S);
    setInfo(`Un code a été envoyé à ${adresse}. Pensez à vérifier les courriers indésirables.`);
  };

  const verifierCode = async (e: FormEvent) => {
    e.preventDefault();
    setErreur(null);
    setChargement(true);
    noterActivite(); // avant la connexion : le contrôle d'inactivité ne doit pas la refuser
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
    setChargement(false);
    if (error) {
      setErreur(
        /expired|invalid/i.test(error.message)
          ? 'Code incorrect ou expiré. Vérifiez le dernier email reçu, ou demandez un nouveau code.'
          : error.message,
      );
    }
  };

  const changerEmail = () => {
    setEtape('email');
    setCode('');
    setErreur(null);
    setInfo(null);
  };

  if (etape === 'code') {
    return (
      <CadreConnexion>
        <form className="connexion-formulaire" onSubmit={verifierCode}>
          <h1>Code de connexion</h1>
          <p className="description">Saisissez le code envoyé à {email}.</p>
          <Champ libelle="Code reçu par email">
            <input
              className="saisie-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6,10}"
              maxLength={10}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              autoFocus
              required
            />
          </Champ>
          {info ? <Message ton="succes">{info}</Message> : null}
          {erreur ? <Message ton="erreur">{erreur}</Message> : null}
          <button className="bouton" type="submit" disabled={chargement}>
            {chargement ? 'Vérification…' : 'Se connecter'}
          </button>
          <button type="button" className="lien-discret" onClick={() => envoyerCode()} disabled={renvoiDans > 0 || chargement}>
            {renvoiDans > 0 ? `Renvoyer un code (${renvoiDans} s)` : 'Renvoyer un code'}
          </button>
          <button type="button" className="lien-discret" onClick={changerEmail}>
            ← Changer d'email
          </button>
        </form>
      </CadreConnexion>
    );
  }

  return (
    <CadreConnexion>
      <form className="connexion-formulaire" onSubmit={envoyerCode}>
        <h1>Connexion</h1>
        <p className="description">Vous recevrez un code de connexion par email. Aucun mot de passe n'est nécessaire.</p>
        <Champ libelle="Email">
          <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Champ>
        {info ? <Message ton="info">{info}</Message> : null}
        {erreur ? <Message ton="erreur">{erreur}</Message> : null}
        <button className="bouton" type="submit" disabled={chargement}>
          {chargement ? 'Envoi…' : 'Recevoir un code'}
        </button>
      </form>
    </CadreConnexion>
  );
}

function traduireErreurEnvoi(message: string, code?: string): string {
  // Limite globale du projet (2 emails par heure sans serveur SMTP configuré dans Supabase)
  if (code === 'over_email_send_rate_limit' || /email rate limit/i.test(message))
    return "Limite d'envoi d'emails atteinte pour le moment. Réessayez dans une heure, ou demandez à l'administrateur de configurer l'envoi d'emails (SMTP) dans Supabase.";
  if (/signups not allowed|user not found/i.test(message))
    return "Aucun compte n'existe pour cet email. Demandez à un administrateur de vous ajouter.";
  if (/banned/i.test(message)) return "Ce compte est désactivé. Contactez l'administrateur.";
  if (/rate limit|security purposes|seconds/i.test(message))
    return 'Trop de demandes. Patientez une minute avant de demander un nouveau code.';
  return message;
}

function CadreConnexion({ children }: { children: ReactNode }) {
  return (
    <div className="connexion">
      <section className="connexion-marque">
        <p className="connexion-titre">
          Veille
          <br />
          Farines
        </p>
        <p className="connexion-sous-titre">Console d'administration des relevés de prix</p>
      </section>
      {children}
    </div>
  );
}
