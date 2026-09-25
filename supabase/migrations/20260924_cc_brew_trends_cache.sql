-- CC Brew: cache de resultados de Google Trends (TTL 7 dias en app, evita 429
-- por reconsultar el mismo keyword/geo — ver mcp/lib/tools.js validate_demand)

create table if not exists public.cc_brew_trends_cache (
  keyword    text not null,
  geo        text not null default '',
  data       jsonb not null,
  fetched_at timestamptz not null default now(),
  primary key (keyword, geo)
);
