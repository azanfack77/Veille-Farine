-- =====================================================================
-- Migration "Console d'administration Veille Farines"
-- À exécuter APRÈS farines_db_supabase.sql et migration_app.sql.
-- Peut être relancée sans risque, ne supprime aucune donnée.
-- =====================================================================

BEGIN;

-- 1. Administrateurs ------------------------------------------------------
CREATE TABLE IF NOT EXISTS tb_administrateurs (
  id_administrateur INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email             VARCHAR(150) NOT NULL UNIQUE,
  cree_le           TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_administrateurs_email CHECK (email LIKE '%_@_%._%')
);
ALTER TABLE tb_administrateurs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.fn_est_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tb_administrateurs a
    WHERE lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
REVOKE ALL ON FUNCTION public.fn_est_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_est_admin() TO authenticated;

DROP POLICY IF EXISTS admin_tout ON tb_administrateurs;
CREATE POLICY admin_tout ON tb_administrateurs
  FOR ALL TO authenticated USING (public.fn_est_admin()) WITH CHECK (public.fn_est_admin());
GRANT SELECT, INSERT, DELETE ON tb_administrateurs TO authenticated;

-- 2. Désactivation d'un enquêteur (sans supprimer ses relevés) -------------
ALTER TABLE tb_utilisateurs ADD COLUMN IF NOT EXISTS actif BOOLEAN NOT NULL DEFAULT TRUE;

-- Un enquêteur désactivé ne peut plus enregistrer de relevé depuis le mobile
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
    AND u.actif
  LIMIT 1;
$$;

-- 3. Droits complets des administrateurs ---------------------------------
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['tb_regions','tb_grammages','tb_segments','tb_gammes',
                           'tb_minoteries','tb_gamme_grammages','tb_villes',
                           'tb_marques','tb_fonctions','tb_utilisateurs']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS admin_tout ON %I', t);
    EXECUTE format('CREATE POLICY admin_tout ON %I FOR ALL TO authenticated
                    USING (public.fn_est_admin()) WITH CHECK (public.fn_est_admin())', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO authenticated', t);
  END LOOP;
END $$;

-- Relevés : les administrateurs lisent, corrigent et suppriment tout
DROP POLICY IF EXISTS admin_lecture ON tb_veille_concurrentielle;
CREATE POLICY admin_lecture ON tb_veille_concurrentielle
  FOR SELECT TO authenticated USING (public.fn_est_admin());
DROP POLICY IF EXISTS admin_modification ON tb_veille_concurrentielle;
CREATE POLICY admin_modification ON tb_veille_concurrentielle
  FOR UPDATE TO authenticated USING (public.fn_est_admin()) WITH CHECK (public.fn_est_admin());
DROP POLICY IF EXISTS admin_suppression ON tb_veille_concurrentielle;
CREATE POLICY admin_suppression ON tb_veille_concurrentielle
  FOR DELETE TO authenticated USING (public.fn_est_admin());
GRANT SELECT, UPDATE, DELETE ON tb_veille_concurrentielle TO authenticated;

-- 4. Vue enrichie pour la console (identifiants + libellés) ----------------
CREATE OR REPLACE VIEW v_admin_releves WITH (security_invoker = true) AS
SELECT
  v.id_veille, v.date_veille, v.cree_le,
  v.id_utilisateur, u.prenom || ' ' || u.nom AS utilisateur,
  v.id_region, r.code_region AS region,
  v.id_ville, vi.nom_ville AS ville,
  v.id_marque, ma.nom_marque AS marque,
  mi.id_minoterie, mi.nom_minoterie AS minoterie,
  v.id_gamme, ga.nom_gamme AS gamme,
  se.id_segment, se.nom_segment AS segment,
  v.id_grammage, gr.valeur_kg AS grammage_kg,
  v.sortie_usine, v.cout_transport, v.subvention_transport, v.baisse_prix,
  v.remise_paiement_comptant, v.bpi, v.ristourne_mensuelle, v.ristourne_trimestrielle,
  v.net_rendu_grossiste, v.prix_marche_grossiste, v.volume
FROM tb_veille_concurrentielle v
JOIN tb_utilisateurs u   ON u.id_utilisateur = v.id_utilisateur
JOIN tb_regions r        ON r.id_region      = v.id_region
LEFT JOIN tb_villes vi   ON vi.id_ville      = v.id_ville
JOIN tb_marques ma       ON ma.id_marque     = v.id_marque
JOIN tb_minoteries mi    ON mi.id_minoterie  = ma.id_minoterie
JOIN tb_gammes ga        ON ga.id_gamme      = v.id_gamme
JOIN tb_segments se      ON se.id_segment    = ga.id_segment
JOIN tb_grammages gr     ON gr.id_grammage   = v.id_grammage;

GRANT SELECT ON v_admin_releves TO authenticated;

COMMIT;

-- =====================================================================
-- 5. PREMIER ADMINISTRATEUR (à faire une seule fois)
--    Créez d'abord son compte dans Authentication > Users, puis :
--
-- INSERT INTO tb_administrateurs (email) VALUES ('admin@exemple.cm');
-- =====================================================================
