-- Pendência 2 do HANDOFF: a tela de avaliação do professor faz join em
-- opponents(name) para mostrar contra quem o aluno jogou, mas a única policy
-- de opponents era "own rows" → o professor via "adversário: —".
--
-- O professor VINCULADO (status accepted, via teaches()) passa a ler os
-- adversários do aluno. Só leitura; escrita continua exclusiva do dono.
-- Idempotente.

drop policy if exists "opponents: teacher reads linked student" on public.opponents;
create policy "opponents: teacher reads linked student"
  on public.opponents
  for select
  to authenticated
  using (public.teaches(owner_id));
