-- =====================================================================
-- Migration complémentaire pour l'application mobile "Veille Farines"
-- À exécuter UNE FOIS dans Supabase (SQL Editor > New query),
-- APRÈS le script farines_db_supabase.sql.
--
-- Ce script :
--   1. ajoute client_uuid (anti-doublon lors de l'envoi hors ligne) et cree_le
--   2. relie le compte de connexion Supabase (Auth) à tb_utilisateurs par l'email
--   3. crée les politiques RLS : lecture des listes, saisie et lecture
--      de ses propres relevés uniquement
-- Il peut être relancé sans risque et ne supprime aucune donnée.
-- =====================================================================

BEGIN;

-- 1. Colonnes techniques ------------------------------------------------
ALTER TABLE tb_veille_concurrentielle
  ADD COLUMN IF NOT EXISTS client_uuid UUID,
  ADD COLUMN IF NOT EXISTS cree_le TIMESTAMPTZ NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_veille_client_uuid') THEN
    ALTER TABLE tb_veille_concurrentielle
      ADD CONSTRAINT uq_veille_client_uuid UNIQUE (client_uuid);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_veille_utilisateur ON tb_veille_concurrentielle (id_utilisateur);

-- 2. Utilisateur connecté -> id_utilisateur ------------------------------
-- Le compte Supabase Auth et la ligne de tb_utilisateurs partagent le même email.
CREATE OR REPLACE FUNCTION public.fn_id_utilisateur_courant()
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id_utilisateur
  FROM public.tb_utilisateurs u
  WHERE lower(u.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.fn_id_utilisateur_courant() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_id_utilisateur_courant() TO authenticated;

ALTER TABLE tb_veille_concurrentielle
  ALTER COLUMN id_utilisateur SET DEFAULT public.fn_id_utilisateur_courant();

-- 3. Politiques RLS -----------------------------------------------------
-- Listes de référence : lecture pour tout utilisateur connecté
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['tb_regions','tb_grammages','tb_segments','tb_gammes',
                           'tb_minoteries','tb_gamme_grammages','tb_villes',
                           'tb_marques','tb_fonctions']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS app_lecture ON %I', t);
    EXECUTE format('CREATE POLICY app_lecture ON %I FOR SELECT TO authenticated USING (true)', t);
    EXECUTE format('GRANT SELECT ON %I TO authenticated', t);
  END LOOP;
END $$;

-- Utilisateurs : chacun ne voit que sa propre fiche
DROP POLICY IF EXISTS app_lecture_soi ON tb_utilisateurs;
CREATE POLICY app_lecture_soi ON tb_utilisateurs
  FOR SELECT TO authenticated
  USING (id_utilisateur = public.fn_id_utilisateur_courant());
GRANT SELECT ON tb_utilisateurs TO authenticated;

-- Relevés : chacun saisit et consulte uniquement ses propres relevés
DROP POLICY IF EXISTS app_insertion ON tb_veille_concurrentielle;
CREATE POLICY app_insertion ON tb_veille_concurrentielle
  FOR INSERT TO authenticated
  WITH CHECK (id_utilisateur = public.fn_id_utilisateur_courant());

DROP POLICY IF EXISTS app_lecture_soi ON tb_veille_concurrentielle;
CREATE POLICY app_lecture_soi ON tb_veille_concurrentielle
  FOR SELECT TO authenticated
  USING (id_utilisateur = public.fn_id_utilisateur_courant());

GRANT SELECT, INSERT ON tb_veille_concurrentielle TO authenticated;
GRANT SELECT ON v_veille_concurrentielle TO authenticated;

COMMIT;

-- =====================================================================
-- (Facultatif) Donner à un responsable la lecture de TOUS les relevés.
-- Remplacez l'email puis exécutez :
--
-- CREATE POLICY app_lecture_responsable ON tb_veille_concurrentielle
--   FOR SELECT TO authenticated
--   USING (lower(auth.jwt() ->> 'email') IN ('responsable@exemple.cm'));
-- CREATE POLICY app_lecture_responsable ON tb_utilisateurs
--   FOR SELECT TO authenticated
--   USING (lower(auth.jwt() ->> 'email') IN ('responsable@exemple.cm'));
-- =====================================================================

-- =====================================================================
-- Exemple : ajouter un enquêteur. Créez AUSSI son compte dans
-- Authentication > Users avec le même email et un mot de passe.
--
-- INSERT INTO tb_fonctions (nom_fonction) VALUES ('Commercial terrain')
--   ON CONFLICT (nom_fonction) DO NOTHING;
-- INSERT INTO tb_utilisateurs (nom, prenom, id_fonction, email, phone, id_minoterie)
-- SELECT 'NGONO', 'Paul', f.id_fonction, 'paul.ngono@exemple.cm', '+237690000000', m.id_minoterie
-- FROM tb_fonctions f, tb_minoteries m
-- WHERE f.nom_fonction = 'Commercial terrain' AND m.nom_minoterie = 'CADYST GRAIN';
-- =====================================================================
