import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Champ, Chargement, EnTetePage, Fenetre, Message } from '../components/ui';
import { useReferentiel } from '../context/Session';
import { genererMotDePasse } from '../lib/motDePasse';
import { appelerGestionComptes, messageErreur, supabase } from '../lib/supabase';
import type { Utilisateur } from '../lib/types';

type Fiche = {
  nom: string;
  prenom: string;
  email: string;
  phone: string;
  id_fonction: string;
  id_minoterie: string;
  mot_de_passe: string;
};

export function Utilisateurs() {
  const ref = useReferentiel();
  const [liste, setListe] = useState<Utilisateur[] | null>(null);
  const [message, setMessage] = useState<{ ton: 'erreur' | 'succes'; texte: string } | null>(null);
  const [creation, setCreation] = useState(false);
  const [edition, setEdition] = useState<Utilisateur | null>(null);
  const [motDePasse, setMotDePasse] = useState<Utilisateur | null>(null);
  const [recherche, setRecherche] = useState('');

  const charger = useCallback(async () => {
    const { data, error } = await supabase.from('tb_utilisateurs').select('*').order('nom');
    if (error) setMessage({ ton: 'erreur', texte: messageErreur(error) });
    setListe((data ?? []) as Utilisateur[]);
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  const nomFonction = (id: number | null) => ref.fonctions.find((f) => f.id_fonction === id)?.nom_fonction ?? '—';
  const nomMinoterie = (id: number) => ref.minoteries.find((m) => m.id_minoterie === id)?.nom_minoterie ?? '—';

  const basculerActif = async (u: Utilisateur) => {
    const action = u.actif ? 'désactiver' : 'réactiver';
    if (
      !window.confirm(
        u.actif
          ? `Désactiver ${u.prenom} ${u.nom} ? Il ne pourra plus se connecter ni saisir de relevé. Ses relevés existants sont conservés.`
          : `Réactiver ${u.prenom} ${u.nom} ?`,
      )
    )
      return;
    const { error } = await supabase.from('tb_utilisateurs').update({ actif: !u.actif }).eq('id_utilisateur', u.id_utilisateur);
    if (error) {
      setMessage({ ton: 'erreur', texte: messageErreur(error) });
      return;
    }
    try {
      await appelerGestionComptes({ action: 'bloquer', email: u.email, bloque: u.actif });
      setMessage({ ton: 'succes', texte: `${u.prenom} ${u.nom} : compte ${u.actif ? 'désactivé' : 'réactivé'}.` });
    } catch (e) {
      setMessage({
        ton: 'erreur',
        texte: `Fiche mise à jour, mais la connexion n'a pas pu être ${action === 'désactiver' ? 'bloquée' : 'débloquée'} : ${messageErreur(e)}`,
      });
    }
    charger();
  };

  const q = recherche.trim().toLowerCase();
  const filtres = (liste ?? []).filter(
    (u) => !q || `${u.prenom} ${u.nom} ${u.email}`.toLowerCase().includes(q),
  );

  return (
    <>
      <EnTetePage
        titre="Enquêteurs"
        description="Les personnes autorisées à saisir des relevés depuis l'application mobile."
        actions={
          <button className="bouton" onClick={() => setCreation(true)}>
            Ajouter un enquêteur
          </button>
        }
      />

      <div className="filtres">
        <label className="filtre filtre-large">
          <span>Rechercher</span>
          <input type="search" placeholder="Nom, prénom ou email" value={recherche} onChange={(e) => setRecherche(e.target.value)} />
        </label>
      </div>

      {message ? (
        <Message ton={message.ton} onFermer={() => setMessage(null)}>
          {message.texte}
        </Message>
      ) : null}

      <section className="panneau sans-marge">
        {!liste ? (
          <Chargement />
        ) : filtres.length === 0 ? (
          <p className="vide">
            {liste.length === 0 ? 'Aucun enquêteur. Ajoutez le premier pour démarrer la collecte.' : 'Aucun résultat.'}
          </p>
        ) : (
          <div className="tableau-defilant">
            <table className="tableau">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Email</th>
                  <th>Téléphone</th>
                  <th>Fonction</th>
                  <th>Minoterie</th>
                  <th>Statut</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {filtres.map((u) => (
                  <tr key={u.id_utilisateur} className={u.actif ? undefined : 'ligne-inactive'}>
                    <td className="fort">
                      {u.prenom} {u.nom}
                    </td>
                    <td>{u.email}</td>
                    <td>{u.phone ?? '—'}</td>
                    <td>{nomFonction(u.id_fonction)}</td>
                    <td>{nomMinoterie(u.id_minoterie)}</td>
                    <td>
                      <span className={`pastille ${u.actif ? 'pastille-ok' : 'pastille-off'}`}>{u.actif ? 'Actif' : 'Désactivé'}</span>
                    </td>
                    <td className="actions-ligne">
                      <button className="lien-discret" onClick={() => setEdition(u)}>
                        Modifier
                      </button>
                      <button className="lien-discret" onClick={() => setMotDePasse(u)}>
                        Mot de passe
                      </button>
                      <button className={`lien-discret ${u.actif ? 'danger' : ''}`} onClick={() => basculerActif(u)}>
                        {u.actif ? 'Désactiver' : 'Réactiver'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {creation || edition ? (
        <FormulaireUtilisateur
          utilisateur={edition}
          onFermer={() => {
            setCreation(false);
            setEdition(null);
          }}
          onEnregistre={(texte) => {
            setCreation(false);
            setEdition(null);
            setMessage({ ton: 'succes', texte });
            charger();
          }}
        />
      ) : null}

      {motDePasse ? (
        <FormulaireMotDePasse
          utilisateur={motDePasse}
          onFermer={() => setMotDePasse(null)}
          onEnregistre={(texte) => {
            setMotDePasse(null);
            setMessage({ ton: 'succes', texte });
          }}
        />
      ) : null}
    </>
  );
}

function FormulaireUtilisateur({
  utilisateur,
  onFermer,
  onEnregistre,
}: {
  utilisateur: Utilisateur | null;
  onFermer: () => void;
  onEnregistre: (message: string) => void;
}) {
  const ref = useReferentiel();
  const minoteriesAutorisees = ref.minoteries.filter((m) => m.autorisee_utilisateurs);
  const [fiche, setFiche] = useState<Fiche>(() => ({
    nom: utilisateur?.nom ?? '',
    prenom: utilisateur?.prenom ?? '',
    email: utilisateur?.email ?? '',
    phone: utilisateur?.phone ?? '+237',
    id_fonction: utilisateur?.id_fonction == null ? '' : String(utilisateur.id_fonction),
    id_minoterie: String(utilisateur?.id_minoterie ?? minoteriesAutorisees[0]?.id_minoterie ?? ''),
    mot_de_passe: genererMotDePasse(),
  }));
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const maj = (c: keyof Fiche) => (e: { target: { value: string } }) => setFiche((f) => ({ ...f, [c]: e.target.value }));

  const envoyer = async (e: FormEvent) => {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);
    const commun = {
      nom: fiche.nom.trim().toUpperCase(),
      prenom: fiche.prenom.trim(),
      phone: fiche.phone.trim() === '' || fiche.phone.trim() === '+237' ? null : fiche.phone.trim(),
      id_fonction: fiche.id_fonction === '' ? null : Number(fiche.id_fonction),
      id_minoterie: Number(fiche.id_minoterie),
    };
    try {
      if (utilisateur) {
        const { error } = await supabase.from('tb_utilisateurs').update(commun).eq('id_utilisateur', utilisateur.id_utilisateur);
        if (error) throw error;
        onEnregistre(`Fiche de ${commun.prenom} ${commun.nom} mise à jour.`);
      } else {
        await appelerGestionComptes({ action: 'creer', email: fiche.email.trim(), mot_de_passe: fiche.mot_de_passe, ...commun });
        onEnregistre(
          `${commun.prenom} ${commun.nom} peut se connecter à l'application mobile avec ${fiche.email.trim()} et le mot de passe ${fiche.mot_de_passe} (ou avec un code reçu par email). Transmettez-le-lui de façon sûre.`,
        );
      }
    } catch (err) {
      setErreur(messageErreur(err));
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <Fenetre titre={utilisateur ? 'Modifier un enquêteur' : 'Ajouter un enquêteur'} onFermer={onFermer}>
      <form onSubmit={envoyer} className="formulaire">
        <div className="grille-2">
          <Champ libelle="Prénom">
            <input value={fiche.prenom} onChange={maj('prenom')} required />
          </Champ>
          <Champ libelle="Nom">
            <input value={fiche.nom} onChange={maj('nom')} required />
          </Champ>
        </div>
        <Champ libelle="Email" aide={utilisateur ? "L'email sert d'identifiant et ne peut pas être modifié." : undefined}>
          <input type="email" value={fiche.email} onChange={maj('email')} required disabled={!!utilisateur} />
        </Champ>
        <div className="grille-2">
          <Champ libelle="Téléphone">
            <input type="tel" value={fiche.phone} onChange={maj('phone')} maxLength={20} />
          </Champ>
          <Champ libelle="Fonction">
            <select value={fiche.id_fonction} onChange={maj('id_fonction')}>
              <option value="">Non précisée</option>
              {ref.fonctions.map((f) => (
                <option key={f.id_fonction} value={f.id_fonction}>
                  {f.nom_fonction}
                </option>
              ))}
            </select>
          </Champ>
        </div>
        <Champ libelle="Minoterie" aide="Seules les minoteries autorisées dans la base sont proposées.">
          <select value={fiche.id_minoterie} onChange={maj('id_minoterie')} required>
            {minoteriesAutorisees.map((m) => (
              <option key={m.id_minoterie} value={m.id_minoterie}>
                {m.nom_minoterie}
              </option>
            ))}
          </select>
        </Champ>
        {!utilisateur ? (
          <Champ libelle="Mot de passe provisoire" aide="8 caractères minimum. Notez-le avant de valider.">
            <div className="ligne-champ">
              <input value={fiche.mot_de_passe} onChange={maj('mot_de_passe')} minLength={8} required />
              <button type="button" className="bouton bouton-contour petit" onClick={() => setFiche((f) => ({ ...f, mot_de_passe: genererMotDePasse() }))}>
                Générer
              </button>
            </div>
          </Champ>
        ) : null}
        {erreur ? <Message ton="erreur">{erreur}</Message> : null}
        <div className="fenetre-pied integre">
          <button type="button" className="bouton bouton-contour" onClick={onFermer}>
            Annuler
          </button>
          <button type="submit" className="bouton" disabled={envoi}>
            {envoi ? 'Enregistrement…' : utilisateur ? 'Enregistrer' : "Créer l'enquêteur"}
          </button>
        </div>
      </form>
    </Fenetre>
  );
}

function FormulaireMotDePasse({
  utilisateur,
  onFermer,
  onEnregistre,
}: {
  utilisateur: Utilisateur;
  onFermer: () => void;
  onEnregistre: (message: string) => void;
}) {
  const [mdp, setMdp] = useState(genererMotDePasse);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const envoyer = async (e: FormEvent) => {
    e.preventDefault();
    setEnvoi(true);
    setErreur(null);
    try {
      await appelerGestionComptes({ action: 'mot_de_passe', email: utilisateur.email, mot_de_passe: mdp });
      onEnregistre(`Nouveau mot de passe de ${utilisateur.prenom} ${utilisateur.nom} : ${mdp}`);
    } catch (err) {
      setErreur(messageErreur(err));
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <Fenetre titre={`Nouveau mot de passe pour ${utilisateur.prenom} ${utilisateur.nom}`} onFermer={onFermer}>
      <form onSubmit={envoyer} className="formulaire">
        <Champ libelle="Mot de passe" aide="L'ancien mot de passe cessera de fonctionner immédiatement.">
          <div className="ligne-champ">
            <input value={mdp} onChange={(e) => setMdp(e.target.value)} minLength={8} required />
            <button type="button" className="bouton bouton-contour petit" onClick={() => setMdp(genererMotDePasse())}>
              Générer
            </button>
          </div>
        </Champ>
        {erreur ? <Message ton="erreur">{erreur}</Message> : null}
        <div className="fenetre-pied integre">
          <button type="button" className="bouton bouton-contour" onClick={onFermer}>
            Annuler
          </button>
          <button type="submit" className="bouton" disabled={envoi}>
            {envoi ? 'Enregistrement…' : 'Définir le mot de passe'}
          </button>
        </div>
      </form>
    </Fenetre>
  );
}
