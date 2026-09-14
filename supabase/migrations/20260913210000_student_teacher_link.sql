-- Vínculo aluno <-> professor.
--
-- `student_teacher` existe desde o schema inicial, mas só tinha policy de SELECT:
-- nenhum caminho no app conseguia CRIAR o vínculo. E, mesmo que criasse, `users` e
-- `player_profiles` só eram legíveis pelo próprio dono da linha — então a área do
-- professor voltaria vazia de qualquer jeito. Esta migration destrava os dois lados.

-- ─────────────────────────────────────────────────────────────────────────────
-- Helpers
--
-- SECURITY DEFINER de propósito: precisam consultar public.users dentro de
-- policies que incidem sobre a PRÓPRIA tabela users. Sem isso o Postgres entra
-- em recursão infinita de RLS ("infinite recursion detected in policy").
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.is_app_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select u.is_admin from public.users u where u.id = auth.uid()), false);
$$;

-- auth.uid() é professor de p_student?
create or replace function public.teaches(p_student uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.student_teacher st
    where st.teacher_id = auth.uid() and st.student_id = p_student
  );
$$;

-- p_teacher é professor de auth.uid()?
create or replace function public.is_taught_by(p_teacher uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.student_teacher st
    where st.student_id = auth.uid() and st.teacher_id = p_teacher
  );
$$;

create or replace function public.has_role(p_user uuid, p_role text)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.users u where u.id = p_user and u.role = p_role);
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Diretório de professores
--
-- O aluno precisa enxergar professores ANTES de existir vínculo. Em vez de abrir
-- uma policy de SELECT em users (que exporia o e-mail de todo professor), expõe-se
-- só o mínimo para a escolha, via função.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.list_teachers()
returns table (id uuid, name text, avatar_url text)
language sql stable security definer set search_path = public as $$
  select u.id, u.name, u.avatar_url
  from public.users u
  where u.role = 'teacher'
  order by coalesce(nullif(btrim(u.name), ''), u.email);
$$;

revoke execute on function public.list_teachers() from public, anon;
grant execute on function public.list_teachers() to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- student_teacher: criar e desfazer o vínculo
-- ─────────────────────────────────────────────────────────────────────────────

-- O aluno escolhe o próprio professor. Não pode vincular terceiros, nem apontar
-- para alguém que não seja professor.
drop policy if exists "student_teacher: student links self" on public.student_teacher;
create policy "student_teacher: student links self" on public.student_teacher
  for insert to authenticated
  with check (auth.uid() = student_id and public.has_role(teacher_id, 'teacher'));

-- Qualquer um dos dois lados pode desfazer.
drop policy if exists "student_teacher: either side unlinks" on public.student_teacher;
create policy "student_teacher: either side unlinks" on public.student_teacher
  for delete to authenticated
  using (auth.uid() = student_id or auth.uid() = teacher_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Leitura entre usuários vinculados
--
-- Policies são OR: estas SOMAM à "users: own row" existente, não a substituem.
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists "users: teacher reads own students" on public.users;
create policy "users: teacher reads own students" on public.users
  for select to authenticated
  using (public.teaches(id));

drop policy if exists "users: student reads own teacher" on public.users;
create policy "users: student reads own teacher" on public.users
  for select to authenticated
  using (public.is_taught_by(id));

-- Zeca precisa disso para a fila de vídeos mostrar o nome do jogador e para o
-- contador de usuários da home admin (hoje ambos leem só a própria linha).
drop policy if exists "users: admin reads all" on public.users;
create policy "users: admin reads all" on public.users
  for select to authenticated
  using (public.is_app_admin());

-- O professor precisa ver os atributos técnicos do aluno na tela de detalhe.
drop policy if exists "player_profiles: teacher reads own students" on public.player_profiles;
create policy "player_profiles: teacher reads own students" on public.player_profiles
  for select to authenticated
  using (public.teaches(user_id));
