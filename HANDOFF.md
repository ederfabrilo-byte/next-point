# HANDOFF — estado do projeto e próximos passos

> Documento de continuidade entre máquinas. Se você (Claude Code) está retomando numa
> sessão nova, este é o ponto exato onde o trabalho parou. Leia também o `CLAUDE.md`.
>
> Atualizado em **2026-09-16**.

## ⚠️ Leia antes de escrever qualquer migration

**O banco já esteve à frente deste repositório, e pode estar de novo.**

Este projeto foi trabalhado por duas frentes em paralelo, e a outra aplicou DDL direto no
Supabase sem versionar. Foram encontradas no banco coisas que não existiam em
`supabase/migrations/`: o fluxo de convite em `student_teacher`, as tabelas `match_results`
e `notifications`, a coluna `videos.reviewer`, e policies de storage apontando para um
layout de path que o app não usa.

Isso causou um **vazamento de permissão real**: as policies deste repo usavam `teaches()` /
`is_taught_by()` sem olhar `status`, e como policies são **OR**, anulavam a proteção das
policies novas — um convite apenas *pendente* já liberava o perfil técnico do aluno.

**Portanto: inspecione o banco antes de assumir que estas migrations descrevem a realidade.**

```bash
curl -s -X POST "https://api.supabase.com/v1/projects/aymztftngjojdjnwkgyn/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" -H "Content-Type: application/json" \
  -d '{"query":"select tablename, policyname, cmd from pg_policies where schemaname='"'"'public'"'"' order by 1,2;"}'
```

Duas armadilhas já pagas: **`n_live_tup` mente** (dá "tabela vazia" com dados dentro — use
`count(*)`), e **policy duplicada não é inofensiva** (a permissiva antiga mantém o buraco
aberto ao lado da nova; sempre `drop` a antiga).

## Como está o ambiente

- **Expo SDK 54** + Supabase (cloud) + NativeWind + Zustand. Rodar: `npm install` e `npx expo start --tunnel`.
- Project ref `aymztftngjojdjnwkgyn` (`sa-east-1`).
- `.env` não vem no git: `cp .env.example .env`.
- Também fora do git, na raiz: `google-services.json` e `fcm-service-account.json` (FCM).
  Para regerar: `firebase apps:sdkconfig ANDROID 1:702946796390:android:7a745327b88e8d7946dea7 -o google-services.json`
  (Firebase CLI logada) e a chave pelo IAM da conta `firebase-adminsdk-fbsvc@next-point-6040b`.
- No Mac o EAS autentica por `EXPO_TOKEN` (`~/.expo/token`) e o Supabase por PAT em
  `~/.supabase/access-token`.
- Credenciais já cadastradas como env vars do **projeto** no EAS (dev/preview/prod) — `eas env:list --environment preview`.
- Build: `eas build --profile preview --platform android` gera APK standalone. O profile
  `development` exigiria `expo-dev-client`, que não está instalado.
- Aplicar DDL sem Docker: Management API `POST /v1/projects/{ref}/database/query` com PAT.
  Roda em transação. **Escreva toda migration idempotente** — você vai reaplicar.
- Deploy de Edge Function: `SUPABASE_ACCESS_TOKEN=<pat> npx supabase functions deploy <slug> --project-ref aymztftngjojdjnwkgyn`.

## Regra de negócio central — não altere sem ordem explícita

**Zeca Mota é o professor que o app representa. Ele NÃO assiste a vídeo de aluno.** Ele
alimenta contexto e parâmetros em `ai_agent_config`; "avaliação pelo Professor Zeca Mota" é
a **IA** rodando com isso. Quem avalia à mão são os professores-pessoas, cada um só dos
próprios alunos vinculados.

| Opção no envio | `purpose` | `reviewer` | Comportamento |
|---|---|---|---|
| Avaliação pelo Professor Zeca Mota | `profile_analysis` | `ai_zeca` | IA roda **na hora**, `processing` → `analyzed`. Nunca entra em fila |
| Avaliação do Professor | `technical_review` | `teacher` | `pending_review` → fila do professor vinculado |

Aluno **com** professor vê as duas opções; **sem** vínculo, só a do Zeca. Só vídeo de
professor real entra em fila. O vídeo é privado entre o aluno e o professor que ele
vinculou — as policies `videos: admin sees technical_review` / `admin updates feedback`
foram **removidas de propósito**; se reaparecerem, é regressão.

## O que está pronto

- **Auth** unificada em `app/index.tsx`. `mailer_autoconfirm` LIGADO (só para testes).
- **Identidade**: `users.username` único (gerado no cadastro a partir do e-mail, com
  desempate) + `name` editável. `components/IdentityCard.tsx` edita os dois.
- **Vínculo aluno↔professor = convite com aceite.** `student_teacher.status`
  (`pending`/`accepted`/`rejected`) + `requested_by` + `responded_at`. Qualquer ponta
  convida por `@username`, só a outra aceita. **Toda leitura filtra `status='accepted'`.**
  Índice único parcial sobre `accepted` — vários convites pendentes, um só aceito.
  O trigger `student_teacher_rejected_is_removed` apaga a linha ao virar `rejected`: sem
  ele a PK bloquearia o par para sempre. **Não remova.**
- **Notificações** in-app (`notifications`) com aba Avisos e badge nos três perfis.
  Pegadinha: a policy de INSERT exige linha em `student_teacher` entre os dois — ao avisar
  sobre vínculo **desfeito**, notifique **antes** do delete.
- **Push notifications** (2026-09-16). Toda linha nova em `notifications` vira push, sem o
  app ou as Edge Functions saberem: trigger `notifications_send_push` → `pg_net` → Edge
  Function `send-push` (deployada com `--no-verify-jwt`, protegida pelo header
  `x-webhook-secret`; o valor vive no Vault como `send_push_webhook_secret` e no secret
  `PUSH_WEBHOOK_SECRET` da função) → Expo Push API. Token `DeviceNotRegistered` é zerado
  pela função. No app: `lib/push.ts` grava `users.push_token` no login, zera no logout e
  leva para a aba Avisos ao tocar na push. Android exige FCM: projeto Firebase
  `next-point-6040b`, `google-services.json` na raiz (ignorado; no EAS vem pela env var de
  arquivo `GOOGLE_SERVICES_JSON` via `app.config.js`) e chave FCM V1 já cadastrada em
  `eas credentials`. iOS ainda sem APNs (nunca houve build iOS).
- **Estratégia**: Edge Function `generate-strategy` (`claude-sonnet-4-6`, `max_tokens 4096`).
- **Vídeo**: upload real, frames extraídos no cliente (`expo-video-thumbnails`), IA via
  `analyze-video`. Fila do professor com **player funcionando** (`expo-video` + signed URL).
- **Badges 📹/✎** de origem das notas, via `lib/analyses.ts`.
- **Área do Zeca** (`is_admin`): Agente de IA, Alunos e Vídeos (como professor dele mesmo).
- **RLS em 13 de 13 tabelas.**

## Pendências conhecidas

1. **Push: validar no aparelho.** Pipeline testado ponta-a-ponta só até a Expo Push API
   (token falso → `DeviceNotRegistered`). Falta abrir o APK, aceitar a permissão, conferir
   `users.push_token` preenchido e receber uma push real. iOS precisa de APNs quando houver
   build iOS.
2. **`coach_config` e `video_analysis_config`** estão vazias e substituídas por
   `ai_agent_config`. Candidatas a `DROP` — decisão do dono.
3. **Fila do Zeca faz join em `opponents(name)`** e a RLS de `opponents` é só do dono →
   mostra "adversário: —". Policy de uma linha resolve.
4. **Upload lê o vídeo inteiro como base64 na memória** — falta limite de tamanho/duração.
5. **Erro de Edge Function** ainda genérico ("non-2xx") em alguns pontos.
6. **Antes de produção**: desligar `mailer_autoconfirm`, configurar SMTP, revisar repo público.
7. **Trigger de recusa instalado mas não exercitado** — não havia vínculos no banco. Teste:
   convidar → recusar → convidar de novo.

## Gotchas

- **`eas credentials` é menu interativo** e não roda pelo `!` do Claude Code. Dá para dirigir
  com `expect` (feito em 2026-09-16 para subir a chave FCM V1). O classificador do Claude
  Code também barra escrita em secret store (`eas env:create`, `supabase secrets set`,
  criação de chave IAM) — os scripts `scripts-*.sh` na raiz existem para o Eder rodar.
- **Testar push exige build nativo** (APK preview). Expo Go não recebe push remoto no
  Android desde o SDK 53; emulador também não.

- **Reanimated 4 exige new architecture** — `newArchEnabled: true` no `app.json`. Com `false`
  o build Android morre em `assertNewArchitectureEnabledTask`.
- **Bucket `videos` é PRIVADO.** `storage_url` guarda o **path**; para exibir, assine com
  `lib/storage.ts → getVideoSignedUrl()`. `toVideoPath()` normaliza linhas antigas que
  guardam a URL inteira.
- **Primeira pasta do path de storage tem que ser o uid** — as policies exigem
  `(storage.foldername(name))[1] = auth.uid()`.
- **Policies em `users` que consultam `users`** entram em recursão infinita de RLS. Por isso
  `is_app_admin()`, `teaches()`, `is_taught_by()` e `has_role()` são `SECURITY DEFINER`.
- **Frame do Vision** precisa ser JPEG de tamanho normal (1×1 dá "Could not process image").
- **`expo-file-system` no SDK 54**: `import * as FileSystem from 'expo-file-system/legacy'`.
- **Modelo Claude**: `claude-sonnet-4-6`. O `claude-sonnet-4-20250514` foi descontinuado.
- **Nunca chamar a Claude API do frontend** — sempre via Edge Function.
