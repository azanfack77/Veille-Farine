-- =====================================================================
-- 05. NET RENDU : le coût de transport s'ajoute au lieu d'être déduit
--   NET RENDU = Sortie usine + transport - (subvention + baisse de prix
--               + remise comptant + BPI + ristourne mensuelle
--               + ristourne trimestrielle)
-- À exécuter après 01 à 04. Peut être relancé sans risque.
-- Les relevés déjà saisis sont recalculés automatiquement.
-- =====================================================================

BEGIN;

-- Une colonne générée ne se modifie pas : on la recrée. Les deux vues qui
-- l'utilisent sont supprimées avec elle, puis recréées à l'identique.
ALTER TABLE tb_veille_concurrentielle DROP COLUMN IF EXISTS net_rendu_grossiste CASCADE;

ALTER TABLE tb_veille_concurrentielle ADD COLUMN net_rendu_grossiste NUMERIC(14,2)
  GENERATED ALWAYS AS (sortie_usine + COALESCE(cout_transport, 0) - (
      COALESCE(subvention_transport, 0)
    + COALESCE(baisse_prix, 0)
    + COALESCE(remise_paiement_comptant, 0)
    + COALESCE(bpi, 0)
    + COALESCE(ristourne_mensuelle, 0)
    + COALESCE(ristourne_trimestrielle, 0)
  )) STORED;

CREATE OR REPLACE VIEW v_veille_concurrentielle WITH (security_invoker = true) AS
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

GRANT SELECT ON v_veille_concurrentielle TO authenticated;

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
