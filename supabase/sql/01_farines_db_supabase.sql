-- =====================================================================
-- Script Supabase (PostgreSQL) : chargement des données du fichier Data.xlsx
-- À exécuter dans l'éditeur SQL de Supabase (SQL Editor > New query)
-- Les tables sont créées dans le schéma public.
-- =====================================================================

BEGIN;

-- Suppression des tables existantes (CASCADE supprime aussi les clés étrangères liées)
DROP VIEW IF EXISTS v_veille_concurrentielle;
DROP TABLE IF EXISTS tb_veille_concurrentielle CASCADE;
DROP TABLE IF EXISTS tb_utilisateurs CASCADE;
DROP TABLE IF EXISTS tb_fonctions CASCADE;
DROP TABLE IF EXISTS tb_gamme_grammages CASCADE;
DROP TABLE IF EXISTS tb_marques CASCADE;
DROP TABLE IF EXISTS tb_villes CASCADE;
DROP TABLE IF EXISTS tb_regions CASCADE;
DROP TABLE IF EXISTS tb_grammages CASCADE;
DROP TABLE IF EXISTS tb_gammes CASCADE;
DROP TABLE IF EXISTS tb_segments CASCADE;
DROP TABLE IF EXISTS tb_minoteries CASCADE;

-- =====================================================================
-- 1. TABLES DE DIMENSION (feuille "Dimension", une colonne = une table)
-- =====================================================================

CREATE TABLE tb_regions (
  id_region   INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code_region VARCHAR(20) NOT NULL UNIQUE
);

CREATE TABLE tb_grammages (
  id_grammage   INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  valeur_kg     INT NOT NULL UNIQUE
);

CREATE TABLE tb_segments (
  id_segment  INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nom_segment VARCHAR(50) NOT NULL UNIQUE
);

-- Chaque gamme appartient à un segment (mapping gammes -> segments)
CREATE TABLE tb_gammes (
  id_gamme   INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nom_gamme  VARCHAR(50) NOT NULL UNIQUE,
  id_segment INT NOT NULL,
  CONSTRAINT fk_gammes_segment FOREIGN KEY (id_segment) REFERENCES tb_segments(id_segment)
);

CREATE TABLE tb_minoteries (
  id_minoterie  INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nom_minoterie VARCHAR(100) NOT NULL UNIQUE,
  -- Indique si la minoterie peut être associée à des utilisateurs
  autorisee_utilisateurs BOOLEAN NOT NULL DEFAULT FALSE,
  -- Clé unique composite nécessaire à la clé étrangère depuis tb_utilisateurs
  CONSTRAINT uq_minoteries_autorisee UNIQUE (id_minoterie, autorisee_utilisateurs)
);

INSERT INTO tb_regions (code_region) VALUES
  ('LSO'),
  ('CS'),
  ('ONO'),
  ('GNO1'),
  ('GNO2'),
  ('TCHAD'),
  ('RCA'),
  ('GUINEE');

INSERT INTO tb_grammages (valeur_kg) VALUES
  (5),
  (25),
  (50);

INSERT INTO tb_segments (nom_segment) VALUES
  ('Beignets'),
  ('Boulangeres');

-- Mapping gammes -> segments :
--    Beignets                                  -> segment Beignets
--    Standard, Moyen de Gamme, Haut de Gamme   -> segment Boulangeres
CREATE TEMP TABLE tmp_gammes (
  nom_gamme   VARCHAR(50),
  nom_segment VARCHAR(50)
);
INSERT INTO tmp_gammes (nom_gamme, nom_segment) VALUES
  ('Beignets', 'Beignets'),
  ('Standard', 'Boulangeres'),
  ('Moyen de Gamme', 'Boulangeres'),
  ('Haut de Gamme', 'Boulangeres');

INSERT INTO tb_gammes (nom_gamme, id_segment)
SELECT t.nom_gamme, s.id_segment
FROM tmp_gammes t
JOIN tb_segments s ON UPPER(TRIM(s.nom_segment)) = UPPER(TRIM(t.nom_segment));

-- Contrôle (dans Supabase, sélectionnez la requête seule pour voir son résultat) : gammes sans segment (doit renvoyer 0 ligne)
SELECT t.* FROM tmp_gammes t
LEFT JOIN tb_segments s ON UPPER(TRIM(s.nom_segment)) = UPPER(TRIM(t.nom_segment))
WHERE s.id_segment IS NULL;

DROP TABLE tmp_gammes;

INSERT INTO tb_minoteries (nom_minoterie) VALUES
  ('AFISA'),
  ('AFRICA FOODS'),
  ('CADYST GRAIN'),
  ('COQ ROUGE'),
  ('MIMOSA'),
  ('OLAM'),
  ('SCC'),
  ('SCTB'),
  ('SGMC'),
  ('SITRABCAM'),
  ('WFI (SANTA LUCIA)');

-- Seules ces minoteries peuvent être associées à des utilisateurs
UPDATE tb_minoteries
SET autorisee_utilisateurs = TRUE
WHERE UPPER(nom_minoterie) IN ('CADYST GRAIN', 'SGMC');


-- =====================================================================
-- 1 bis. TABLE D'ASSOCIATION GAMMES <-> GRAMMAGES
--    Beignets       : 5, 25, 50 kg
--    Standard       : 25, 50 kg
--    Moyen de Gamme : 50 kg
--    Haut de Gamme  : 50 kg
-- =====================================================================

CREATE TABLE tb_gamme_grammages (
  id_gamme    INT NOT NULL,
  id_grammage INT NOT NULL,
  PRIMARY KEY (id_gamme, id_grammage),
  CONSTRAINT fk_gg_gamme    FOREIGN KEY (id_gamme)    REFERENCES tb_gammes(id_gamme),
  CONSTRAINT fk_gg_grammage FOREIGN KEY (id_grammage) REFERENCES tb_grammages(id_grammage)
);

CREATE TEMP TABLE tmp_gamme_grammages (
  nom_gamme VARCHAR(50),
  valeur_kg INT
);
INSERT INTO tmp_gamme_grammages (nom_gamme, valeur_kg) VALUES
  ('Beignets', 5),
  ('Beignets', 25),
  ('Beignets', 50),
  ('Standard', 25),
  ('Standard', 50),
  ('Moyen de Gamme', 50),
  ('Haut de Gamme', 50);

INSERT INTO tb_gamme_grammages (id_gamme, id_grammage)
SELECT g.id_gamme, gr.id_grammage
FROM tmp_gamme_grammages t
JOIN tb_gammes    g  ON UPPER(TRIM(g.nom_gamme)) = UPPER(TRIM(t.nom_gamme))
JOIN tb_grammages gr ON gr.valeur_kg = t.valeur_kg;

-- Contrôle : associations non rattachées (doit renvoyer 0 ligne)
SELECT t.* FROM tmp_gamme_grammages t
LEFT JOIN tb_gammes    g  ON UPPER(TRIM(g.nom_gamme)) = UPPER(TRIM(t.nom_gamme))
LEFT JOIN tb_grammages gr ON gr.valeur_kg = t.valeur_kg
WHERE g.id_gamme IS NULL OR gr.id_grammage IS NULL;

DROP TABLE tmp_gamme_grammages;

-- =====================================================================
-- 2. TABLE VILLES (feuille "Region")
--    Mapping : colonne Regions -> tb_regions.code_region
-- =====================================================================

CREATE TABLE tb_villes (
  id_ville  INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nom_ville VARCHAR(100) NOT NULL UNIQUE,
  id_region INT NOT NULL,
  CONSTRAINT uq_villes_region UNIQUE (id_ville, id_region),
  CONSTRAINT fk_villes_region FOREIGN KEY (id_region) REFERENCES tb_regions(id_region)
);

-- Table temporaire avec les données brutes de la feuille
CREATE TEMP TABLE tmp_villes (
  nom_ville   VARCHAR(100),
  code_region VARCHAR(20)
);

INSERT INTO tmp_villes (nom_ville, code_region) VALUES
  ('DOUALA', 'LSO'),
  ('MOUNGO', 'LSO'),
  ('SUD-OUEST', 'LSO'),
  ('KRIBI', 'LSO'),
  ('CENTRE', 'CS'),
  ('SUD', 'CS'),
  ('BAFOUSSAM', 'ONO'),
  ('DSCHANG', 'ONO'),
  ('BAMENDA', 'ONO'),
  ('MAROUA', 'GNO1'),
  ('GAROUA', 'GNO1'),
  ('EST', 'GNO2'),
  ('ADAMAOUA', 'GNO2');

-- Insertion avec récupération de l'identifiant de la région
INSERT INTO tb_villes (nom_ville, id_region)
SELECT t.nom_ville, r.id_region
FROM tmp_villes t
JOIN tb_regions r ON UPPER(TRIM(r.code_region)) = UPPER(TRIM(t.code_region));

-- Contrôle : villes dont la région est introuvable (doit renvoyer 0 ligne)
SELECT t.* FROM tmp_villes t
LEFT JOIN tb_regions r ON UPPER(TRIM(r.code_region)) = UPPER(TRIM(t.code_region))
WHERE r.id_region IS NULL;

DROP TABLE tmp_villes;

-- =====================================================================
-- 3. TABLE MARQUES (feuille "Data")
--    Mapping : colonne Minoteries -> tb_minoteries.nom_minoterie
--              colonne Gammes     -> tb_gammes.nom_gamme
-- =====================================================================

CREATE TABLE tb_marques (
  id_marque    INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nom_marque   VARCHAR(100) NOT NULL UNIQUE,
  id_gamme     INT NOT NULL,
  id_minoterie INT NOT NULL,
  CONSTRAINT fk_marques_gamme     FOREIGN KEY (id_gamme)     REFERENCES tb_gammes(id_gamme),
  CONSTRAINT fk_marques_minoterie FOREIGN KEY (id_minoterie) REFERENCES tb_minoteries(id_minoterie),
  -- Nécessaire au contrôle marque/gamme de la veille concurrentielle
  CONSTRAINT uq_marques_gamme UNIQUE (id_marque, id_gamme)
);

CREATE TEMP TABLE tmp_marques (
  nom_marque    VARCHAR(100),
  nom_gamme     VARCHAR(50),
  nom_minoterie VARCHAR(100)
);

INSERT INTO tmp_marques (nom_marque, nom_gamme, nom_minoterie) VALUES
  ('MAMA MAKALA', 'Beignets', 'AFISA'),
  ('CHOIX DU BOULANGER', 'Standard', 'AFISA'),
  ('AFRICANA', 'Moyen de Gamme', 'AFISA'),
  ('PRIMO', 'Haut de Gamme', 'AFISA'),
  ('BROLI', 'Beignets', 'AFRICA FOODS'),
  ('AMIGO', 'Beignets', 'Cadyst Grain'),
  ('CAMEROUNAISE', 'Standard', 'Cadyst Grain'),
  ('COLOMBE', 'Moyen de Gamme', 'Cadyst Grain'),
  ('PELICAN', 'Haut de Gamme', 'Cadyst Grain'),
  ('LABEL VERT', 'Standard', 'COQ ROUGE'),
  ('TESSA MAKALA', 'Beignets', 'MIMOSA'),
  ('TESSA GALIMOISE', 'Standard', 'MIMOSA'),
  ('TESSA PREMIUM', 'Moyen de Gamme', 'MIMOSA'),
  ('BIJOU MAMMY', 'Beignets', 'OLAM'),
  ('BIJOU STAND', 'Standard', 'OLAM'),
  ('BIJOU GROS PAIN', 'Moyen de Gamme', 'OLAM'),
  ('BIJOU AGEGE', 'Haut de Gamme', 'OLAM'),
  ('MAKALA SUPER BEIGNETS', 'Beignets', 'SCC'),
  ('PAIN DORE', 'Standard', 'SCC'),
  ('K BREAD', 'Moyen de Gamme', 'SCC'),
  ('SEMEUSE', 'Standard', 'SCTB'),
  ('TAUREAU', 'Standard', 'SCTB'),
  ('ASTRE', 'Haut de Gamme', 'SCTB'),
  ('ASSO', 'Beignets', 'SGMC'),
  ('DUO', 'Standard', 'SGMC'),
  ('TIGRE', 'Moyen de Gamme', 'SGMC'),
  ('BOULANGERE', 'Haut de Gamme', 'SGMC'),
  ('ADORA', 'Beignets', 'SITRABCAM'),
  ('RENARD', 'Standard', 'SITRABCAM'),
  ('ELEPHANT', 'Moyen de Gamme', 'SITRABCAM'),
  ('LION', 'Haut de Gamme', 'SITRABCAM'),
  ('MAMILOU', 'Beignets', 'WFI (SANTA LUCIA)'),
  ('CASTOR', 'Standard', 'WFI (SANTA LUCIA)'),
  ('LA BALEINE', 'Standard', 'WFI (SANTA LUCIA)'),
  ('PHOENIX', 'Moyen de Gamme', 'WFI (SANTA LUCIA)'),
  ('ASSIA', 'Haut de Gamme', 'WFI (SANTA LUCIA)');

-- UPPER() règle l'écart de casse "Cadyst Grain" (Data) / "CADYST GRAIN" (Dimension)
INSERT INTO tb_marques (nom_marque, id_gamme, id_minoterie)
SELECT t.nom_marque, g.id_gamme, m.id_minoterie
FROM tmp_marques t
JOIN tb_minoteries m ON UPPER(TRIM(m.nom_minoterie)) = UPPER(TRIM(t.nom_minoterie))
JOIN tb_gammes     g ON UPPER(TRIM(g.nom_gamme))     = UPPER(TRIM(t.nom_gamme));

-- Contrôle : marques non rattachées (doit renvoyer 0 ligne)
SELECT t.* FROM tmp_marques t
LEFT JOIN tb_minoteries m ON UPPER(TRIM(m.nom_minoterie)) = UPPER(TRIM(t.nom_minoterie))
LEFT JOIN tb_gammes     g ON UPPER(TRIM(g.nom_gamme))     = UPPER(TRIM(t.nom_gamme))
WHERE m.id_minoterie IS NULL OR g.id_gamme IS NULL;

DROP TABLE tmp_marques;

-- =====================================================================
-- 3 ter. TABLE FONCTIONS
-- =====================================================================

CREATE TABLE tb_fonctions (
  id_fonction  INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nom_fonction VARCHAR(100) NOT NULL UNIQUE
);

-- =====================================================================
-- 3 quater. TABLE UTILISATEURS
--    Chaque utilisateur est rattaché à une minoterie : CADYST GRAIN ou SGMC uniquement
-- =====================================================================

CREATE TABLE tb_utilisateurs (
  id_utilisateur INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nom            VARCHAR(100) NOT NULL,
  prenom         VARCHAR(100) NOT NULL,
  id_fonction    INT,           -- facultatif, lien vers tb_fonctions
  email          VARCHAR(150) NOT NULL UNIQUE,
  phone          VARCHAR(20),   -- texte pour garder le +237 et les zéros de tête
  id_minoterie   INT NOT NULL,
  -- Toujours TRUE : combiné à la clé étrangère, n'autorise que CADYST GRAIN et SGMC
  autorisee_utilisateurs BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT chk_utilisateurs_email CHECK (email LIKE '%_@_%._%'),
  CONSTRAINT chk_utilisateurs_minoterie CHECK (autorisee_utilisateurs = TRUE),
  CONSTRAINT fk_utilisateurs_fonction FOREIGN KEY (id_fonction)
    REFERENCES tb_fonctions (id_fonction),
  CONSTRAINT fk_utilisateurs_minoterie FOREIGN KEY (id_minoterie, autorisee_utilisateurs)
    REFERENCES tb_minoteries (id_minoterie, autorisee_utilisateurs)
);


-- =====================================================================
-- 3 quinquies. TABLE VEILLE CONCURRENTIELLE (table de faits)
--    Liens : tb_utilisateurs, tb_regions, tb_villes, tb_marques, tb_gamme_grammages
--    La minoterie et le segment ne sont pas stockés : ils se déduisent
--    de la marque (marque -> minoterie, marque -> gamme -> segment).
--    Utilisez la vue v_veille_concurrentielle pour les voir.
-- =====================================================================

CREATE TABLE tb_veille_concurrentielle (
  id_veille                INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  date_veille              DATE NOT NULL,
  id_utilisateur           INT NOT NULL,
  id_region                INT NOT NULL,
  id_ville                 INT,             -- facultatif (ex. régions sans ville : TCHAD, RCA, GUINEE)
  id_marque                INT NOT NULL,
  id_gamme                 INT NOT NULL,    -- doit être la gamme de la marque (contrôlé)
  id_grammage              INT NOT NULL,    -- taille du sac : doit être autorisée pour la gamme
  sortie_usine             NUMERIC(14,2),
  cout_transport           NUMERIC(14,2),
  subvention_transport     NUMERIC(14,2),
  baisse_prix              NUMERIC(14,2),
  remise_paiement_comptant NUMERIC(14,2),
  bpi                      NUMERIC(14,2),
  ristourne_mensuelle      NUMERIC(14,2),
  ristourne_trimestrielle  NUMERIC(14,2),
  volume                   NUMERIC(14,2),
  -- Calculé automatiquement (non saisissable) :
  -- NET RENDU = Sortie usine - (transport + subvention + baisse de prix + remise comptant
  --                             + BPI + ristourne mensuelle + ristourne trimestrielle)
  -- Une composante vide compte pour 0 ; si la sortie usine est vide, le résultat est vide.
  net_rendu_grossiste      NUMERIC(14,2) GENERATED ALWAYS AS (sortie_usine - (
      COALESCE(cout_transport, 0)
    + COALESCE(subvention_transport, 0)
    + COALESCE(baisse_prix, 0)
    + COALESCE(remise_paiement_comptant, 0)
    + COALESCE(bpi, 0)
    + COALESCE(ristourne_mensuelle, 0)
    + COALESCE(ristourne_trimestrielle, 0)
  )) STORED,
  prix_marche_grossiste    NUMERIC(14,2),
  CONSTRAINT fk_veille_utilisateur FOREIGN KEY (id_utilisateur)
    REFERENCES tb_utilisateurs (id_utilisateur),
  CONSTRAINT fk_veille_region FOREIGN KEY (id_region)
    REFERENCES tb_regions (id_region),
  -- Garantit que la ville saisie appartient bien à la région saisie
  CONSTRAINT fk_veille_ville_region FOREIGN KEY (id_ville, id_region)
    REFERENCES tb_villes (id_ville, id_region),
  -- La gamme saisie doit être celle de la marque
  CONSTRAINT fk_veille_marque_gamme FOREIGN KEY (id_marque, id_gamme)
    REFERENCES tb_marques (id_marque, id_gamme),
  -- Le grammage doit être autorisé pour cette gamme (ex. pas de 5 kg en Haut de Gamme)
  CONSTRAINT fk_veille_gamme_grammage FOREIGN KEY (id_gamme, id_grammage)
    REFERENCES tb_gamme_grammages (id_gamme, id_grammage)
);

CREATE INDEX ix_veille_date   ON tb_veille_concurrentielle (date_veille);
CREATE INDEX ix_veille_marque ON tb_veille_concurrentielle (id_marque);

-- =====================================================================
-- 3 bis. SÉCURITÉ SUPABASE (Row Level Security)
--    Supabase expose les tables du schéma public via son API.
--    On active RLS : sans politique, l'API ne donne accès à aucune ligne.
--    Décommentez les politiques ci-dessous pour autoriser la lecture.
-- =====================================================================

ALTER TABLE tb_regions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE tb_grammages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE tb_segments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE tb_gammes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE tb_minoteries      ENABLE ROW LEVEL SECURITY;
ALTER TABLE tb_gamme_grammages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tb_villes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE tb_marques         ENABLE ROW LEVEL SECURITY;
ALTER TABLE tb_fonctions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE tb_utilisateurs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE tb_veille_concurrentielle ENABLE ROW LEVEL SECURITY;

-- Lecture autorisée aux utilisateurs connectés (à adapter à votre besoin) :
-- CREATE POLICY lecture_regions         ON tb_regions         FOR SELECT TO authenticated USING (true);
-- CREATE POLICY lecture_grammages       ON tb_grammages       FOR SELECT TO authenticated USING (true);
-- CREATE POLICY lecture_segments        ON tb_segments        FOR SELECT TO authenticated USING (true);
-- CREATE POLICY lecture_gammes          ON tb_gammes          FOR SELECT TO authenticated USING (true);
-- CREATE POLICY lecture_minoteries      ON tb_minoteries      FOR SELECT TO authenticated USING (true);
-- CREATE POLICY lecture_gamme_grammages ON tb_gamme_grammages FOR SELECT TO authenticated USING (true);
-- CREATE POLICY lecture_villes          ON tb_villes          FOR SELECT TO authenticated USING (true);
-- CREATE POLICY lecture_marques         ON tb_marques         FOR SELECT TO authenticated USING (true);
-- CREATE POLICY lecture_fonctions       ON tb_fonctions       FOR SELECT TO authenticated USING (true);
-- CREATE POLICY lecture_utilisateurs    ON tb_utilisateurs    FOR SELECT TO authenticated USING (true);
-- CREATE POLICY lecture_veille          ON tb_veille_concurrentielle FOR SELECT TO authenticated USING (true);

-- =====================================================================
-- Vue : veille concurrentielle avec tous les libellés
--    (région, ville, marque, grammage, minoterie, segment, utilisateur)
-- =====================================================================

-- security_invoker : la vue respecte les règles RLS des tables
CREATE VIEW v_veille_concurrentielle WITH (security_invoker = true) AS
SELECT
  v.id_veille,
  v.date_veille,
  u.prenom || ' ' || u.nom   AS utilisateur,
  r.code_region              AS region,
  vi.nom_ville               AS ville,
  ma.nom_marque              AS marque,
  gr.valeur_kg               AS grammage_kg,
  mi.nom_minoterie           AS minoterie,
  se.nom_segment             AS segment,
  v.sortie_usine,
  v.cout_transport,
  v.subvention_transport,
  v.baisse_prix,
  v.remise_paiement_comptant,
  v.bpi,
  v.ristourne_mensuelle,
  v.ristourne_trimestrielle,
  v.volume,
  v.net_rendu_grossiste,
  v.prix_marche_grossiste
FROM tb_veille_concurrentielle v
JOIN tb_utilisateurs u     ON u.id_utilisateur = v.id_utilisateur
JOIN tb_regions r          ON r.id_region      = v.id_region
LEFT JOIN tb_villes vi     ON vi.id_ville      = v.id_ville
JOIN tb_marques ma         ON ma.id_marque     = v.id_marque
JOIN tb_minoteries mi      ON mi.id_minoterie  = ma.id_minoterie
JOIN tb_gammes ga          ON ga.id_gamme      = v.id_gamme
JOIN tb_grammages gr       ON gr.id_grammage   = v.id_grammage
JOIN tb_segments se        ON se.id_segment    = ga.id_segment;

COMMIT;

-- =====================================================================
-- 4. VÉRIFICATIONS FINALES
-- =====================================================================

SELECT 'tb_regions' AS table_name, COUNT(*) AS nb FROM tb_regions
UNION ALL SELECT 'tb_grammages',  COUNT(*) FROM tb_grammages
UNION ALL SELECT 'tb_gammes',     COUNT(*) FROM tb_gammes
UNION ALL SELECT 'tb_segments',   COUNT(*) FROM tb_segments
UNION ALL SELECT 'tb_minoteries', COUNT(*) FROM tb_minoteries
UNION ALL SELECT 'tb_villes',     COUNT(*) FROM tb_villes
UNION ALL SELECT 'tb_marques',    COUNT(*) FROM tb_marques
UNION ALL SELECT 'tb_gamme_grammages', COUNT(*) FROM tb_gamme_grammages;

-- Résultats attendus : tb_regions=8, tb_grammages=3, tb_gammes=4, tb_segments=2, tb_minoteries=11, tb_villes=13, tb_marques=36, tb_gamme_grammages=7


-- Exemple de requête : marques avec leur segment, leur gamme et leur minoterie
SELECT ma.nom_marque, se.nom_segment, ga.nom_gamme, mi.nom_minoterie
FROM tb_marques ma
JOIN tb_gammes ga     ON ga.id_gamme = ma.id_gamme
JOIN tb_segments se   ON se.id_segment = ga.id_segment
JOIN tb_minoteries mi ON mi.id_minoterie = ma.id_minoterie
ORDER BY mi.nom_minoterie, ma.nom_marque;

-- Exemple de requête : grammages disponibles pour chaque marque
SELECT ma.nom_marque, ga.nom_gamme, gr.valeur_kg AS grammage_kg
FROM tb_marques ma
JOIN tb_gammes ga           ON ga.id_gamme = ma.id_gamme
JOIN tb_gamme_grammages gg  ON gg.id_gamme = ga.id_gamme
JOIN tb_grammages gr        ON gr.id_grammage = gg.id_grammage
ORDER BY ma.nom_marque, gr.valeur_kg;
