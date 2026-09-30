-- CC Brew: agrega category (id de Google Ads, 0 = todas) a la key del cache de
-- Trends. SerpApi permite acotar por categoria y el mismo keyword puede dar
-- interes distinto segun la categoria, asi que tiene que ser parte de la key.

alter table public.cc_brew_trends_cache
  add column if not exists category integer not null default 0;

alter table public.cc_brew_trends_cache drop constraint if exists cc_brew_trends_cache_pkey;
alter table public.cc_brew_trends_cache add primary key (keyword, geo, category);
