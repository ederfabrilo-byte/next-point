import { supabase } from './supabase';

/**
 * Vínculo aluno<->professor é convite com aceite: nasce 'pending' e só passa a
 * valer quando a outra ponta aceita. As policies de leitura de `users` e
 * `player_profiles` exigem 'accepted', então nada do perfil vaza antes disso.
 */

export interface PendingLink {
  teacher_id: string;
  student_id: string;
  requested_by: string;
  created_at: string;
  counterpart_id: string;
  counterpart_username: string | null;
  counterpart_name: string | null;
  counterpart_avatar_url: string | null;
}

/** Nome de exibição da contraparte, com os fallbacks na ordem certa. */
export function counterpartName(link: PendingLink, fallback = 'Usuário') {
  return link.counterpart_name?.trim() || link.counterpart_username || fallback;
}

/**
 * Convites pendentes em que o usuário logado é uma das pontas — enviados e
 * recebidos. Quem recebeu é quem pode responder (`requested_by !== meu id`).
 */
export async function fetchPendingLinks(): Promise<PendingLink[]> {
  const { data, error } = await supabase.rpc('pending_links');
  if (error) throw error;
  return (data as PendingLink[]) ?? [];
}

export async function requestLink(params: { teacherId: string; studentId: string; requestedBy: string }) {
  const { error } = await supabase.from('student_teacher').insert({
    teacher_id: params.teacherId,
    student_id: params.studentId,
    requested_by: params.requestedBy,
    status: 'pending',
  });
  if (error) throw error;
}

export async function acceptLink(teacherId: string, studentId: string) {
  const { error } = await supabase
    .from('student_teacher')
    .update({ status: 'accepted', responded_at: new Date().toISOString() })
    .eq('teacher_id', teacherId)
    .eq('student_id', studentId);
  if (error) throw error;
}

/**
 * Recusar e cancelar apagam a linha em vez de gravar 'rejected'.
 *
 * A PK é (teacher_id, student_id): uma linha 'rejected' parada ali impediria
 * qualquer convite futuro entre as duas mesmas pessoas, e só o convidado pode
 * dar UPDATE — nem o remetente conseguiria limpar. 'rejected' continua válido
 * no CHECK, mas o app não o usa.
 */
export async function removeLink(teacherId: string, studentId: string) {
  const { error } = await supabase
    .from('student_teacher')
    .delete()
    .eq('teacher_id', teacherId)
    .eq('student_id', studentId);
  if (error) throw error;
}

/** Mensagem de erro legível para as colisões esperadas do vínculo. */
export function linkErrorMessage(error: { code?: string; message: string }, who: string) {
  if (error.code === '23505') {
    return `Já existe um convite ou vínculo com ${who}.`;
  }
  return error.message;
}
