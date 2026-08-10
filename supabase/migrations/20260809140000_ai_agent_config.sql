-- Agente de IA único: contexto/orientação que o Zeca (admin) define e que baliza
-- tanto a geração de estratégia quanto a análise de vídeo.
-- Substitui coach_config (estratégia) e video_analysis_config (vídeo).

create table if not exists public.ai_agent_config (
  id uuid primary key default gen_random_uuid(),
  base_context text,        -- identidade/contexto base do agente (compartilhado)
  strategy_guidance text,   -- orientações específicas para estratégia
  video_guidance text,      -- orientações específicas para análise de vídeo
  updated_by uuid references public.users on delete set null,
  updated_at timestamptz default now()
);
alter table public.ai_agent_config enable row level security;

-- Só o admin (Zeca) lê/escreve pela UI. As Edge Functions leem via service role.
drop policy if exists "ai_agent_config: admin all" on public.ai_agent_config;
create policy "ai_agent_config: admin all" on public.ai_agent_config
  for all using (exists (select 1 from public.users u where u.id = auth.uid() and u.is_admin))
  with check (exists (select 1 from public.users u where u.id = auth.uid() and u.is_admin));

-- seed: migra o system_prompt de estratégia atual (se existir) para o Agente
insert into public.ai_agent_config (strategy_guidance)
select system_prompt from public.coach_config order by version desc limit 1;
