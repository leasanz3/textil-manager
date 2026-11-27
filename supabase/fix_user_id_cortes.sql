-- Asegurar columna user_id en tablas de Corte / MarcadaSim
-- Supabase → SQL Editor → pegar y ejecutar una vez
-- IDEMPOTENTE: si la columna ya existe, no hace nada.

ALTER TABLE public.cortes_marcadas           ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.cortes_marcadas_productos ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.cortes_piezas             ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.cortes_ajustes            ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.cortes_pedidos            ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.cortes_piezas_req         ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.cortes_pedido_talles      ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.marcadas_sim              ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.marcadas_sim_productos    ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.marcadas_sim_piezas       ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.marcadas_sim_ajustes      ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.marcadas_sim_piezas_req   ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.marcadas_sim_pedido       ADD COLUMN IF NOT EXISTS user_id uuid;
