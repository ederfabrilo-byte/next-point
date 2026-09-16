-- Push notifications: toda linha nova em public.notifications vira um POST na
-- Edge Function send-push, que entrega no celular via Expo Push API.
--
-- Por que no banco e não no app: as notificações são criadas em vários lugares
-- (app do aluno, app do professor, Edge Functions). Um trigger cobre todos de
-- uma vez e nenhum deles precisa saber que push existe.
--
-- Segredo compartilhado: fica no Vault com o nome `send_push_webhook_secret`
-- e NÃO está nesta migration (repo público). Criar uma vez, fora do git:
--   select vault.create_secret('<valor>', 'send_push_webhook_secret');
-- O mesmo valor vai para os secrets da função:
--   supabase secrets set PUSH_WEBHOOK_SECRET=<valor>
--
-- Idempotente: pode ser reaplicada.

create extension if not exists pg_net;

create or replace function public.notifications_send_push()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_secret text;
  v_url    text := 'https://aymztftngjojdjnwkgyn.supabase.co/functions/v1/send-push';
begin
  -- Sem token não há o que entregar; poupa a chamada HTTP.
  if not exists (
    select 1 from public.users where id = new.user_id and push_token is not null
  ) then
    return new;
  end if;

  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name = 'send_push_webhook_secret'
  limit 1;

  if v_secret is null then
    raise warning 'notifications_send_push: segredo send_push_webhook_secret ausente no Vault — push não enviado';
    return new;
  end if;

  -- Assíncrono: o INSERT não espera a resposta. Falha de rede aqui nunca
  -- desfaz a notificação in-app.
  perform net.http_post(
    url     := v_url,
    headers := jsonb_build_object(
      'Content-Type',     'application/json',
      'x-webhook-secret', v_secret
    ),
    body    := jsonb_build_object('record', to_jsonb(new)),
    timeout_milliseconds := 5000
  );

  return new;
exception when others then
  -- Push é efeito colateral. Nunca derruba o INSERT.
  raise warning 'notifications_send_push falhou: %', sqlerrm;
  return new;
end;
$$;

revoke all on function public.notifications_send_push() from public;

drop trigger if exists notifications_send_push on public.notifications;
create trigger notifications_send_push
  after insert on public.notifications
  for each row execute function public.notifications_send_push();
