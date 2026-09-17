-- Vídeo preso em `processing` nunca sai sozinho: se o app fechar no meio do
-- upload ou a Edge Function morrer sem responder, a linha fica "Analisando..."
-- para sempre (havia dois assim desde maio, com storage_url = 'pending').
--
-- Um job do pg_cron marca como `failed` o que estiver em `processing` há mais
-- de 15 min. A análise real leva menos de 2 min; 15 dá folga para rede lenta.
-- O app já mostra `failed` como "Falhou" e deixa o jogador excluir/reenviar.
--
-- Idempotente: pode ser reaplicada.

create extension if not exists pg_cron;

create or replace function public.fail_stale_processing_videos()
returns integer
language sql
security definer
set search_path = public
as $$
  with stale as (
    update public.videos
       set status = 'failed'
     where status = 'processing'
       and created_at < now() - interval '15 minutes'
    returning 1
  )
  select count(*)::integer from stale;
$$;

revoke all on function public.fail_stale_processing_videos() from public;

-- Reagenda sem duplicar: cron.schedule com o mesmo nome substitui o job.
select cron.schedule(
  'fail-stale-processing-videos',
  '*/10 * * * *',
  $$select public.fail_stale_processing_videos()$$
);

-- Limpa o que já está preso hoje.
select public.fail_stale_processing_videos();
