-- Converge o schema deste repo com o fluxo de convite/aceite que já existia no
-- banco (status pending/accepted/rejected, requested_by, responded_at).
--
-- O repo tinha construído vínculo direto, sem aceite. As duas camadas coexistiam
-- e, como policies são OR, as permissivas venciam: `teaches()` e `is_taught_by()`
-- não olhavam status, então um convite PENDENTE já liberava a leitura do perfil
-- técnico do aluno. Esta migration remove essa sobreposição.

-- ═════════════════════════════════════════════════════════════════════════════
-- 1. Helpers passam a exigir vínculo aceito
-- ═════════════════════════════════════════════════════════════════════════════

create or replace function public.teaches(p_student uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.student_teacher st
    where st.teacher_id = auth.uid()
      and st.student_id = p_student
      and st.status = 'accepted'
  );
$$;

create or replace function public.is_taught_by(p_teacher uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.student_teacher st
    where st.student_id = auth.uid()
      and st.teacher_id = p_teacher
      and st.status = 'accepted'
  );
$$;

-- ═════════════════════════════════════════════════════════════════════════════
-- 2. Remove as policies duplicadas do repo
--
-- Ficam as versões que verificam status explicitamente. As minhas viravam
-- redundância depois do passo 1, mas duas policies dizendo a mesma coisa é
-- armadilha para a próxima pessoa que mexer aqui.
-- ═════════════════════════════════════════════════════════════════════════════

drop policy if exists "users: teacher reads own students"            on public.users;
drop policy if exists "users: student reads own teacher"             on public.users;
drop policy if exists "player_profiles: teacher reads own students"  on public.player_profiles;
drop policy if exists "student_teacher: either side unlinks"         on public.student_teacher;

-- ═════════════════════════════════════════════════════════════════════════════
-- 3. Criação do vínculo passa a ser sempre convite
--
-- As duas policies de INSERT do repo permitiam criar a linha sem preencher
-- requested_by — a linha nascia 'pending' pelo default e ninguém sabia de quem
-- partiu, então o "invitee responds" (que exige requested_by <> auth.uid())
-- nunca autorizava resposta nenhuma. Vínculo nascia morto.
-- ═════════════════════════════════════════════════════════════════════════════

drop policy if exists "student_teacher: student links self"   on public.student_teacher;
drop policy if exists "student_teacher: teacher links student" on public.student_teacher;

-- Recriada com validação de papel: sem isso, um jogador podia "convidar" outro
-- jogador como professor dele.
drop policy if exists "student_teacher: participant creates request" on public.student_teacher;
create policy "student_teacher: participant creates request" on public.student_teacher
  for insert to authenticated
  with check (
    requested_by = auth.uid()
    and (teacher_id = auth.uid() or student_id = auth.uid())
    and status = 'pending'
    and public.has_role(teacher_id, 'teacher')
    and public.has_role(student_id, 'player')
  );

-- ═════════════════════════════════════════════════════════════════════════════
-- 4. Unicidade só sobre o vínculo aceito
--
-- O índice do repo era sobre student_id inteiro. Com convite, um convite
-- pendente ocuparia a vaga única do aluno e nenhum outro professor conseguiria
-- nem convidá-lo. Parcial resolve: vários convites pendentes, um só aceito.
-- ═════════════════════════════════════════════════════════════════════════════

drop index if exists public.student_teacher_one_per_student;

create unique index if not exists student_teacher_one_accepted_per_student
  on public.student_teacher (student_id)
  where status = 'accepted';

-- ═════════════════════════════════════════════════════════════════════════════
-- 5. Convites pendentes precisam mostrar quem é a outra ponta
--
-- As policies de users só liberam a contraparte quando o vínculo está aceito —
-- correto, mas deixa a tela de convite sem nome nem @ para exibir. Esta função
-- devolve exatamente os campos públicos das contrapartes pendentes, sem abrir
-- users para leitura ampla.
-- ═════════════════════════════════════════════════════════════════════════════

drop function if exists public.pending_links();
create or replace function public.pending_links()
returns table (
  teacher_id uuid,
  student_id uuid,
  requested_by uuid,
  created_at timestamptz,
  counterpart_id uuid,
  counterpart_username text,
  counterpart_name text,
  counterpart_avatar_url text
)
language sql stable security definer set search_path = public as $$
  select st.teacher_id,
         st.student_id,
         st.requested_by,
         st.created_at,
         u.id,
         u.username,
         u.name,
         u.avatar_url
  from public.student_teacher st
  join public.users u
    on u.id = case when st.teacher_id = auth.uid() then st.student_id else st.teacher_id end
  where st.status = 'pending'
    and (st.teacher_id = auth.uid() or st.student_id = auth.uid())
  order by st.created_at desc;
$$;

revoke execute on function public.pending_links() from public, anon;
grant execute on function public.pending_links() to authenticated;
