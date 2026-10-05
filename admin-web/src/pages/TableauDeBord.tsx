import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Chargement, EnTetePage, Message } from '../components/ui';
import { useReferentiel } from '../context/Session';
import { moyenne } from '../lib/calcul';
import { debutSemaine, formatDate, formatNombre, ilYA } from '../lib/format';
import { messageErreur, supabase } from '../lib/supabase';
import type { Releve } from '../lib/types';

const PERIODES = [
  { jours: 7, libelle: '7 jours' },
  { jours: 30, libelle: '30 jours' },
  { jours: 90, libelle: '3 mois' },
  { jours: 365, libelle: '12 mois' },
];

const INDIGO = '#27348B';
const BLE = '#E8A917';
const PALETTE = ['#27348B', '#E8A917', '#2F8F83', '#B4466A', '#6B7A8F', '#7A5CC7', '#C0662B', '#3E8E41'];

export function TableauDeBord() {
  const ref = useReferentiel();
  const [jours, setJours] = useState(30);
  const [idGrammage, setIdGrammage] = useState<number>(
    () => ref.grammages.find((g) => g.valeur_kg === 50)?.id_grammage ?? ref.grammages[0]?.id_grammage,
  );
  const [idSegment, setIdSegment] = useState<number | ''>('');
  const [idRegion, setIdRegion] = useState<number | ''>('');
  const [idMinoterieRef, setIdMinoterieRef] = useState<number>(
    () => ref.minoteries.find((m) => m.autorisee_utilisateurs)?.id_minoterie ?? ref.minoteries[0]?.id_minoterie,
  );
  const [releves, setReleves] = useState<Releve[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    let annule = false;
    (async () => {
      setReleves(null);
      setErreur(null);
      try {
        const tous: Releve[] = [];
        for (let debut = 0; debut < 20000; debut += 1000) {
          let q = supabase
            .from('v_admin_releves')
            .select('*')
            .gte('date_veille', ilYA(jours))
            .order('date_veille')
            .range(debut, debut + 999);
          if (idRegion !== '') q = q.eq('id_region', idRegion);
          const { data, error } = await q;
          if (error) throw error;
          tous.push(...((data ?? []) as Releve[]));
          if (!data || data.length < 1000) break;
        }
        if (!annule) setReleves(tous);
      } catch (e) {
        if (!annule) setErreur(messageErreur(e));
      }
    })();
    return () => {
      annule = true;
    };
  }, [jours, idRegion]);

  // Les prix ne sont comparables qu'à grammage identique
  const comparables = useMemo(
    () =>
      (releves ?? []).filter(
        (r) => r.id_grammage === idGrammage && (idSegment === '' || r.id_segment === idSegment),
      ),
    [releves, idGrammage, idSegment],
  );

  const indicateurs = useMemo(() => {
    const r = releves ?? [];
    return {
      releves: r.length,
      enqueteurs: new Set(r.map((x) => x.id_utilisateur)).size,
      marques: new Set(r.map((x) => x.id_marque)).size,
      regions: new Set(r.map((x) => x.id_region)).size,
    };
  }, [releves]);

  const parMarque = useMemo(() => {
    const groupes = new Map<number, Releve[]>();
    comparables.forEach((r) => groupes.set(r.id_marque, [...(groupes.get(r.id_marque) ?? []), r]));
    return [...groupes.values()]
      .map((g) => ({
        marque: g[0].marque,
        minoterie: g[0].minoterie,
        id_minoterie: g[0].id_minoterie,
        gamme: g[0].gamme,
        nb: g.length,
        sortie: moyenne(g.map((x) => x.sortie_usine)),
        net: moyenne(g.map((x) => x.net_rendu_grossiste)),
        marche: moyenne(g.map((x) => x.prix_marche_grossiste)),
        dernier: g.reduce((m, x) => (x.date_veille > m ? x.date_veille : m), ''),
      }))
      .sort((a, b) => (b.net ?? -Infinity) - (a.net ?? -Infinity));
  }, [comparables]);

  const graphiqueMarques = parMarque.filter((m) => m.net != null).map((m) => ({ ...m, net: Math.round(m.net!) }));

  const evolution = useMemo(() => {
    const compte = new Map<string, number>();
    comparables.forEach((r) => compte.set(r.minoterie, (compte.get(r.minoterie) ?? 0) + 1));
    const nomRef = ref.minoteries.find((m) => m.id_minoterie === idMinoterieRef)?.nom_minoterie;
    const principales = [...compte.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([n]) => n)
      .filter((n) => n !== nomRef)
      .slice(0, 5);
    if (nomRef && compte.has(nomRef)) principales.unshift(nomRef);

    const semaines = new Map<string, Map<string, number[]>>();
    comparables.forEach((r) => {
      if (r.net_rendu_grossiste == null || !principales.includes(r.minoterie)) return;
      const s = debutSemaine(r.date_veille);
      if (!semaines.has(s)) semaines.set(s, new Map());
      const m = semaines.get(s)!;
      m.set(r.minoterie, [...(m.get(r.minoterie) ?? []), r.net_rendu_grossiste]);
    });
    const points = [...semaines.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([s, m]) => {
        const p: Record<string, string | number | null> = { semaine: formatDate(s) };
        principales.forEach((n) => {
          const v = moyenne(m.get(n) ?? []);
          p[n] = v == null ? null : Math.round(v);
        });
        return p;
      });
    return { series: principales, points, nomRef };
  }, [comparables, idMinoterieRef, ref.minoteries]);

  const parEnqueteur = useMemo(() => {
    const g = new Map<number, Releve[]>();
    (releves ?? []).forEach((r) => g.set(r.id_utilisateur, [...(g.get(r.id_utilisateur) ?? []), r]));
    return [...g.values()]
      .map((l) => ({
        nom: l[0].utilisateur,
        nb: l.length,
        dernier: l.reduce((m, x) => (x.date_veille > m ? x.date_veille : m), ''),
        regions: [...new Set(l.map((x) => x.region))].join(', '),
      }))
      .sort((a, b) => b.nb - a.nb);
  }, [releves]);

  const kg = ref.grammages.find((g) => g.id_grammage === idGrammage)?.valeur_kg;
  // Référence par gamme : on compare une marque à la marque de référence de la même gamme
  const netRefParGamme = new Map<string, number | null>();
  parMarque
    .filter((m) => m.id_minoterie === idMinoterieRef)
    .forEach((m) => netRefParGamme.set(m.gamme, moyenne([netRefParGamme.get(m.gamme), m.net])));

  return (
    <>
      <EnTetePage
        titre="Tableau de bord"
        description="Positionnement des prix des minoteries à partir des relevés terrain."
      />

      <div className="filtres">
        <label className="filtre">
          <span>Période</span>
          <select value={jours} onChange={(e) => setJours(Number(e.target.value))}>
            {PERIODES.map((p) => (
              <option key={p.jours} value={p.jours}>
                {p.libelle}
              </option>
            ))}
          </select>
        </label>
        <label className="filtre">
          <span>Région</span>
          <select value={idRegion} onChange={(e) => setIdRegion(e.target.value === '' ? '' : Number(e.target.value))}>
            <option value="">Toutes</option>
            {ref.regions.map((r) => (
              <option key={r.id_region} value={r.id_region}>
                {r.code_region}
              </option>
            ))}
          </select>
        </label>
        <label className="filtre">
          <span>Sac</span>
          <select value={idGrammage} onChange={(e) => setIdGrammage(Number(e.target.value))}>
            {ref.grammages.map((g) => (
              <option key={g.id_grammage} value={g.id_grammage}>
                {g.valeur_kg} kg
              </option>
            ))}
          </select>
        </label>
        <label className="filtre">
          <span>Segment</span>
          <select value={idSegment} onChange={(e) => setIdSegment(e.target.value === '' ? '' : Number(e.target.value))}>
            <option value="">Tous</option>
            {ref.segments.map((s) => (
              <option key={s.id_segment} value={s.id_segment}>
                {s.nom_segment}
              </option>
            ))}
          </select>
        </label>
        <label className="filtre">
          <span>Minoterie de référence</span>
          <select value={idMinoterieRef} onChange={(e) => setIdMinoterieRef(Number(e.target.value))}>
            {ref.minoteries.map((m) => (
              <option key={m.id_minoterie} value={m.id_minoterie}>
                {m.nom_minoterie}
              </option>
            ))}
          </select>
        </label>
      </div>

      {erreur ? <Message ton="erreur">{erreur}</Message> : null}
      {!releves && !erreur ? <Chargement texte="Calcul des indicateurs…" /> : null}

      {releves ? (
        <>
          <div className="indicateurs">
            <Indicateur valeur={indicateurs.releves} libelle="relevés sur la période" />
            <Indicateur valeur={indicateurs.enqueteurs} libelle="enquêteurs actifs" />
            <Indicateur valeur={`${indicateurs.marques}/${ref.marques.length}`} libelle="marques couvertes" />
            <Indicateur valeur={`${indicateurs.regions}/${ref.regions.length}`} libelle="régions couvertes" />
          </div>

          <section className="panneau panneau-vedette">
            <div className="panneau-entete">
              <div>
                <h2>Net rendu grossiste moyen par marque, sac de {kg} kg</h2>
                <p className="description">
                  En doré : les marques de {evolution.nomRef}. Classement de la plus chère à la moins chère pour le
                  grossiste.
                </p>
              </div>
            </div>
            {graphiqueMarques.length === 0 ? (
              <p className="vide">Aucun relevé de sac de {kg} kg sur cette sélection.</p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(220, graphiqueMarques.length * 34 + 40)}>
                <BarChart data={graphiqueMarques} layout="vertical" margin={{ left: 12, right: 48 }}>
                  <CartesianGrid horizontal={false} stroke="#E3E7EC" />
                  <XAxis type="number" domain={[(min: number) => Math.floor((min * 0.92) / 500) * 500, 'auto']} tickFormatter={(v) => formatNombre(v)} stroke="#5B6775" fontSize={12} />
                  <YAxis type="category" dataKey="marque" width={170} stroke="#17202B" fontSize={13} />
                  <Tooltip
                    formatter={(v: number) => [`${formatNombre(v)} FCFA`, 'Net rendu moyen']}
                    labelFormatter={(l, p) => `${l} (${p?.[0]?.payload?.minoterie ?? ''})`}
                  />
                  <Bar dataKey="net" radius={[0, 4, 4, 0]} label={{ position: 'right', fontSize: 12, formatter: (v: number) => formatNombre(v) }}>
                    {graphiqueMarques.map((m) => (
                      <Cell key={m.marque} fill={m.id_minoterie === idMinoterieRef ? BLE : INDIGO} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </section>

          <section className="panneau">
            <h2>Évolution hebdomadaire du net rendu moyen par minoterie</h2>
            {evolution.points.length < 2 ? (
              <p className="vide">Il faut au moins deux semaines de relevés pour afficher une évolution.</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={evolution.points} margin={{ right: 24 }}>
                  <CartesianGrid stroke="#E3E7EC" />
                  <XAxis dataKey="semaine" stroke="#5B6775" fontSize={12} />
                  <YAxis tickFormatter={(v) => formatNombre(v)} stroke="#5B6775" fontSize={12} width={70} domain={['auto', 'auto']} />
                  <Tooltip formatter={(v: number) => `${formatNombre(v)} FCFA`} />
                  <Legend />
                  {evolution.series.map((n, i) => (
                    <Line
                      key={n}
                      dataKey={n}
                      stroke={n === evolution.nomRef ? BLE : PALETTE.filter((c) => c !== BLE)[i % 7]}
                      strokeWidth={n === evolution.nomRef ? 3 : 2}
                      dot={false}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </section>

          <section className="panneau">
            <h2>Détail par marque, sac de {kg} kg</h2>
            <div className="tableau-defilant">
              <table className="tableau">
                <thead>
                  <tr>
                    <th>Marque</th>
                    <th>Minoterie</th>
                    <th>Gamme</th>
                    <th className="nombre">Relevés</th>
                    <th className="nombre">Sortie usine</th>
                    <th className="nombre">Net rendu</th>
                    <th className="nombre">Prix marché</th>
                    <th className="nombre" title="Net rendu de la marque moins celui de la minoterie de référence dans la même gamme">Écart / référence (même gamme)</th>
                    <th>Dernier relevé</th>
                  </tr>
                </thead>
                <tbody>
                  {parMarque.map((m) => (
                    <tr key={m.marque} className={m.id_minoterie === idMinoterieRef ? 'ligne-reference' : undefined}>
                      <td className="fort">{m.marque}</td>
                      <td>{m.minoterie}</td>
                      <td>{m.gamme}</td>
                      <td className="nombre">{m.nb}</td>
                      <td className="nombre">{formatNombre(m.sortie)}</td>
                      <td className="nombre fort">{formatNombre(m.net)}</td>
                      <td className="nombre">{formatNombre(m.marche)}</td>
                      <td className="nombre">{ecart(m.net, m.id_minoterie === idMinoterieRef ? null : netRefParGamme.get(m.gamme))}</td>
                      <td>{m.dernier ? formatDate(m.dernier) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panneau">
            <h2>Activité des enquêteurs</h2>
            {parEnqueteur.length === 0 ? (
              <p className="vide">Aucun relevé sur la période.</p>
            ) : (
              <table className="tableau">
                <thead>
                  <tr>
                    <th>Enquêteur</th>
                    <th className="nombre">Relevés</th>
                    <th>Dernier relevé</th>
                    <th>Régions</th>
                  </tr>
                </thead>
                <tbody>
                  {parEnqueteur.map((e) => (
                    <tr key={e.nom}>
                      <td className="fort">{e.nom}</td>
                      <td className="nombre">{e.nb}</td>
                      <td>{formatDate(e.dernier)}</td>
                      <td>{e.regions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      ) : null}
    </>
  );
}

function Indicateur({ valeur, libelle }: { valeur: number | string; libelle: string }) {
  return (
    <div className="indicateur">
      <span className="indicateur-valeur">{valeur}</span>
      <span className="indicateur-libelle">{libelle}</span>
    </div>
  );
}

function ecart(net: number | null, reference: number | null | undefined): string {
  if (net == null || reference == null) return '—';
  const d = net - reference;
  return `${d >= 0 ? '+' : ''}${formatNombre(d)}`;
}
