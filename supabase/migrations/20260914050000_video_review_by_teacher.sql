-- Padrão definitivo de avaliação de vídeo.
--
-- Zeca (José Mota) é o professor que o APP representa: ele alimenta contexto e
-- parâmetros em ai_agent_config, e "avaliação do Zeca" é a IA rodando com isso.
-- Ele NÃO assiste a vídeo de aluno.
--
-- Quem avalia à mão são os professores-pessoas, cada um apenas dos seus alunos
-- vinculados. O vídeo fica privado entre o aluno e o professor que ele escolheu.
--
-- A coluna `videos.reviewer` ('teacher' | 'ai_zeca') e as policies de professor
-- vinculado já existiam no banco, vindas de outra frente de trabalho. Esta
-- migration não as reinventa — fecha o que ficou aberto em volta delas.

-- ═════════════════════════════════════════════════════════════════════════════
-- 1. O Zeca deixa de ver vídeo de aluno
--
-- "videos: admin sees technical_review" dava a ele leitura de TODO vídeo de
-- avaliação, de qualquer aluno de qualquer professor — o oposto do padrão.
-- A participação dele é o contexto da IA, não assistir ao vídeo.
-- ═════════════════════════════════════════════════════════════════════════════

drop policy if exists "videos: admin sees technical_review" on public.videos;
drop policy if exists "videos: admin updates feedback"      on public.videos;

-- ═════════════════════════════════════════════════════════════════════════════
-- 2. O aluno não pode mandar para professor que não tem
--
-- A policy do jogador era `for all using (player_id = auth.uid())`, SEM
-- with_check: dava para gravar reviewer='teacher' sem ter vínculo aceito algum.
-- O vídeo nasceria invisível — nenhuma policy de professor casaria com ele, e
-- ficaria preso em pending_review para sempre.
--
-- Substituída, não complementada: policies são OR, uma nova mais estrita não
-- teria efeito nenhum ao lado da permissiva.
-- ═════════════════════════════════════════════════════════════════════════════

drop policy if exists "videos: player sees own" on public.videos;
drop policy if exists "videos: player owns"     on public.videos;
create policy "videos: player owns" on public.videos
  for all to authenticated
  using (player_id = auth.uid())
  with check (
    player_id = auth.uid()
    and (
      reviewer is distinct from 'teacher'
      or exists (
        select 1 from public.student_teacher st
        where st.student_id = auth.uid() and st.status = 'accepted'
      )
    )
  );

-- Avaliação técnica sem reviewer definido seria um vídeo órfão.
-- NOT VALID de propósito: vale para linhas novas e alteradas, e deixa em paz o
-- vídeo já avaliado no modelo antigo, de quando a coluna não existia.
alter table public.videos drop constraint if exists videos_reviewer_required;
alter table public.videos add constraint videos_reviewer_required
  check (purpose <> 'technical_review' or reviewer is not null) not valid;

-- Aviso de vídeo novo não é um convite: merece tipo próprio, senão a lista de
-- notificações mostra ícone e rótulo de vínculo para um envio de vídeo.
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in (
    'link_request','link_accepted','link_rejected','link_removed',
    'video_submitted','video_analyzed','feedback_ready'
  ));

-- ═════════════════════════════════════════════════════════════════════════════
-- 3. O professor precisa conseguir ASSISTIR ao vídeo
--
-- As policies existentes davam a ele a linha da tabela, mas não o arquivo: no
-- storage só havia dono e admin. Ele avaliaria sem ver nada.
-- `videos.storage_url` guarda o path, que é exatamente storage.objects.name.
-- ═════════════════════════════════════════════════════════════════════════════

drop policy if exists "videos: admin reads all" on storage.objects;

drop policy if exists "videos: linked teacher reads" on storage.objects;
create policy "videos: linked teacher reads" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'videos'
    and exists (
      select 1
      from public.videos v
      join public.student_teacher st
        on st.student_id = v.player_id
       and st.teacher_id = auth.uid()
       and st.status = 'accepted'
      where v.storage_url = storage.objects.name
        and v.purpose = 'technical_review'
        and v.reviewer = 'teacher'
    )
  );
