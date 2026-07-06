-- ────────────────────────────────────────────────────────────────────────────
-- MIGRACIÓN: produccion_pedidos + pedido_id nullable en produccion_etapas
-- Aplicar en: Supabase → SQL Editor
-- ────────────────────────────────────────────────────────────────────────────

-- 1. Hacer pedido_id opcional en produccion_etapas
--    (permite crear lotes de producción sin pedido asociado)
ALTER TABLE produccion_etapas
  ALTER COLUMN pedido_id DROP NOT NULL;

-- 2. Nueva tabla puente: una producción puede tener 0, 1 o varios pedidos
CREATE TABLE IF NOT EXISTS produccion_pedidos (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  produccion_etapa_id uuid REFERENCES produccion_etapas(id) ON DELETE CASCADE NOT NULL,
  pedido_id           uuid REFERENCES pedidos(id)           ON DELETE CASCADE NOT NULL,
  talles              jsonb DEFAULT '{}',
  user_id             uuid,
  created_at          timestamptz DEFAULT now()
);

-- 3. RLS — mismo patrón que el resto del proyecto
ALTER TABLE produccion_pedidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pp_public"
  ON produccion_pedidos FOR ALL TO public
  USING (true) WITH CHECK (true);

CREATE POLICY "pp_authenticated"
  ON produccion_pedidos FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
