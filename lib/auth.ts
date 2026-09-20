import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { supabase } from './supabase';

/**
 * Recuperação de senha (fluxo nativo do Supabase):
 *   1. `requestPasswordReset(email)` → Supabase envia e-mail com link.
 *   2. O link abre o app em /reset-password com access_token/refresh_token no
 *      fragmento da URL (#…). `sessionFromResetUrl` lê isso e cria a sessão.
 *   3. A tela chama `supabase.auth.updateUser({ password })`.
 *
 * As URLs de retorno precisam estar na allow list do projeto
 * (Auth → URL Configuration): next-point://reset-password e a URL web.
 */
export function resetRedirectUrl(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}/reset-password`;
  }
  // Build nativo: next-point://reset-password. No Expo Go vira exp://…/--/reset-password.
  return Linking.createURL('/reset-password');
}

export async function requestPasswordReset(email: string) {
  return supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: resetRedirectUrl() });
}

/** Extrai os tokens do link de recuperação e abre a sessão. `false` se a URL não tem tokens. */
export async function sessionFromResetUrl(url: string | null): Promise<boolean> {
  if (!url) return false;
  const fragment = url.includes('#') ? url.slice(url.indexOf('#') + 1) : '';
  const params = new URLSearchParams(fragment);
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  if (!access_token || !refresh_token) return false;
  const { error } = await supabase.auth.setSession({ access_token, refresh_token });
  return !error;
}
