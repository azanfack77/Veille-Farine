import { useCallback, useEffect, useState } from 'react';
import { Champ, Chargement, EnTetePage, Fenetre, Message, Pagination } from '../components/ui';
import { useReferentiel } from '../context/Session';
import { calculerNetRendu, CLES_MONTANTS, CleMontant, DEDUCTIONS } from '../lib/calcul';
import { telechargerCsv } from '../lib/csv';
import { formatDate, formatNombre, ilYA, parseNombre } from '../lib/format';
import { messageErreur, supabase } from '../lib/supabase';
import type { Releve, Utilisateur } from '../lib/types';

const PAR_PAGE = 50;

type Filtres = {
  du: string;
  au: string;
  id_region: string;
  id_minoterie: string;
  id_marque: string;
  id_segment: string;
  id_grammage: string;
  id_utilisateur: string;
};

const FILTRES_INITIAUX: Filtres = {
  du: ilYA(30),
  au: '',
  id_region: '',
  id_minoterie: '',
  id_marque: '',
  id_segment: '',
  id_grammage: '',
  id_utilisateur: '',
};

// Construit la requête filtrée sur la vue v_admin_releves
function requete(f: Filtres, compter = false) {
  let q = supabase.from('v_admin_releves').select('*', compter ? { count: 'exact' } : undefined);
  if (f.du) q = q.gte('date_veille', f.du);
  if (f.au) q = q.lte('date_veille', f.au);
  (['id_region', 'id_minoterie', 'id_marque', 'id_segment', 'id_grammage', 'id_utilisateur'] as const).forEach((c) => {
    if (f[c] !== '') q = q.eq(c, Number(f[c]));
  });
  return q.order('date_veille', { ascending: false }).order('id_veille', { ascending: false });
}

export function Releves() {
  const ref = useReferentiel();
  const [filtres, setFiltres] = useState<Filtres>(FILTRES_INITIAUX);
  const [page, setPage] = useState(0);
  const [lignes, setLignes] = useState<Releve[] | null>(null);
  const [total, setTotal] = useState(0);
  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([]);
  const [message, setMessage] = useState<{ ton: 'erreur' | 'succes'; texte: string } | null>(null);
  const [enEdition, setEnEdition] = useState<Releve | null>(null);
  const [export_, setExport] = useState(false);

  useEffect(() => {
    supabase
      .from('tb_utilisateurs')
      .select('*')
      .order('nom')
      .then(({ data }) => setUtilisateurs((data ?? []) as Utilisateur[]));
  }, []);

  const charger = useCallback(async () => {
    setLignes(null);
    const { data, error, count } = await requete(filtres, true).range(page * PAR_PAGE, page * PAR_PAGE + PAR_PAGE - 1);
    if (error) {
      setMessage({ ton: 'erreur', texte: messageErreur(error) });
      setLignes([]);
      return;
    }
    setLignes((data ?? []) as Releve[]);
    setTotal(count ?? 0);
  }, [filtres, page]);

  useEffect(() => {
    charger();
  }, [charger]);

  const changer = (cle: keyof Filtres, valeur: string) => {
    setPage(0);
    setFiltres((f) => {
      const n = { ...f, [cle]: valeur };
      if (cle === 'id_minoterie') n.id_marque = ''; // la marque dépend de la minoterie
      return n;
    });
  };

  const marquesFiltrees = ref.marques.filter(
    (m) => filtres.id_minoterie === '' || m.id_minoterie === Number(filtres.id_minoterie),
  );

  const exporter = async () => {
    setExport(true);
    try {
      const tous: Releve[] = [];
      for (let debut = 0; ; debut += 1000) {
        const { data, error } = await requete(filtres).range(debut, debut + 999);
        if (error) throw error;
        tous.push(...((data ?? []) as Releve[]));
        if (!data || data.length < 1000) break;
      }
      telechargerCsv(`releves_veille_${new Date().toISOString().slice(0, 10)}.csv`, tous, [
        { titre: 'Date', valeur: (r) => r.date_veille },
        { titre: 'Enquêteur', valeur: (r) => r.utilisateur },
        { titre: 'Région', valeur: (r) => r.region },
        { titre: 'Ville', valeur: (r) => r.ville },
        { titre: 'Minoterie', valeur: (r) => r.minoterie },
        { titre: 'Marque', valeur: (r) => r.marque },
        { titre: 'Segment', valeur: (r) => r.segment },
        { titre: 'Gamme', valeur: (r) => r.gamme },
        { titre: 'Grammage (kg)', valeur: (r) => r.grammage_kg },
        { titre: 'Sortie usine', valeur: (r) => r.sortie_usine },
        ...DEDUCTIONS.map((d) => ({ titre: d.libelle, valeur: (r: Releve) => r[d.cle] })),
        { titre: 'Net rendu grossiste', valeur: (r) => r.net_rendu_grossiste },
        { titre: 'Prix marché grossiste', valeur: (r) => r.prix_marche_grossiste },
        { titre: 'Volume', valeur: (r) => r.volume },
      ]);
    } catch (e) {
      setMessage({ ton: 'erreur', texte: messageErreur(e) });
    } finally {
      setExport(false);
    }
  };

  const supprimer = async (r: Releve) => {
    if (!window.confirm(`Supprimer définitivement le relevé ${r.marque} ${r.grammage_kg} kg du ${formatDate(r.date_veille)} ?`))
      return;
    const { error } = await supabase.from('tb_veille_concurrentielle').delete().eq('id_veille', r.id_veille);
    if (error) setMessage({ ton: 'erreur', texte: messageErreur(error) });
    else {
      setMessage({ ton: 'succes', texte: 'Relevé supprimé.' });
      charger();
    }
  };

  const select = (cle: keyof Filtres, libelle: string, options: { v: number; l: string }[], tous = 'Toutes') => (
    <label className="filtre">
      <span>{libelle}</span>
      <select value={filtres[cle]} onChange={(e) => changer(cle, e.target.value)}>
        <option value="">{tous}</option>
        {options.map((o) => (
          <option key={o.v} value={o.v}>
            {o.l}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <>
      <EnTetePage
        titre="Relevés"
        description="Tous les relevés saisis sur le terrain. Corrigez une erreur de saisie ou exportez la sélection vers Excel."
        actions={
          <button className="bouton" onClick={exporter} disabled={export_ || total === 0}>
            {export_ ? 'Préparation…' : `Exporter ${total} relevé(s) en CSV`}
          </button>
        }
      />

      <div className="filtres">
        <label className="filtre">
          <span>Du</span>
          <input type="date" value={filtres.du} onChange={(e) => changer('du', e.target.value)} />
        </label>
        <label className="filtre">
          <span>Au</span>
          <input type="date" value={filtres.au} onChange={(e) => changer('au', e.target.value)} />
        </label>
        {select('id_region', 'Région', ref.regions.map((r) => ({ v: r.id_region, l: r.code_region })))}
        {select('id_minoterie', 'Minoterie', ref.minoteries.map((m) => ({ v: m.id_minoterie, l: m.nom_minoterie })))}
        {select('id_marque', 'Marque', marquesFiltrees.map((m) => ({ v: m.id_marque, l: m.nom_marque })))}
        {select('id_segment', 'Segment', ref.segments.map((s) => ({ v: s.id_segment, l: s.nom_segment })), 'Tous')}
        {select('id_grammage', 'Sac', ref.grammages.map((g) => ({ v: g.id_grammage, l: `${g.valeur_kg} kg` })), 'Tous')}
        {select(
          'id_utilisateur',
          'Enquêteur',
          utilisateurs.map((u) => ({ v: u.id_utilisateur, l: `${u.prenom} ${u.nom}` })),
          'Tous',
        )}
        <button className="lien-discret" onClick={() => { setPage(0); setFiltres(FILTRES_INITIAUX); }}>
          Réinitialiser
        </button>
      </div>

      {message ? (
        <Message ton={message.ton} onFermer={() => setMessage(null)}>
          {message.texte}
        </Message>
      ) : null}

      <section className="panneau sans-marge">
        {!lignes ? (
          <Chargement />
        ) : lignes.length === 0 ? (
          <p className="vide">Aucun relevé ne correspond à ces filtres. Élargissez la période ou retirez un filtre.</p>
        ) : (
          <div className="tableau-defilant">
            <table className="tableau">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Marque</th>
                  <th>Minoterie</th>
                  <th className="nombre">Sac</th>
                  <th>Lieu</th>
                  <th>Enquêteur</th>
                  <th className="nombre">Sortie usine</th>
                  <th className="nombre">Net rendu</th>
                  <th className="nombre">Prix marché</th>
                  <th className="nombre">Volume</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {lignes.map((r) => (
                  <tr key={r.id_veille}>
                    <td>{formatDate(r.date_veille)}</td>
                    <td className="fort">{r.marque}</td>
                    <td>{r.minoterie}</td>
                    <td className="nombre">{r.grammage_kg} kg</td>
                    <td>{r.ville ? `${r.ville} (${r.region})` : r.region}</td>
                    <td>{r.utilisateur}</td>
                    <td className="nombre">{formatNombre(r.sortie_usine)}</td>
                    <td className="nombre fort">{formatNombre(r.net_rendu_grossiste)}</td>
                    <td className="nombre">{formatNombre(r.prix_marche_grossiste)}</td>
                    <td className="nombre">{formatNombre(r.volume)}</td>
                    <td className="actions-ligne">
                      <button className="lien-discret" onClick={() => setEnEdition(r)}>
                        Corriger
                      </button>
                      <button className="lien-discret danger" onClick={() => supprimer(r)}>
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} total={total} parPage={PAR_PAGE} onPage={setPage} />
      </section>

      {enEdition ? (
        <EditionReleve
          releve={enEdition}
          onFermer={() => setEnEdition(null)}
          onEnregistre={() => {
            setEnEdition(null);
            setMessage({ ton: 'succes', texte: 'Relevé corrigé.' });
            charger();
          }}
        />
      ) : null}
    </>
  );
}

const LIBELLES: Record<CleMontant, string> = {
  sortie_usine: 'Prix sortie usine',
  ...(Object.fromEntries(DEDUCTIONS.map((d) => [d.cle, d.libelle])) as Record<(typeof DEDUCTIONS)[number]['cle'], string>),
  prix_marche_grossiste: 'Prix marché grossiste',
  volume: 'Volume',
};

function EditionReleve({
  releve,
  onFermer,
  onEnregistre,
}: {
  releve: Releve;
  onFermer: () => void;
  onEnregistre: () => void;
}) {
  const ref = useReferentiel();
  const [date, setDate] = useState(releve.date_veille);
  const [idVille, setIdVille] = useState<string>(releve.id_ville == null ? '' : String(releve.id_ville));
  const [textes, setTextes] = useState<Record<CleMontant, string>>(
    () => Object.fromEntries(CLES_MONTANTS.map((c) => [c, releve[c] == null ? '' : String(releve[c])])) as Record<CleMontant, string>,
  );
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const valeurs = Object.fromEntries(CLES_MONTANTS.map((c) => [c, parseNombre(textes[c])])) as Record<CleMontant, number | null>;
  const invalides = CLES_MONTANTS.filter((c) => textes[c].trim() !== '' && valeurs[c] == null);
  const villes = ref.villes.filter((v) => v.id_region === releve.id_region);

  const enregistrer = async () => {
    if (invalides.length) {
      setErreur(`Montant invalide : ${invalides.map((c) => LIBELLES[c]).join(', ')}.`);
      return;
    }
    setEnvoi(true);
    const { error } = await supabase
      .from('tb_veille_concurrentielle')
      .update({ date_veille: date, id_ville: idVille === '' ? null : Number(idVille), ...valeurs })
      .eq('id_veille', releve.id_veille);
    setEnvoi(false);
    if (error) setErreur(messageErreur(error));
    else onEnregistre();
  };

  return (
    <Fenetre
      titre={`Corriger : ${releve.marque} ${releve.grammage_kg} kg`}
      onFermer={onFermer}
      large
      pied={
        <>
          <button className="bouton bouton-contour" onClick={onFermer}>
            Annuler
          </button>
          <button className="bouton" onClick={enregistrer} disabled={envoi}>
            {envoi ? 'Enregistrement…' : 'Enregistrer la correction'}
          </button>
        </>
      }
    >
      <p className="description">
        Saisi par {releve.utilisateur}, région {releve.region}. Pour changer de marque ou de sac, supprimez le relevé
        et demandez une nouvelle saisie.
      </p>
      <div className="grille-2">
        <Champ libelle="Date du relevé">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </Champ>
        <Champ libelle="Ville">
          <select value={idVille} onChange={(e) => setIdVille(e.target.value)} disabled={villes.length === 0}>
            <option value="">{villes.length ? 'Non précisée' : 'Aucune ville dans cette région'}</option>
            {villes.map((v) => (
              <option key={v.id_ville} value={v.id_ville}>
                {v.nom_ville}
              </option>
            ))}
          </select>
        </Champ>
        {CLES_MONTANTS.map((c) => (
          <Champ key={c} libelle={LIBELLES[c]}>
            <input
              inputMode="decimal"
              className={`saisie-nombre ${textes[c].trim() !== '' && valeurs[c] == null ? 'invalide' : ''}`}
              value={textes[c]}
              onChange={(e) => setTextes((t) => ({ ...t, [c]: e.target.value }))}
            />
          </Champ>
        ))}
      </div>
      <p className="apercu-net">
        Net rendu recalculé : <strong>{formatNombre(calculerNetRendu(valeurs))} FCFA</strong>
      </p>
      {erreur ? <Message ton="erreur">{erreur}</Message> : null}
    </Fenetre>
  );
}
