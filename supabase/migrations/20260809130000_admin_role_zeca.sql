-- Separa o "admin" (dono do app: Zeca Mota) do professor comum.
-- Zeca é a identidade única por trás da IA e das avaliações técnicas de vídeo.
-- Professor comum gerencia os próprios alunos; NÃO avalia a fila nem configura a IA.

alter table public.users add column if not exists is_admin boolean not null default false;

-- flag o dono, se a conta já existir
update public.users set is_admin = true where email = 'zeca@nextpoint.app';

-- auto-flag do dono no cadastro (email do dono fica só aqui, nunca no app)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, is_admin)
  values (new.id, new.email, new.email = 'zeca@nextpoint.app');
  return new;
end;
$$;

-- Fila de avaliação técnica: só o admin (Zeca) vê e responde
drop policy if exists "videos: teacher sees technical_review" on public.videos;
create policy "videos: admin sees technical_review" on public.videos
  for select using (
    purpose = 'technical_review'
    and exists (select 1 from public.users u where u.id = auth.uid() and u.is_admin)
  );

drop policy if exists "videos: teacher updates feedback" on public.videos;
create policy "videos: admin updates feedback" on public.videos
  for update using (
    purpose = 'technical_review'
    and exists (select 1 from public.users u where u.id = auth.uid() and u.is_admin)
  );

-- coach_config (system prompt da IA): leitura liberada p/ qualquer logado (a Edge Function
-- de estratégia precisa aplicar o prompt do Zeca no contexto do aluno); escrita só admin.
drop policy if exists "coach_config: teacher reads own" on public.coach_config;
drop policy if exists "coach_config: teacher writes own" on public.coach_config;
create policy "coach_config: authenticated reads" on public.coach_config
  for select using (auth.uid() is not null);
create policy "coach_config: admin writes" on public.coach_config
  for all using (exists (select 1 from public.users u where u.id = auth.uid() and u.is_admin))
  with check (exists (select 1 from public.users u where u.id = auth.uid() and u.is_admin));
