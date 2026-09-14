import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { useAuthStore } from './store';

export type NotificationType =
  | 'link_request'
  | 'link_accepted'
  | 'link_rejected'
  | 'link_removed'
  | 'video_submitted'
  | 'video_analyzed'
  | 'feedback_ready';

export interface NotificationRow {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
  read: boolean;
  created_at: string;
}

/** Ícone e cor por tipo, para a lista não virar um muro de texto. */
export const NOTIFICATION_STYLE: Record<NotificationType, { icon: string; color: string }> = {
  link_request:   { icon: 'person-add-outline',      color: '#F97316' },
  link_accepted:  { icon: 'checkmark-circle-outline', color: '#4ade80' },
  link_rejected:  { icon: 'close-circle-outline',     color: '#9CA3AF' },
  link_removed:   { icon: 'person-remove-outline',    color: '#9CA3AF' },
  video_submitted:{ icon: 'videocam-outline',         color: '#F97316' },
  video_analyzed: { icon: 'analytics-outline',        color: '#4ade80' },
  feedback_ready: { icon: 'chatbubble-ellipses-outline', color: '#F97316' },
};

/**
 * Cria uma notificação. Nunca lança.
 *
 * Notificar é efeito colateral: se falhar, a ação principal (aceitar um convite,
 * enviar um feedback) já aconteceu e não pode ser desfeita por causa disso.
 *
 * A policy de INSERT exige que exista uma linha em student_teacher entre as duas
 * pessoas — ou que o destinatário seja você mesmo. Ao avisar sobre um vínculo
 * que está sendo DESFEITO, chame antes de apagar a linha.
 */
export async function notify(params: {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
}): Promise<void> {
  const { error } = await supabase.from('notifications').insert({
    user_id: params.userId,
    type: params.type,
    title: params.title,
    body: params.body ?? null,
    data: params.data ?? null,
  });
  if (error) console.warn('[notify] falhou:', error.message);
}

export async function fetchNotifications(limit = 50): Promise<NotificationRow[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as NotificationRow[]) ?? [];
}

export async function markRead(id: string) {
  await supabase.from('notifications').update({ read: true }).eq('id', id);
}

export async function markAllRead(userId: string) {
  await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
}

export async function deleteNotification(id: string) {
  await supabase.from('notifications').delete().eq('id', id);
}

/**
 * Contador de não lidas para o badge da aba.
 *
 * Recarrega a cada 30s e sempre que `refresh` for chamado. Não usa Realtime de
 * propósito: exigiria a tabela publicada na replicação, o que não está
 * configurado — e um badge alguns segundos atrasado não quebra nada.
 */
export function useUnreadCount() {
  const { user } = useAuthStore();
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!user) { setCount(0); return; }
    const { count: unread } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false);
    setCount(unread ?? 0);
  }, [user]);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 30_000);
    return () => clearInterval(timer);
  }, [refresh]);

  return { count, refresh };
}
