import { FormEvent, useState } from 'react';
import { Champ, Message } from '../components/ui';
import { supabase } from '../lib/supabase';

export function Connexion() {
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  const envoyer = async (e: FormEvent) => {
    e.preventDefault();
    setErreur(null);
    setChargement(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: motDePasse });
    setChargement(false);
    if (error) setErreur(/invalid/i.test(error.message) ? 'Email ou mot de passe incorrect.' : error.message);
  };

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
        {erreur ? <Message ton="erreur">{erreur}</Message> : null}
        <button className="bouton" type="submit" disabled={chargement}>
          {chargement ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
    </div>
  );
}
