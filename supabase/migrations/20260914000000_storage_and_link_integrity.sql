-- Três correções de integridade encontradas na auditoria dos fluxos.

-- ═════════════════════════════════════════════════════════════════════════════
-- 1. Um aluno, um professor
--
-- student_teacher não tinha unicidade por student_id. Com o professor podendo
-- adicionar aluno, dois professores conseguiam vincular o mesmo aluno — e a tela
-- do aluno lê o vínculo com limit(1), então o segundo professor ficava lendo o
-- perfil técnico dele de forma invisível, sem como desvincular.
-- ═════════════════════════════════════════════════════════════════════════════

-- Dedupe antes da constraint: mantém o vínculo mais recente de cada aluno.
-- Comparar a tupla (created_at, ctid) desempata created_at idêntico.
delete from public.student_teacher a
using public.student_teacher b
where a.student_id = b.student_id
  and (a.created_at, a.ctid) < (b.created_at, b.ctid);

create unique index if not exists student_teacher_one_per_student
  on public.student_teacher (student_id);

-- ═════════════════════════════════════════════════════════════════════════════
-- 2. Bucket `videos`: migration e realidade divergiam
--
-- A migration cria o bucket privado, mas o app gravava getPublicUrl() em
-- videos.storage_url — numa base criada do zero, toda URL nascia quebrada.
-- Resolvido mantendo o bucket PRIVADO (são vídeos de treino de pessoas reais,
-- URL pública é acessível por qualquer um que tenha o link) e passando o app a
-- guardar o PATH, gerando signed URL na hora de exibir.
--
-- Faltava também a leitura do Zeca: a policy exigia primeira pasta = auth.uid(),
-- então o admin não conseguia abrir vídeo de aluno nenhum — nem para avaliar.
-- ═════════════════════════════════════════════════════════════════════════════

update storage.buckets set public = false where id = 'videos';

drop policy if exists "videos: admin reads all" on storage.objects;
create policy "videos: admin reads all" on storage.objects
  for select to authenticated
  using (bucket_id = 'videos' and public.is_app_admin());

-- Jogador pode apagar os próprios arquivos (hoje só tinha insert e select).
drop policy if exists "videos: player deletes own" on storage.objects;
create policy "videos: player deletes own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ═════════════════════════════════════════════════════════════════════════════
-- 3. Bucket `avatars`: não existia em migration nenhuma
--
-- Existia só porque foi criado à mão no dashboard — o repo não reproduzia o
-- ambiente. Público de propósito: avatar é exibido por outros usuários (lista de
-- alunos, diretório de professores) e o ganho de privacidade não paga o custo de
-- assinar cada URL.
-- ═════════════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880, -- 5MB
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update set
  public             = true,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Mesmo padrão do bucket videos: a primeira pasta do path é o uid do dono.
-- O app foi ajustado para gravar em `{uid}/avatar.{ext}` (antes era
-- `avatars/{uid}.{ext}`, com a primeira pasta sendo a constante "avatars" —
-- qualquer policy neste padrão rejeitaria o upload).
drop policy if exists "avatars: owner writes own" on storage.objects;
create policy "avatars: owner writes own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars: owner updates own" on storage.objects;
create policy "avatars: owner updates own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars: owner deletes own" on storage.objects;
create policy "avatars: owner deletes own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Leitura liberada: o bucket é público, mas a policy explícita mantém o
-- comportamento igual caso alguém feche o bucket depois.
drop policy if exists "avatars: anyone reads" on storage.objects;
create policy "avatars: anyone reads" on storage.objects
  for select to public
  using (bucket_id = 'avatars');
