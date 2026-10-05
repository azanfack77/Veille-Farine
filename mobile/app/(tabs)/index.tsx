import * as Crypto from 'expo-crypto';
import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CascadeNetRendu } from '../../src/components/CascadeNetRendu';
import { ChampDate } from '../../src/components/ChampDate';
import { ChampMontant } from '../../src/components/ChampMontant';
import { PastilleSynchro } from '../../src/components/PastilleSynchro';
import { SelecteurMarque } from '../../src/components/SelecteurMarque';
import { Bandeau, Bouton, ErreurChamp, GroupePuces, Libelle, Section } from '../../src/components/ui';
import { useAuth } from '../../src/context/AuthContext';
import { useReferentiel } from '../../src/context/ReferentielContext';
import { CLES_MONTANTS, CleMontant, DEDUCTIONS, Montants } from '../../src/lib/calcul';
import { ajouterALaFile, synchroniser } from '../../src/lib/fileAttente';
import { dateISO, parseMontant, saisieInvalide } from '../../src/lib/format';
import type { ElementFile, SaisieVeille } from '../../src/lib/types';
import { couleurs, polices } from '../../src/theme';

const MONTANTS_VIDES = Object.fromEntries(CLES_MONTANTS.map((c) => [c, ''])) as Record<CleMontant, string>;

// Ordre de passage d'un champ au suivant avec la touche "Suivant" du clavier
const ORDRE_CHAMPS = [...CLES_MONTANTS, 'prix_marche', 'volume'] as const;
type CleChamp = (typeof ORDRE_CHAMPS)[number];

export default function EcranReleve() {
  const { ref, chargement, erreur, recharger } = useReferentiel();
  const { utilisateur } = useAuth();

  const [date, setDate] = useState(new Date());
  const [idRegion, setIdRegion] = useState<number | null>(null);
  const [idVille, setIdVille] = useState<number | null>(null);
  const [idMarque, setIdMarque] = useState<number | null>(null);
  const [idGrammage, setIdGrammage] = useState<number | null>(null);
  const [textes, setTextes] = useState(MONTANTS_VIDES);
  const [prixMarche, setPrixMarche] = useState('');
  const [volume, setVolume] = useState('');
  const [verifier, setVerifier] = useState(false);
  const [enregistrement, setEnregistrement] = useState(false);
  const [confirmation, setConfirmation] = useState<{ ton: 'succes' | 'attente'; texte: string } | null>(null);

  const defilement = useRef<ScrollView>(null);
  const champs = useRef<Partial<Record<CleChamp, TextInput | null>>>({});
  const suivant = (cle: CleChamp) => () => {
    const i = ORDRE_CHAMPS.indexOf(cle);
    const prochain = ORDRE_CHAMPS[i + 1];
    if (prochain) champs.current[prochain]?.focus();
  };

  // ----- Données dérivées du référentiel ---------------------------------
  const derive = useMemo(() => {
    if (!ref) return null;
    const region = ref.regions.find((r) => r.id_region === idRegion) ?? null;
    const villes = ref.villes.filter((v) => v.id_region === idRegion);
    const marque = ref.marques.find((m) => m.id_marque === idMarque) ?? null;
    const idsGrammages = marque
      ? ref.gammeGrammages.filter((gg) => gg.id_gamme === marque.id_gamme).map((gg) => gg.id_grammage)
      : [];
    const grammages = ref.grammages.filter((g) => idsGrammages.includes(g.id_grammage));
    const grammage = ref.grammages.find((g) => g.id_grammage === idGrammage) ?? null;
    return { region, villes, marque, grammages, grammage };
  }, [ref, idRegion, idMarque, idGrammage]);

  const montants = useMemo(
    () => Object.fromEntries(CLES_MONTANTS.map((c) => [c, parseMontant(textes[c])])) as Montants,
    [textes],
  );
  const prixMarcheNombre = parseMontant(prixMarche);

  // ----- États intermédiaires ----------------------------------------------
  if (!ref || !derive || !utilisateur) {
    return (
      <SafeAreaView style={s.centre}>
        {chargement ? (
          <>
            <ActivityIndicator color={couleurs.primaire} size="large" />
            <Text style={s.texteCentre}>Chargement des listes…</Text>
          </>
        ) : (
          <>
            <Bandeau ton="erreur">{erreur ?? 'Listes indisponibles.'}</Bandeau>
            <Bouton titre="Réessayer" onPress={recharger} />
          </>
        )}
      </SafeAreaView>
    );
  }

  // ----- Contrôles ----------------------------------------------------------
  const erreurs = {
    region: idRegion == null ? 'Choisissez la région.' : null,
    marque: idMarque == null ? 'Choisissez la marque relevée.' : null,
    grammage: idGrammage == null ? 'Choisissez la taille du sac.' : null,
    nombres:
      CLES_MONTANTS.some((c) => saisieInvalide(textes[c])) || saisieInvalide(prixMarche) || saisieInvalide(volume)
        ? 'Corrigez les montants signalés en rouge.'
        : null,
    vide:
      montants.sortie_usine == null && prixMarcheNombre == null
        ? 'Saisissez au moins le prix sortie usine ou le prix marché.'
        : null,
  };
  const premiereErreur = Object.values(erreurs).find(Boolean) ?? null;

  // ----- Actions --------------------------------------------------------------
  const choisirRegion = (id: number) => {
    setIdRegion(id);
    const villes = ref.villes.filter((v) => v.id_region === id);
    setIdVille(villes.length === 1 ? villes[0].id_ville : null);
  };

  const choisirMarque = (id: number) => {
    setIdMarque(id);
    const marque = ref.marques.find((m) => m.id_marque === id);
    if (!marque) return;
    const autorises = ref.gammeGrammages.filter((gg) => gg.id_gamme === marque.id_gamme).map((gg) => gg.id_grammage);
    if (autorises.length === 1) setIdGrammage(autorises[0]);
    else if (idGrammage != null && !autorises.includes(idGrammage)) setIdGrammage(null);
  };

  const enregistrer = async () => {
    setVerifier(true);
    setConfirmation(null);
    if (premiereErreur || !derive.marque || !derive.region || !derive.grammage || idRegion == null) return;

    const saisie: SaisieVeille = {
      client_uuid: Crypto.randomUUID(),
      date_veille: dateISO(date),
      id_utilisateur: utilisateur.id_utilisateur,
      id_region: idRegion,
      id_ville: idVille,
      id_marque: derive.marque.id_marque,
      id_gamme: derive.marque.id_gamme,
      id_grammage: derive.grammage.id_grammage,
      ...montants,
      prix_marche_grossiste: prixMarcheNombre,
      volume: parseMontant(volume),
    };
    const element: ElementFile = {
      saisie,
      libelle: {
        marque: derive.marque.nom_marque,
        grammage_kg: derive.grammage.valeur_kg,
        region: derive.region.code_region,
        ville: ref.villes.find((v) => v.id_ville === idVille)?.nom_ville ?? null,
      },
      creeLe: new Date().toISOString(),
      statut: 'en_attente',
    };

    setEnregistrement(true);
    try {
      await ajouterALaFile(element);
      const nom = `${element.libelle.marque} ${element.libelle.grammage_kg} kg`;
      // Garde la date et le lieu : on relève souvent plusieurs marques au même endroit
      setIdMarque(null);
      setIdGrammage(null);
      setTextes(MONTANTS_VIDES);
      setPrixMarche('');
      setVolume('');
      setVerifier(false);
      defilement.current?.scrollTo({ y: 0, animated: true });

      const resultat = await synchroniser().catch(() => null);
      const envoye = resultat != null && resultat.envoyes > 0 && !resultat.horsLigne;
      setConfirmation(
        envoye
          ? { ton: 'succes', texte: `${nom} enregistré et envoyé. Date et lieu conservés pour la marque suivante.` }
          : {
              ton: 'attente',
              texte: `${nom} enregistré sur le téléphone. Il partira automatiquement dès que le réseau revient.`,
            },
      );
    } finally {
      setEnregistrement(false);
    }
  };

  // ----- Rendu -----------------------------------------------------------------
  return (
    <SafeAreaView style={s.page} edges={['top']}>
      <View style={s.entete}>
        <View style={{ flex: 1 }}>
          <Text style={s.titre}>Nouveau relevé</Text>
          <Text style={s.sousTitre}>
            {utilisateur.prenom} {utilisateur.nom}
          </Text>
        </View>
        <PastilleSynchro />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView ref={defilement} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 32 }}>
          {confirmation ? (
            <View style={s.zoneConfirmation}>
              <Bandeau ton={confirmation.ton} onFermer={() => setConfirmation(null)}>
                {confirmation.texte}
              </Bandeau>
            </View>
          ) : null}

          <Section titre="Où et quand">
            <Libelle>Date du relevé</Libelle>
            <ChampDate valeur={date} onChange={setDate} />

            <Libelle>Région</Libelle>
            <GroupePuces
              options={ref.regions.map((r) => ({ valeur: r.id_region, libelle: r.code_region }))}
              valeur={idRegion}
              onChange={choisirRegion}
              enErreur={verifier && !!erreurs.region}
            />
            {verifier ? <ErreurChamp texte={erreurs.region} /> : null}

            {derive.villes.length > 0 ? (
              <>
                <Libelle>Ville ou zone (facultatif)</Libelle>
                <GroupePuces
                  options={derive.villes.map((v) => ({ valeur: v.id_ville, libelle: v.nom_ville }))}
                  valeur={idVille}
                  onChange={(id) => setIdVille(id === idVille ? null : id)}
                />
              </>
            ) : null}
          </Section>

          <Section titre="Produit">
            <SelecteurMarque
              ref_={ref}
              idMarque={idMarque}
              idMinoterieUtilisateur={utilisateur.id_minoterie}
              onChange={choisirMarque}
              enErreur={verifier && !!erreurs.marque}
            />
            {verifier ? <ErreurChamp texte={erreurs.marque} /> : null}

            {derive.marque ? (
              <>
                <Libelle>Taille du sac</Libelle>
                <GroupePuces
                  options={derive.grammages.map((g) => ({ valeur: g.id_grammage, libelle: `${g.valeur_kg} kg` }))}
                  valeur={idGrammage}
                  onChange={setIdGrammage}
                  enErreur={verifier && !!erreurs.grammage}
                />
                {verifier ? <ErreurChamp texte={erreurs.grammage} /> : null}
              </>
            ) : null}
          </Section>

          <Section titre="Prix de la minoterie" aide="Montants par sac, en FCFA. Laissez vide ce qui ne s'applique pas.">
            <ChampMontant
              ref={(r) => {
                champs.current.sortie_usine = r;
              }}
              libelle="Prix sortie usine"
              valeur={textes.sortie_usine}
              onChange={(t) => setTextes((p) => ({ ...p, sortie_usine: t }))}
              onSubmitEditing={suivant('sortie_usine')}
              mis_en_avant
            />
            {DEDUCTIONS.map((d) => (
              <ChampMontant
                key={d.cle}
                ref={(r) => {
                  champs.current[d.cle] = r;
                }}
                libelle={d.libelle}
                valeur={textes[d.cle]}
                onChange={(t) => setTextes((p) => ({ ...p, [d.cle]: t }))}
                onSubmitEditing={suivant(d.cle)}
              />
            ))}
          </Section>

          <CascadeNetRendu
            montants={montants}
            prixMarche={prixMarcheNombre}
            kg={derive.grammage?.valeur_kg ?? null}
          />

          <Section titre="Marché">
            <ChampMontant
              ref={(r) => {
                champs.current.prix_marche = r;
              }}
              libelle="Prix marché grossiste"
              valeur={prixMarche}
              onChange={setPrixMarche}
              onSubmitEditing={suivant('prix_marche')}
            />
            <ChampMontant
              ref={(r) => {
                champs.current.volume = r;
              }}
              libelle="Volume"
              unite="sacs"
              valeur={volume}
              onChange={setVolume}
              returnKeyType="done"
            />
          </Section>

          <View style={s.zoneAction}>
            {verifier && premiereErreur ? <Bandeau ton="erreur">{premiereErreur}</Bandeau> : null}
            <Bouton
              titre="Enregistrer le relevé"
              icone="checkmark-circle-outline"
              onPress={enregistrer}
              chargement={enregistrement}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: couleurs.fond },
  centre: { flex: 1, justifyContent: 'center', alignItems: 'stretch', padding: 24, gap: 14, backgroundColor: couleurs.fond },
  texteCentre: { textAlign: 'center', fontFamily: polices.moyen, color: couleurs.encreDouce },
  entete: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: couleurs.trait,
    backgroundColor: couleurs.fond,
  },
  titre: { fontFamily: polices.chiffreGras, fontSize: 30, color: couleurs.encre },
  sousTitre: { fontFamily: polices.regulier, fontSize: 14, color: couleurs.encreDouce },
  zoneConfirmation: { paddingHorizontal: 20, paddingTop: 16 },
  zoneAction: { paddingHorizontal: 20, paddingTop: 28, gap: 12 },
});
