-- Adiciona atributos técnicos: slice, dropshot, smash
-- Aplicado em player_profiles, opponents e video_analyses para manter consistência.

alter table public.player_profiles
  add column if not exists slice    numeric(3,1),
  add column if not exists dropshot numeric(3,1),
  add column if not exists smash    numeric(3,1);

alter table public.opponents
  add column if not exists slice    numeric(3,1),
  add column if not exists dropshot numeric(3,1),
  add column if not exists smash    numeric(3,1);

alter table public.video_analyses
  add column if not exists slice    numeric(3,1),
  add column if not exists dropshot numeric(3,1),
  add column if not exists smash    numeric(3,1);
