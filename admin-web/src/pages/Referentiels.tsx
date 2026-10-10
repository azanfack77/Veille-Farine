import { useState } from 'react';
import { EnTetePage, Message } from '../components/ui';
import { useReferentiel, useSession } from '../context/Session';
import { messageErreur, supabase } from '../lib/supabase';
import type { Referentiel } from '../lib/types';

type Colonne = {
  cle: string;
  titre: string;
  type: 'texte' | 'nombre' | 'booleen' | 'choix';
  options?: { v: number; l: string }[];
  majuscules?: boolean;
};

type Config = {
  onglet: string;
  table: string;
  pk: string;
  donnees: keyof Referentiel;
  colonnes: Colonne[];
  aide?: string;
};

type Ligne = Record<string, string | number | boolean | null>;

function configurations(ref: Referentiel): Config[] {
  const segments = ref.segments.map((s) => ({ v: s.id_segment, l: s.nom_segment }));
  const gammes = ref.gammes.map((g) => ({ v: g.id_gamme, l: g.nom_gamme }));
  const minoteries = ref.minoteries.map((m) => ({ v: m.id_minoterie, l: m.nom_minoterie }));
  const regions = ref.regions.map((r) => ({ v: r.id_region, l: r.code_region }));
  return [
    {
      onglet: 'Marques',
      table: 'tb_marques',
      pk: 'id_marque',
      donnees: 'marques',
      aide: "Une marque déjà relevée ne peut pas changer de gamme : ses relevés en dépendent.",
      colonnes: [
        { cle: 'nom_marque', titre: 'Marque', type: 'texte', majuscules: true },
        { cle: 'id_minoterie', titre: 'Minoterie', type: 'choix', options: minoteries },
        { cle: 'id_gamme', titre: 'Gamme', type: 'choix', options: gammes },
      ],
    },
    {
      onglet: 'Minoteries',
      table: 'tb_minoteries',
      pk: 'id_minoterie',
      donnees: 'minoteries',
      aide: 'Seules les minoteries « autorisées » peuvent avoir des enquêteurs rattachés.',
      colonnes: [
        { cle: 'nom_minoterie', titre: 'Minoterie', type: 'texte', majuscules: true },
        { cle: 'autorisee_utilisateurs', titre: 'Autorisée pour les enquêteurs', type: 'booleen' },
      ],
    },
    {
      onglet: 'Régions',
      table: 'tb_regions',
      pk: 'id_region',
      donnees: 'regions',
      colonnes: [{ cle: 'code_region', titre: 'Code région', type: 'texte', majuscules: true }],
    },
    {
      onglet: 'Villes',
      table: 'tb_villes',
      pk: 'id_ville',
      donnees: 'villes',
      colonnes: [
        { cle: 'nom_ville', titre: 'Ville ou zone', type: 'texte', majuscules: true },
        { cle: 'id_region', titre: 'Région', type: 'choix', options: regions },
      ],
    },
    {
      onglet: 'Gammes',
      table: 'tb_gammes',
      pk: 'id_gamme',
      donnees: 'gammes',
      colonnes: [
        { cle: 'nom_gamme', titre: 'Gamme', type: 'texte' },
        { cle: 'id_segment', titre: 'Segment', type: 'choix', options: segments },
      ],
    },
    {
      onglet: 'Segments',
      table: 'tb_segments',
      pk: 'id_segment',
      donnees: 'segments',
      colonnes: [{ cle: 'nom_segment', titre: 'Segment', type: 'texte' }],
    },
    {
      onglet: 'Tailles de sac',
      table: 'tb_grammages',
      pk: 'id_grammage',
      donnees: 'grammages',
      aide: 'Indiquez ensuite dans « Sacs par gamme » quelles gammes existent dans cette taille.',
      colonnes: [{ cle: 'valeur_kg', titre: 'Poids (kg)', type: 'nombre' }],
    },
    {
      onglet: 'Fonctions',
      table: 'tb_fonctions',
      pk: 'id_fonction',
      donnees: 'fonctions',
      aide: 'Exemples : CDR = Chef de Région, RM = Responsable de Marché, AB = Animateur Beignet.',
      colonnes: [
        { cle: 'code_fonction', titre: 'Code', type: 'texte', majuscules: true },
        { cle: 'nom_fonction', titre: 'Fonction', type: 'texte' },
      ],
    },
  ];
}

const ONGLET_MATRICE = 'Sacs par gamme';

export function Referentiels() {
  const ref = useReferentiel();
  const configs = configurations(ref);
  const [onglet, setOnglet] = useState(configs[0].onglet);
  const config = configs.find((c) => c.onglet === onglet);

  return (
    <>
      <EnTetePage
        titre="Listes de référence"
        description="Ces listes alimentent les choix proposés dans l'application mobile. Les téléphones les récupèrent à la prochaine mise à jour des listes."
      />
      <div className="onglets" role="tablist">
        {[...configs.map((c) => c.onglet), ONGLET_MATRICE].map((o) => (
          <button key={o} role="tab" aria-selected={o === onglet} className="onglet" onClick={() => setOnglet(o)}>
            {o}
          </button>
        ))}
      </div>
      {config ? <TableEditable key={config.table} config={config} /> : <MatriceGammes />}
    </>
  );
}

function TableEditable({ config }: { config: Config }) {
  const ref = useReferentiel();
  const { rechargerRef } = useSession();
  const lignes = ref[config.donnees] as unknown as Ligne[];
  const [edition, setEdition] = useState<{ id: number | null; valeurs: Ligne } | null>(null);
  const [message, setMessage] = useState<{ ton: 'erreur' | 'succes'; texte: string } | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const vide = (): Ligne =>
    Object.fromEntries(
      config.colonnes.map((c) => [c.cle, c.type === 'booleen' ? false : c.type === 'choix' ? c.options?.[0]?.v ?? null : '']),
    );

  const nettoyer = (v: Ligne): Ligne =>
    Object.fromEntries(
      config.colonnes.map((c) => {
        const x = v[c.cle];
        if (c.type === 'texte') {
          const t = String(x ?? '').trim();
          return [c.cle, c.majuscules ? t.toUpperCase() : t];
        }
        if (c.type === 'nombre' || c.type === 'choix') return [c.cle, x === '' || x == null ? null : Number(x)];
        return [c.cle, !!x];
      }),
    );

  const enregistrer = async () => {
    if (!edition) return;
    const valeurs = nettoyer(edition.valeurs);
    const manquant = config.colonnes.find((c) => c.type !== 'booleen' && (valeurs[c.cle] === '' || valeurs[c.cle] == null));
    if (manquant) {
      setMessage({ ton: 'erreur', texte: `Renseignez « ${manquant.titre} ».` });
      return;
    }
    setEnvoi(true);
    const { error } =
      edition.id == null
        ? await supabase.from(config.table).insert(valeurs)
        : await supabase.from(config.table).update(valeurs).eq(config.pk, edition.id);
    setEnvoi(false);
    if (error) {
      setMessage({ ton: 'erreur', texte: messageErreur(error) });
      return;
    }
    setEdition(null);
    setMessage({ ton: 'succes', texte: edition.id == null ? 'Élément ajouté.' : 'Modification enregistrée.' });
    await rechargerRef();
  };

  const supprimer = async (l: Ligne) => {
    const nom = String(l[config.colonnes[0].cle]);
    if (!window.confirm(`Supprimer « ${nom} » ?`)) return;
    const { error } = await supabase.from(config.table).delete().eq(config.pk, l[config.pk] as number);
    if (error) setMessage({ ton: 'erreur', texte: messageErreur(error) });
    else {
      setMessage({ ton: 'succes', texte: `« ${nom} » supprimé.` });
      await rechargerRef();
    }
  };

  const afficher = (c: Colonne, v: Ligne[string]) => {
    if (c.type === 'booleen') return v ? 'Oui' : 'Non';
    if (c.type === 'choix') return c.options?.find((o) => o.v === v)?.l ?? '—';
    return String(v ?? '');
  };

  const saisie = (c: Colonne) => {
    if (!edition) return null;
    const v = edition.valeurs[c.cle];
    const maj = (x: Ligne[string]) => setEdition({ ...edition, valeurs: { ...edition.valeurs, [c.cle]: x } });
    if (c.type === 'booleen')
      return <input type="checkbox" checked={!!v} onChange={(e) => maj(e.target.checked)} aria-label={c.titre} />;
    if (c.type === 'choix')
      return (
        <select value={v == null ? '' : String(v)} onChange={(e) => maj(Number(e.target.value))} aria-label={c.titre}>
          {c.options?.map((o) => (
            <option key={o.v} value={o.v}>
              {o.l}
            </option>
          ))}
        </select>
      );
    return (
      <input
        value={String(v ?? '')}
        inputMode={c.type === 'nombre' ? 'numeric' : undefined}
        onChange={(e) => maj(e.target.value)}
        aria-label={c.titre}
        autoFocus={c === config.colonnes[0]}
        onKeyDown={(e) => {
          if (e.key === 'Enter') enregistrer();
          if (e.key === 'Escape') setEdition(null);
        }}
      />
    );
  };

  const ligneEdition = (cle: string) => (
    <tr key={cle} className="ligne-edition">
      {config.colonnes.map((c) => (
        <td key={c.cle}>{saisie(c)}</td>
      ))}
      <td className="actions-ligne">
        <button className="bouton petit" onClick={enregistrer} disabled={envoi}>
          Enregistrer
        </button>
        <button className="lien-discret" onClick={() => setEdition(null)}>
          Annuler
        </button>
      </td>
    </tr>
  );

  return (
    <section className="panneau sans-marge">
      <div className="panneau-entete interne">
        <p className="description">{config.aide ?? `${lignes.length} élément(s).`}</p>
        <button className="bouton" onClick={() => setEdition({ id: null, valeurs: vide() })} disabled={edition?.id === null}>
          Ajouter
        </button>
      </div>
      {message ? (
        <div className="interne">
          <Message ton={message.ton} onFermer={() => setMessage(null)}>
            {message.texte}
          </Message>
        </div>
      ) : null}
      <div className="tableau-defilant">
        <table className="tableau">
          <thead>
            <tr>
              {config.colonnes.map((c) => (
                <th key={c.cle}>{c.titre}</th>
              ))}
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {edition?.id === null ? ligneEdition('nouveau') : null}
            {lignes.map((l) =>
              edition?.id === l[config.pk] ? (
                ligneEdition(String(l[config.pk]))
              ) : (
                <tr key={String(l[config.pk])}>
                  {config.colonnes.map((c, i) => (
                    <td key={c.cle} className={i === 0 ? 'fort' : undefined}>
                      {afficher(c, l[c.cle])}
                    </td>
                  ))}
                  <td className="actions-ligne">
                    <button
                      className="lien-discret"
                      onClick={() => setEdition({ id: l[config.pk] as number, valeurs: { ...l } })}
                    >
                      Modifier
                    </button>
                    <button className="lien-discret danger" onClick={() => supprimer(l)}>
                      Supprimer
                    </button>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function MatriceGammes() {
  const ref = useReferentiel();
  const { rechargerRef } = useSession();
  const [message, setMessage] = useState<string | null>(null);
  const [enCours, setEnCours] = useState<string | null>(null);

  const actif = (g: number, s: number) => ref.gammeGrammages.some((x) => x.id_gamme === g && x.id_grammage === s);

  const basculer = async (g: number, s: number) => {
    const cle = `${g}-${s}`;
    setEnCours(cle);
    setMessage(null);
    const { error } = actif(g, s)
      ? await supabase.from('tb_gamme_grammages').delete().eq('id_gamme', g).eq('id_grammage', s)
      : await supabase.from('tb_gamme_grammages').insert({ id_gamme: g, id_grammage: s });
    if (error)
      setMessage(
        error.code === '23503'
          ? 'Cette combinaison a déjà des relevés : elle ne peut pas être retirée.'
          : messageErreur(error),
      );
    await rechargerRef();
    setEnCours(null);
  };

  return (
    <section className="panneau">
      <p className="description">
        Cochez les tailles de sac vendues dans chaque gamme. L'application mobile ne propose que les combinaisons cochées.
      </p>
      {message ? <Message ton="erreur" onFermer={() => setMessage(null)}>{message}</Message> : null}
      <table className="tableau matrice">
        <thead>
          <tr>
            <th>Gamme</th>
            {ref.grammages.map((s) => (
              <th key={s.id_grammage} className="centre">
                {s.valeur_kg} kg
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ref.gammes.map((g) => (
            <tr key={g.id_gamme}>
              <td className="fort">
                {g.nom_gamme}{' '}
                <span className="discret">({ref.segments.find((s) => s.id_segment === g.id_segment)?.nom_segment})</span>
              </td>
              {ref.grammages.map((s) => (
                <td key={s.id_grammage} className="centre">
                  <input
                    type="checkbox"
                    checked={actif(g.id_gamme, s.id_grammage)}
                    disabled={enCours === `${g.id_gamme}-${s.id_grammage}`}
                    onChange={() => basculer(g.id_gamme, s.id_grammage)}
                    aria-label={`${g.nom_gamme} en ${s.valeur_kg} kg`}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
