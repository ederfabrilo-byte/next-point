-- Limpeza de policies duplicadas no bucket `videos`.
--
-- Duas frentes de trabalho criaram regras para a mesma coisa. Policies são OR,
-- então duplicata não quebra nada agora — mas é armadilha para quem for mexer
-- depois: "endureci a regra" e a permissiva ao lado continua valendo.

-- Morta: espera o path `{uid}/{video_id}/...` (foldername[2] = v.id), enquanto o
-- app grava `{uid}/{timestamp}.mp4`. Nunca casou com objeto nenhum — e dava a
-- falsa impressão de que o professor já conseguia ler o arquivo. Quem faz esse
-- trabalho de verdade é "videos: linked teacher reads", que compara
-- storage_url com objects.name.
drop policy if exists "videos: linked teacher reads student objects" on storage.objects;

-- Idêntica a "videos: player deletes own", só com o nome no singular.
drop policy if exists "videos: player delete own" on storage.objects;
