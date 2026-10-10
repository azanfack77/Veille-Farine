import { FormEvent, ReactNode, useState } from 'react';
import { PiedDePage } from '../components/Layout';
import { Champ, Message } from '../components/ui';
import { erreurLien, useSession } from '../context/Session';
import { noterActivite } from '../lib/inactivite';
import { supabase } from '../lib/supabase';

type Mode = 'connexion' | 'oubli';

export function Connexion() {
  const { motifDeconnexion } = useSession();
  const [mode, setMode] = useState<Mode>(erreurLien ? 'oubli' : 'connexion');
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState<string | null>(erreurLien);
  const [info, setInfo] = useState<string | null>(motifDeconnexion);
  const [succes, setSucces] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  const changerMode = (m: Mode) => {
    setMode(m);
    setErreur(null);
    setInfo(null);
    setSucces(null);
  };

  const envoyer = async (e: FormEvent) => {
    e.preventDefault();
    setErreur(null);
    setInfo(null);
    setChargement(true);
    noterActivite(); // avant la connexion : le contrôle d'inactivité ne doit pas la refuser
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: motDePasse });
    setChargement(false);
    if (error) setErreur(traduireErreurConnexion(error.message));
  };

  const demanderReinitialisation = async (e: FormEvent) => {
    e.preventDefault();
    setErreur(null);
    setSucces(null);
    setChargement(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/`,
    });
    setChargement(false);
    if (error) {
      setErreur(
        error.code === 'over_email_send_rate_limit' || /email rate limit/i.test(error.message)
          ? "Limite d'envoi d'emails atteinte pour le moment. Réessayez dans une heure, ou configurez l'envoi d'emails (SMTP) dans Supabase."
          : /rate limit|security purposes/i.test(error.message)
            ? "Trop de demandes d'email. Patientez quelques minutes avant de réessayer."
            : error.message,
      );
      return;
    }
    // Message volontairement identique que le compte existe ou non
    setSucces(
      `Si un compte existe pour ${email.trim()}, un email contenant un lien de réinitialisation vient d'être envoyé. Pensez à vérifier les indésirables.`,
    );
  };

  if (mode === 'oubli') {
    return (
      <CadreConnexion>
        <form className="connexion-formulaire" onSubmit={demanderReinitialisation}>
          <h1>Mot de passe oublié</h1>
          <p className="description">Saisissez votre email : vous recevrez un lien pour choisir un nouveau mot de passe.</p>
          <Champ libelle="Email">
            <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Champ>
          {erreur ? <Message ton="erreur">{erreur}</Message> : null}
          {succes ? <Message ton="succes">{succes}</Message> : null}
          <button className="bouton" type="submit" disabled={chargement}>
            {chargement ? 'Envoi…' : 'Envoyer le lien'}
          </button>
          <button type="button" className="lien-discret" onClick={() => changerMode('connexion')}>
            ← Retour à la connexion
          </button>
        </form>
      </CadreConnexion>
    );
  }

  return (
    <CadreConnexion>
      <form className="connexion-formulaire" onSubmit={envoyer}>
        <h1>Connexion</h1>
        <Champ libelle="Email">
          <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Champ>
        <Champ libelle="Mot de passe">
          <input
            type="password"
            autoComplete="current-password"
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            required
          />
        </Champ>
        {info ? <Message ton="info">{info}</Message> : null}
        {erreur ? <Message ton="erreur">{erreur}</Message> : null}
        <button className="bouton" type="submit" disabled={chargement}>
          {chargement ? 'Connexion…' : 'Se connecter'}
        </button>
        <button type="button" className="lien-discret" onClick={() => changerMode('oubli')}>
          Mot de passe oublié ?
        </button>
      </form>
    </CadreConnexion>
  );
}

function traduireErreurConnexion(message: string): string {
  if (/invalid/i.test(message)) return 'Email ou mot de passe incorrect.';
  if (/banned/i.test(message)) return 'Ce compte est désactivé. Contactez un administrateur.';
  if (/fetch|network/i.test(message)) return 'Connexion impossible. Vérifiez votre accès à internet puis réessayez.';
  return message;
}

/** Écran affiché après un clic sur le lien de réinitialisation reçu par email. */
export function NouveauMotDePasse() {
  const { terminerRecuperation } = useSession();
  const [motDePasse, setMotDePasse] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  const enregistrer = async (e: FormEvent) => {
    e.preventDefault();
    setErreur(null);
    if (motDePasse.length < 8) return setErreur('Le mot de passe doit contenir au moins 8 caractères.');
    if (motDePasse !== confirmation) return setErreur('Les deux mots de passe ne correspondent pas.');
    setChargement(true);
    const { error } = await supabase.auth.updateUser({ password: motDePasse });
    setChargement(false);
    if (error) {
      setErreur(
        /different from the old/i.test(error.message)
          ? "Le nouveau mot de passe doit être différent de l'ancien."
          : error.message,
      );
      return;
    }
    terminerRecuperation();
  };

  return (
    <CadreConnexion>
      <form className="connexion-formulaire" onSubmit={enregistrer}>
        <h1>Nouveau mot de passe</h1>
        <Champ libelle="Nouveau mot de passe">
          <input
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            required
          />
        </Champ>
        <Champ libelle="Confirmer le mot de passe">
          <input
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            required
          />
        </Champ>
        {erreur ? <Message ton="erreur">{erreur}</Message> : null}
        <button className="bouton" type="submit" disabled={chargement}>
          {chargement ? 'Enregistrement…' : 'Enregistrer le mot de passe'}
        </button>
      </form>
    </CadreConnexion>
  );
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
      <div className="connexion-cote">
        {children}
        <PiedDePage />
      </div>
    </div>
  );
}
