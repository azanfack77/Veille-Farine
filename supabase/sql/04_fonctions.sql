-- =====================================================================
-- 04. FONCTIONS DES ENQUÊTEURS : code + libellé
--   CDR = Chef de Région
--   RM  = Responsable de Marché
--   AB  = Animateur Beignet
-- À exécuter après 01, 02 et 03. Peut être relancé sans risque.
-- =====================================================================

ALTER TABLE tb_fonctions ADD COLUMN IF NOT EXISTS code_fonction VARCHAR(10);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_fonctions_code') THEN
    ALTER TABLE tb_fonctions ADD CONSTRAINT uq_fonctions_code UNIQUE (code_fonction);
  END IF;
END $$;

-- Les lignes déjà saisies avec le code ou le libellé reçoivent les deux
UPDATE tb_fonctions SET code_fonction = 'CDR', nom_fonction = 'Chef de Région'
WHERE code_fonction IS NULL AND upper(trim(nom_fonction)) IN ('CDR', 'CHEF DE RÉGION', 'CHEF DE REGION');

UPDATE tb_fonctions SET code_fonction = 'RM', nom_fonction = 'Responsable de Marché'
WHERE code_fonction IS NULL AND upper(trim(nom_fonction)) IN ('RM', 'RESPONSABLE DE MARCHÉ', 'RESPONSABLE DE MARCHE');

UPDATE tb_fonctions SET code_fonction = 'AB', nom_fonction = 'Animateur Beignet'
WHERE code_fonction IS NULL AND upper(trim(nom_fonction)) IN ('AB', 'ANIMATEUR BEIGNET', 'ANIMATEUR BEIGNETS');

-- Ajoute celles qui manquent
INSERT INTO tb_fonctions (code_fonction, nom_fonction)
SELECT v.code, v.nom
FROM (VALUES ('CDR', 'Chef de Région'), ('RM', 'Responsable de Marché'), ('AB', 'Animateur Beignet')) AS v(code, nom)
WHERE NOT EXISTS (SELECT 1 FROM tb_fonctions f WHERE f.code_fonction = v.code);

-- Contrôle
SELECT id_fonction, code_fonction, nom_fonction FROM tb_fonctions ORDER BY id_fonction;
