-- Torna o bucket de vídeos público para permitir reprodução dentro do app:
-- o jogador revê seus próprios vídeos e o Prof. Zeca assiste aos vídeos de
-- avaliação técnica enviados pelos alunos. Os caminhos de storage contêm
-- UUIDs aleatórios, portanto as URLs não são adivinháveis.
update storage.buckets
set public = true
where id = 'videos';
