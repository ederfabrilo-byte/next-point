-- Adiciona coluna push_token na tabela users
alter table public.users
  add column if not exists push_token text;
