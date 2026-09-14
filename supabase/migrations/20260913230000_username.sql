-- Nome de usuário: identificador público, único e compartilhável.
--
-- Vínculo aluno<->professor passa a ser por @username em vez de e-mail. E-mail é
-- dado de contato, não identificador para terceiros digitarem — trocar por username
-- tira o e-mail de circulação nas telas de busca e de lista.
--
-- Também habilita o sentido que faltava: o professor adicionar o aluno.

-- ─────────────────────────────────────────────────────────────────────────────
-- Coluna
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.users add column if not exists username text;

-- Backfill a partir do local part do e-mail, normalizado. `where username is null`
-- mantém a migration idempotente e preserva quem já escolheu um.
with base as (
  select id,
         regexp_replace(lower(split_part(email, '@', 1)), '[^a-z0-9_.]', '', 'g') as raw
  from public.users
  where username is null
), norm as (
  select id,
         case when length(raw) >= 3 then left(raw, 16) else left(raw || 'user', 16) end as cand
  from base
), numbered as (
  select id, cand, row_number() over (partition by cand order by id) as rn
  from norm
)
update public.users u
set username = case when n.rn = 1 then n.cand else n.cand || n.rn::text end
from numbered n
where u.id = n.id;

create unique index if not exists users_username_lower_idx
  on public.users (lower(username));

alter table public.users drop constraint if exists users_username_format;
alter table public.users add constraint users_username_format
  check (username is null or username ~ '^[a-z0-9_.]{3,20}$');

-- ─────────────────────────────────────────────────────────────────────────────
-- Username automático no cadastro (senão ninguém consegue ser encontrado)
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  base text;
  candidate text;
  n int := 0;
begin
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

  insert into public.users (id, email, is_admin, username)
  values (new.id, new.email, new.email = 'zeca@nextpoint.app', candidate);
  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Busca por @username
--
-- Match EXATO (case-insensitive) e um resultado só: não é uma busca por prefixo,
-- justamente para não virar um raspador de base. Aceita com ou sem "@".
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.find_user_by_username(p_username text, p_role text default null)
returns table (id uuid, username text, name text, avatar_url text, role text)
language sql stable security definer set search_path = public as $$
  select u.id, u.username, u.name, u.avatar_url, u.role
  from public.users u
  where u.username is not null
    and lower(u.username) = lower(ltrim(btrim(p_username), '@'))
    and (p_role is null or u.role = p_role)
  limit 1;
$$;

revoke execute on function public.find_user_by_username(text, text) from public, anon;
grant execute on function public.find_user_by_username(text, text) to authenticated;

-- list_teachers passa a devolver o username. Precisa de drop: mudar o tipo de
-- retorno não é permitido em create or replace.
drop function if exists public.list_teachers();
create or replace function public.list_teachers()
returns table (id uuid, username text, name text, avatar_url text)
language sql stable security definer set search_path = public as $$
  select u.id, u.username, u.name, u.avatar_url
  from public.users u
  where u.role = 'teacher'
  order by coalesce(nullif(btrim(u.name), ''), u.username);
$$;

revoke execute on function public.list_teachers() from public, anon;
grant execute on function public.list_teachers() to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Vínculo nos dois sentidos
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists "student_teacher: student links self" on public.student_teacher;
create policy "student_teacher: student links self" on public.student_teacher
  for insert to authenticated
  with check (
    auth.uid() = student_id
    and public.has_role(teacher_id, 'teacher')
  );

-- Professor adiciona o aluno. O aluno pode desfazer a qualquer momento pela
-- policy de DELETE, que já vale para os dois lados.
drop policy if exists "student_teacher: teacher links student" on public.student_teacher;
create policy "student_teacher: teacher links student" on public.student_teacher
  for insert to authenticated
  with check (
    auth.uid() = teacher_id
    and public.has_role(teacher_id, 'teacher')
    and public.has_role(student_id, 'player')
  );
