-- La generación de CLAUDE.md (step "evaluate") corre en una Background
-- Function (hasta 15 min) en vez de la function síncrona (mataba a los 30s
-- de forma reproducible — ver logs de producción del 2026-08-29, múltiples
-- "Status: timeout" a 30000ms exactos). El cliente hace polling de esta fila
-- hasta que claude_md o generation_error dejen de ser null.
ALTER TABLE public.ccc_projects
  ADD COLUMN IF NOT EXISTS generation_error TEXT;
