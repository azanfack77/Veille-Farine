import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Champ, Chargement, EnTetePage, Message } from '../components/ui';
import { useSession } from '../context/Session';
import { formatDate } from '../lib/format';
import { messageErreur, supabase } from '../lib/supabase';

type Admin = { id_administrateur: number; email: string; cree_le: string };

export function Administrateurs() {
  const { session } = useSession();
  const [liste, setListe] = useState<Admin[] | null>(null);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<{ ton: 'erreur' | 'succes'; texte: string } | null>(null);

  const charger = useCallback(async () => {
    const { data, error } = await supabase.from('tb_administrateurs').select('*').order('email');
    if (error) setMessage({ ton: 'erreur', texte: messageErreur(error) });
    setListe((data ?? []) as Admin[]);
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  const ajouter = async (e: FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('tb_administrateurs').insert({ email: email.trim().toLowerCase() });
    if (error) setMessage({ ton: 'erreur', texte: messageErreur(error) });
    else {
      setMessage({
        ton: 'succes',
        texte: `${email.trim()} est administrateur. S'il n'a pas encore de compte, créez-le dans Supabase (Authentication > Users).`,
      });
      setEmail('');
      charger();
    }
  };

  const retirer = async (a: Admin) => {
    if (!window.confirm(`Retirer les droits administrateur de ${a.email} ?`)) return;
    const { error } = await supabase.from('tb_administrateurs').delete().eq('id_administrateur', a.id_administrateur);
    if (error) setMessage({ ton: 'erreur', texte: messageErreur(error) });
    else charger();
  };

  const moi = session?.user.email?.toLowerCase();

  return (
    <>
      <EnTetePage
        titre="Administrateurs"
        description="Les personnes qui ont accès à cette console : relevés de tous les enquêteurs, comptes et listes."
      />
      {message ? (
        <Message ton={message.ton} onFermer={() => setMessage(null)}>
          {message.texte}
        </Message>
      ) : null}
      <section className="panneau">
        <form className="ligne-champ aligne-bas" onSubmit={ajouter}>
          <Champ libelle="Ajouter un administrateur">
            <input type="email" placeholder="email@entreprise.cm" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Champ>
          <button className="bouton" type="submit">
            Ajouter
          </button>
        </form>
      </section>
      <section className="panneau sans-marge">
        {!liste ? (
          <Chargement />
        ) : (
          <table className="tableau">
            <thead>
              <tr>
                <th>Email</th>
                <th>Depuis le</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {liste.map((a) => (
                <tr key={a.id_administrateur}>
                  <td className="fort">{a.email}</td>
                  <td>{formatDate(a.cree_le)}</td>
                  <td className="actions-ligne">
                    {a.email.toLowerCase() === moi ? (
                      <span className="discret">Vous</span>
                    ) : (
                      <button className="lien-discret danger" onClick={() => retirer(a)}>
                        Retirer
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
