import { createClient } from 'npm:@supabase/supabase-js@2';

/**
 * send-push — entrega uma notificação in-app como push no celular.
 *
 * Quem chama é o BANCO, não o app: o trigger `notifications_send_push`
 * (AFTER INSERT em public.notifications) faz um POST aqui via pg_net com a
 * linha recém-criada. Por isso a função é deployada com --no-verify-jwt e se
 * protege com um segredo compartilhado (header x-webhook-secret), guardado no
 * Vault do banco e nos secrets desta função (PUSH_WEBHOOK_SECRET).
 *
 * Fluxo: lê users.push_token do destinatário (service role — RLS não se
 * aplica) → POST na Expo Push API → se o aparelho não existe mais
 * (DeviceNotRegistered), zera o token para não insistir.
 */

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('method not allowed', { status: 405 });
  }

  const secret = Deno.env.get('PUSH_WEBHOOK_SECRET');
  if (!secret || req.headers.get('x-webhook-secret') !== secret) {
    return new Response('unauthorized', { status: 401 });
  }

  let record: NotificationRow;
  try {
    ({ record } = await req.json());
    if (!record?.user_id || !record?.title) throw new Error('payload sem record');
  } catch (e) {
    return json({ error: `payload inválido: ${e instanceof Error ? e.message : e}` }, 400);
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: user, error } = await admin
    .from('users')
    .select('push_token')
    .eq('id', record.user_id)
    .maybeSingle();

  if (error) return json({ error: error.message }, 500);

  const token = user?.push_token;
  if (!token || !/^Expo(nent)?PushToken\[/.test(token)) {
    return json({ skipped: 'sem push_token válido' });
  }

  const res = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      to: token,
      title: record.title,
      body: record.body ?? undefined,
      sound: 'default',
      priority: 'high',
      channelId: 'default',
      data: { ...(record.data ?? {}), notificationId: record.id, type: record.type },
    }),
  });

  const result = await res.json().catch(() => null);
  const ticket = result?.data;

  // Token morto: o usuário desinstalou ou trocou de aparelho. Zera para o
  // trigger parar de acionar esta função à toa.
  if (ticket?.status === 'error' && ticket?.details?.error === 'DeviceNotRegistered') {
    await admin.from('users').update({ push_token: null }).eq('id', record.user_id);
    return json({ skipped: 'DeviceNotRegistered — token removido' });
  }

  if (!res.ok || ticket?.status === 'error') {
    console.error('[send-push] expo respondeu erro', JSON.stringify(result));
    return json({ error: ticket?.message ?? `expo push http ${res.status}`, result }, 502);
  }

  return json({ ok: true, ticket });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
