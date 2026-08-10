# HANDOFF — estado do projeto e próximos passos

> Documento de continuidade entre máquinas. Se você (Claude Code) está lendo isto numa
> sessão nova, este é o ponto exato onde o trabalho parou. Leia também o `CLAUDE.md`.

## Como está o ambiente

- App **Expo SDK 54** + Supabase (cloud) + NativeWind + Zustand. Rodar: `npm install` e `npx expo start --tunnel`.
- Backend Supabase é **cloud**, project ref `aymztftngjojdjnwkgyn` — funciona de qualquer rede.
- `.env` não vem no git: `cp .env.example .env`.
- Deploy de Edge Function precisa de um **Personal Access Token novo** do Supabase
  (`export SUPABASE_ACCESS_TOKEN=...` + `npx supabase functions deploy <slug> --project-ref aymztftngjojdjnwkgyn`, sem Docker).

## O que já está PRONTO e no ar

- **Auth** unificada em `app/index.tsx` (login/cadastro). `mailer_autoconfirm` está LIGADO no Supabase (cadastro sem e-mail) — só para testes.
- **Perfis por login**: aluno (`player`) e professor (`teacher`), escolhidos em `select-role`. Nunca predeterminado.
- **Admin (Zeca)**: coluna `users.is_admin`. Quem tem `is_admin=true` cai direto na área `app/(admin)/` (pula o select-role). Zeca é o dono/mente por trás da IA. Área `(teacher)` é só professor comum (gerencia alunos).
- **Agente de IA** (`app/(admin)/agent.tsx`): tabela `ai_agent_config` com `base_context` + `strategy_guidance` + `video_guidance`. É o cérebro único que baliza estratégia E vídeo. Lido pelas Edge Functions via **service role** (não vaza por RLS).
- **Estratégia**: Edge Function `generate-strategy` (Claude `claude-sonnet-4-6`, `max_tokens 4096`). Tela de detalhe tem export (copiar/compartilhar).
- **Vídeo (Fase 3)**: `app/(player)/videos/upload.tsx` faz upload real pro bucket `videos` (`{userId}/ts.mp4`), extrai 6 frames no cliente (`expo-video-thumbnails`) e chama a Edge Function `analyze-video`, que roda Claude Vision seguindo o Agente e aplica os scores no perfil/adversário (só campos não-null). Avaliação técnica vai pra fila do Zeca (`pending_review`).
- **Atributos técnicos**: forehand, backhand, slice, serve, volley, smash, dropshot, movement, mental — dirigidos por `ATTRIBUTE_LABELS` em `lib/types.ts` (mudar lá propaga pra todas as telas).

## Migrations (todas já aplicadas no projeto cloud)

`supabase/migrations/`: initial_schema, videos_bucket, push_token, add_slice_dropshot_smash, admin_role_zeca, ai_agent_config. Novas: aplicar pelo SQL Editor do dashboard ou Management API.

## Pendências conhecidas (candidatos a próximos passos)

1. **Testar no device** o fluxo de vídeo de ponta a ponta (upload → análise → scores no perfil) — só foi validado o backend com imagem sintética.
2. **Limitar tamanho/duração do vídeo** no upload (hoje lê o arquivo inteiro em base64 na memória; clipe longo pode travar).
3. **Permissão de galeria no `app.json`** para build standalone (no Expo Go já funciona).
4. **Exibir o erro real das Edge Functions** no app (hoje mostra o genérico "non-2xx"; parsear `error.context`).
5. **Notificações push** (Fase 4): existe migration `push_token`, mas o fluxo não está montado.
6. **Antes de produção**: desligar `mailer_autoconfirm` e configurar SMTP; revisar visibilidade do repo.

## Gotchas

- Frame do Vision precisa ser JPEG de tamanho normal (1x1 dá "Could not process image").
- `expo-file-system` no SDK 54: usar `import * as FileSystem from 'expo-file-system/legacy'` para `readAsStringAsync`.
- Se `--tunnel` reclamar, `npm install --save-dev @expo/ngrok`.
