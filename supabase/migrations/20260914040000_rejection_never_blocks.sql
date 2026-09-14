-- Recusa não pode eternizar a condição: o pedido tem de poder ser refeito.
--
-- A PK de student_teacher é (teacher_id, student_id). Uma linha parada em
-- 'rejected' bloqueia qualquer convite futuro entre as duas mesmas pessoas — e,
-- pela policy "invitee responds", só o convidado pode dar UPDATE: nem o
-- remetente conseguiria limpar. Ficaria um beco sem saída permanente.
--
-- O app já recusa apagando a linha, mas isso é garantia de cliente. A policy
-- continua aceitando status='rejected', então qualquer outro cliente (ou um
-- curl com a anon key) recria o problema. Este trigger move a garantia para o
-- banco: 'rejected' nunca persiste.

create or replace function public.drop_rejected_link()
returns trigger
language plpgsql
security definer
set search_path = public as $$
begin
  delete from public.student_teacher
  where teacher_id = new.teacher_id
    and student_id = new.student_id;
  return null; -- AFTER trigger: retorno é ignorado
end;
$$;

drop trigger if exists student_teacher_rejected_is_removed on public.student_teacher;
create trigger student_teacher_rejected_is_removed
  after update of status on public.student_teacher
  for each row
  when (new.status = 'rejected')
  execute function public.drop_rejected_link();
