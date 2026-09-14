-- ═════════════════════════════════════════════════════════════════════════════
-- 1. Estado de falha para vídeo
--
-- O upload insere a linha com status 'processing' ANTES de extrair frames e
-- chamar a IA. Se qualquer etapa seguinte falhasse, o catch só mostrava um
-- Alert: a linha ficava 'processing' para sempre e a lista exibia
-- "Analisando..." sem fim. Não havia sequer um estado possível para registrar
-- a falha — o CHECK não previa.
-- ═════════════════════════════════════════════════════════════════════════════

alter table public.videos drop constraint if exists videos_status_check;
alter table public.videos add constraint videos_status_check
  check (status in ('processing','analyzed','pending_review','reviewed','failed'));

-- ═════════════════════════════════════════════════════════════════════════════
-- 2. O dono também é professor
--
-- is_admin curto-circuita o roteamento, então o Zeca nunca passava pelo
-- select-role e users.role ficava NULL para sempre. list_teachers() e
-- find_user_by_username(..., 'teacher') filtram por role='teacher' — ou seja,
-- o dono do produto era o único que não podia ter alunos.
-- ═════════════════════════════════════════════════════════════════════════════

update public.users set role = 'teacher' where is_admin and role is null;

-- Mesmo tratamento para uma base nova: o dono já nasce professor.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  base text;
  candidate text;
  n int := 0;
  owner boolean;
begin
  owner := new.email = 'zeca@nextpoint.app';

  base := regexp_replace(lower(split_part(new.email, '@', 1)), '[^a-z0-9_.]', '', 'g');
  if length(base) < 3 then
    base := base || 'user';
  end if;
  base := left(base, 16);

  candidate := base;
  while exists (select 1 from public.users u where lower(u.username) = candidate) loop
    n := n + 1;
    candidate := base || n::text;
  end loop;

  insert into public.users (id, email, is_admin, username, role)
  values (
    new.id,
    new.email,
    owner,
    candidate,
    case when owner then 'teacher' else null end
  );
  return new;
end;
$$;
