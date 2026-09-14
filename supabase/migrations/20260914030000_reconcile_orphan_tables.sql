-- Reconciliação: traz para o repo três tabelas que existiam só no banco.
--
-- Foram criadas em outra frente de trabalho e nunca entraram em migration, então
-- `supabase/migrations/` não reproduzia o ambiente. O DDL aqui foi extraído do
-- banco de produção (information_schema + pg_catalog), não reescrito de memória.
--
-- Rodar num banco que já tem tudo isso é no-op. O valor é um projeto novo nascer
-- igual ao atual.

-- ═════════════════════════════════════════════════════════════════════════════
-- match_results — placar de partidas contra um adversário
-- ═════════════════════════════════════════════════════════════════════════════

create table if not exists public.match_results (
  id            uuid primary key default gen_random_uuid(),
  player_id     uuid not null references public.users(id)     on delete cascade,
  opponent_id   uuid not null references public.opponents(id) on delete cascade,
  player_sets   integer not null default 0,
  opponent_sets integer not null default 0,
  date          date not null default current_date,
  notes         text,
  created_at    timestamptz not null default now()
);

alter table public.match_results enable row level security;

drop policy if exists "match_results: player owns" on public.match_results;
create policy "match_results: player owns" on public.match_results
  for all
  using (player_id = auth.uid())
  with check (player_id = auth.uid());

-- ═════════════════════════════════════════════════════════════════════════════
-- notifications — avisos in-app
--
-- O CHECK de `type` cobre o ciclo de vínculo (link_request, link_accepted,
-- link_rejected, link_removed) além de vídeo e feedback. O app ainda NÃO escreve
-- nesta tabela: convidar/aceitar/recusar não gera notificação nenhuma hoje.
-- ═════════════════════════════════════════════════════════════════════════════

create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  type       text not null check (type in (
               'link_request','link_accepted','link_rejected','link_removed',
               'video_analyzed','feedback_ready'
             )),
  title      text not null,
  body       text,
  data       jsonb,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, read, created_at desc);

drop policy if exists "notifications: recipient reads own" on public.notifications;
create policy "notifications: recipient reads own" on public.notifications
  for select using (auth.uid() = user_id);

drop policy if exists "notifications: recipient updates own" on public.notifications;
create policy "notifications: recipient updates own" on public.notifications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "notifications: recipient deletes own" on public.notifications;
create policy "notifications: recipient deletes own" on public.notifications
  for delete using (auth.uid() = user_id);

-- Deixa avisar a outra ponta de um vínculo. Não filtra status de propósito:
-- 'link_request' precisa chegar justamente enquanto o vínculo está pendente.
drop policy if exists "notifications: insert for linked user" on public.notifications;
create policy "notifications: insert for linked user" on public.notifications
  for insert
  with check (
    auth.uid() = user_id
    or exists (
      select 1 from public.student_teacher st
      where (st.teacher_id = auth.uid() and st.student_id = notifications.user_id)
         or (st.student_id = auth.uid() and st.teacher_id = notifications.user_id)
    )
  );

-- ═════════════════════════════════════════════════════════════════════════════
-- video_analysis_config — SUPERSEDIDA por ai_agent_config
--
-- Estava com RLS DESABILITADA e sem policy nenhuma: era a única tabela do schema
-- nesse estado. Com RLS off, os grants padrão do Supabase dão leitura e escrita
-- ao papel `anon` — e a anon key vai embutida no APK. A tabela está vazia, então
-- nada vazou, mas qualquer um podia escrever nela.
--
-- Trancada aqui em vez de removida porque derrubar tabela é irreversível e a
-- decisão é do dono. Junto com `coach_config` (também vazia e substituída), é
-- candidata a DROP assim que confirmado que nada mais lê as duas.
-- ═════════════════════════════════════════════════════════════════════════════

create table if not exists public.video_analysis_config (
  id         uuid primary key default gen_random_uuid(),
  teacher_id uuid unique references public.users(id) on delete cascade,
  guidelines text not null,
  updated_at timestamptz default now()
);

alter table public.video_analysis_config enable row level security;

drop policy if exists "video_analysis_config: admin only" on public.video_analysis_config;
create policy "video_analysis_config: admin only" on public.video_analysis_config
  for all
  using (public.is_app_admin())
  with check (public.is_app_admin());
