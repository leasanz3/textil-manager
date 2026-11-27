-- Diagnosticar columna user_id y RLS en tablas de Corte / MarcadaSim
-- Supabase → SQL Editor → pegar y ejecutar (solo SELECT, no modifica nada)

SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND (tablename LIKE 'cortes_%' OR tablename LIKE 'marcadas_sim%')
ORDER BY tablename;

SELECT
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'user_id'
  AND (table_name LIKE 'cortes_%' OR table_name LIKE 'marcadas_sim%')
ORDER BY table_name;

SELECT
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND (tablename LIKE 'cortes_%' OR tablename LIKE 'marcadas_sim%')
ORDER BY tablename, policyname;
