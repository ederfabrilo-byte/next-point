import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { supabase } from './supabase';

/**
 * Push notifications — lado do app.
 *
 * O app só faz duas coisas: obter o Expo push token do aparelho e gravá-lo em
 * `users.push_token`. Quem envia é o banco: um trigger em `notifications`
 * chama a Edge Function `send-push`, que fala com a Expo Push API. Assim toda
 * notificação in-app vira push automaticamente, sem o app (nem outra Edge
 * Function) precisar saber disso.
 *
 * Exige build nativo (APK/IPA) — exceto Expo Go no iOS, que ainda recebe push.
 * No Expo Go Android e na web não há push — as funções abaixo não fazem nada.
 */

const ANDROID_CHANNEL = 'default';

/** Como uma notificação aparece com o app em primeiro plano. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

function isPushCapable(): boolean {
  if (Platform.OS === 'web') return false;
  if (!Device.isDevice) return false; // emulador/simulador não recebe push
  // Expo Go (SDK 53+) não recebe push remoto no Android; no iOS ainda recebe.
  if (Constants.appOwnership === 'expo') return Platform.OS === 'ios';
  return true;
}

/**
 * Pede permissão, obtém o token e grava em `users.push_token`. Nunca lança:
 * push é opcional e não pode derrubar o login.
 */
export async function registerForPush(userId: string): Promise<void> {
  if (!isPushCapable()) return;

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL, {
        name: 'Avisos',
        importance: Notifications.AndroidImportance.HIGH,
        lightColor: '#F97316',
      });
    }

    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      ({ status } = await Notifications.requestPermissionsAsync());
    }
    if (status !== 'granted') return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });

    // Só escreve se mudou — evita um UPDATE a cada abertura do app.
    const { data: row } = await supabase
      .from('users')
      .select('push_token')
      .eq('id', userId)
      .maybeSingle();
    if (row?.push_token === token) return;

    const { error } = await supabase.from('users').update({ push_token: token }).eq('id', userId);
    if (error) console.warn('[push] não gravou token:', error.message);
  } catch (e) {
    console.warn('[push] registro falhou:', e instanceof Error ? e.message : e);
  }
}

/**
 * Limpa o token ao sair da conta. Sem isso, quem logar depois no mesmo
 * aparelho continuaria recebendo os avisos do usuário anterior.
 * Chame ANTES de `supabase.auth.signOut()` — depois não há mais sessão para
 * passar pela RLS.
 */
export async function unregisterPush(userId: string): Promise<void> {
  if (!isPushCapable()) return;
  try {
    await supabase.from('users').update({ push_token: null }).eq('id', userId);
  } catch {
    // silencioso — logout precisa acontecer de qualquer jeito
  }
}

/** Payload que a Edge Function `send-push` coloca em `data` de cada push. */
export interface PushData {
  notificationId?: string;
  type?: string;
  [key: string]: unknown;
}

/**
 * Chama `onOpen` quando o usuário toca numa notificação — inclusive a que
 * abriu o app do zero. Devolve a função de limpeza.
 */
export function listenPushOpened(onOpen: (data: PushData) => void): () => void {
  if (Platform.OS === 'web') return () => {};

  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    onOpen((response.notification.request.content.data ?? {}) as PushData);
  });

  // App aberto pela notificação (cold start): o listener acima não dispara.
  Notifications.getLastNotificationResponseAsync().then((response) => {
    if (response) onOpen((response.notification.request.content.data ?? {}) as PushData);
  });

  return () => sub.remove();
}
