import { supabase } from './supabase';
import { notify } from './notifications';

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

export async function requestLink(params: {
  teacherId: string;
  studentId: string;
  requestedBy: string;
  /** Nome de quem convida, para o texto da notificação. */
  fromName: string;
}) {
  const { error } = await supabase.from('student_teacher').insert({
    teacher_id: params.teacherId,
    student_id: params.studentId,
    requested_by: params.requestedBy,
    status: 'pending',
  });
  if (error) throw error;

  const invitee = params.requestedBy === params.teacherId ? params.studentId : params.teacherId;
  const comoAluno = params.requestedBy === params.teacherId;
  await notify({
    userId: invitee,
    type: 'link_request',
    title: 'Novo convite',
    body: comoAluno
      ? `${params.fromName} quer te adicionar como aluno.`
      : `${params.fromName} quer ser seu aluno.`,
    data: { teacher_id: params.teacherId, student_id: params.studentId },
  });
}

export async function acceptLink(params: {
  teacherId: string;
  studentId: string;
  /** Quem está aceitando — o aviso vai para a outra ponta. */
  acceptedBy: string;
  acceptedByName: string;
}) {
  const { error } = await supabase
    .from('student_teacher')
    .update({ status: 'accepted', responded_at: new Date().toISOString() })
    .eq('teacher_id', params.teacherId)
    .eq('student_id', params.studentId);
  if (error) throw error;

  const other = params.acceptedBy === params.teacherId ? params.studentId : params.teacherId;
  await notify({
    userId: other,
    type: 'link_accepted',
    title: 'Convite aceito',
    body: `${params.acceptedByName} aceitou o vínculo.`,
    data: { teacher_id: params.teacherId, student_id: params.studentId },
  });
}

/**
 * Recusar e cancelar apagam a linha em vez de gravar 'rejected'.
 *
 * A PK é (teacher_id, student_id): uma linha 'rejected' parada ali impediria
 * qualquer convite futuro entre as duas mesmas pessoas, e só o convidado pode
 * dar UPDATE — nem o remetente conseguiria limpar. 'rejected' continua válido
 * no CHECK, mas o app não o usa.
 */
export async function removeLink(params: {
  teacherId: string;
  studentId: string;
  removedBy: string;
  removedByName: string;
  /** true = recusa de convite; false = desfazer vínculo já aceito. */
  wasPending: boolean;
}) {
  // Notificar ANTES de apagar: a policy de INSERT em notifications exige uma
  // linha em student_teacher entre os dois. Depois do delete, não haveria mais.
  const other = params.removedBy === params.teacherId ? params.studentId : params.teacherId;
  await notify({
    userId: other,
    type: params.wasPending ? 'link_rejected' : 'link_removed',
    title: params.wasPending ? 'Convite recusado' : 'Vínculo desfeito',
    body: params.wasPending
      ? `${params.removedByName} recusou o convite. Você pode convidar de novo.`
      : `${params.removedByName} desfez o vínculo.`,
    data: { teacher_id: params.teacherId, student_id: params.studentId },
  });

  const { error } = await supabase
    .from('student_teacher')
    .delete()
    .eq('teacher_id', params.teacherId)
    .eq('student_id', params.studentId);
  if (error) throw error;
}

/** Mensagem de erro legível para as colisões esperadas do vínculo. */
export function linkErrorMessage(error: { code?: string; message: string }, who: string) {
  if (error.code === '23505') {
    return `Já existe um convite ou vínculo com ${who}.`;
  }
  return error.message;
}
