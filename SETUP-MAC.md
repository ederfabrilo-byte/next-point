# Rodar o Next Point no Mac (outra rede)

Guia pra retomar o projeto num Mac. O backend (Supabase) é **cloud** — funciona de qualquer rede, nada a instalar do lado do servidor.

## 1. Pré-requisitos no Mac

- **Node.js 20 LTS** (mínimo 18) — `node -v`
- **Git** — `git -v`
- **App Expo Go** no celular (App Store / Play Store) — é como você roda o app
- (Opcional) **Xcode** se quiser simulador iOS
- **Claude Code** (pra continuar o vibe coding): `npm install -g @anthropic-ai/claude-code`, depois `claude` dentro da pasta do projeto. O `CLAUDE.md` do projeto viaja junto no repo, então o Claude Code no Mac já pega o contexto.

## 2. Clonar

```bash
git clone https://github.com/ederfabrilo-byte/next-point.git
cd next-point
```

## 3. Variáveis de ambiente

```bash
cp .env.example .env
```
As chaves já vêm preenchidas (a anon key é pública). O `.env` real fica fora do git.

## 4. Instalar dependências

```bash
npm install
```
O `.npmrc` já tem `legacy-peer-deps=true`, então não precisa de flag extra.

## 5. Rodar o app

```bash
npx expo start --tunnel
```
O `--tunnel` faz funcionar **em qualquer rede** (não precisa PC e celular na mesma Wi-Fi). Escaneie o QR no **Expo Go**. Primeiro carregamento é mais lento (baixa o bundle pela internet).

> Se `--tunnel` reclamar de dependência faltando, rode `npm install --save-dev @expo/ngrok` uma vez.

---

## Backend Supabase (só quando for MEXER no servidor)

Nada a instalar — é cloud. Referência:

- **Project ref:** `aymztftngjojdjnwkgyn`
- **Dashboard:** https://supabase.com/dashboard/project/aymztftngjojdjnwkgyn
- Estado atual: `mailer_autoconfirm` **ligado** (cadastro sem confirmação de e-mail) — bom pra testes, **desligar antes de produção** e configurar SMTP.

### Deploy de Edge Function (estratégia / vídeo)

Precisa de um **Personal Access Token** do Supabase (o usado no Windows foi revogado — gere um novo em https://supabase.com/dashboard/account/tokens):

```bash
export SUPABASE_ACCESS_TOKEN=sbp_...seu_token_novo...
npx supabase functions deploy generate-strategy --project-ref aymztftngjojdjnwkgyn
npx supabase functions deploy analyze-video     --project-ref aymztftngjojdjnwkgyn
```
Não precisa de Docker (bundling é feito pela API). O CLI já está no `devDependencies`.

### Migrations / mudanças de schema

Os arquivos ficam em `supabase/migrations/`. Já foram TODAS aplicadas no projeto atual. Se criar novas, aplique pelo **SQL Editor** do dashboard (cole o conteúdo) ou pela Management API. Ordem já aplicada:
- `2026...initial_schema.sql`
- `2026...add_slice_dropshot_smash.sql`
- `2026...admin_role_zeca.sql`
- `2026...ai_agent_config.sql`

### Segredos da Edge Function

`ANTHROPIC_API_KEY` já está configurado nos secrets do projeto (Edge Functions). Não precisa mexer a menos que troque a chave.

---

## Onde o trabalho parou

- App Expo SDK 54 + Supabase + NativeWind + Zustand
- **Fase 3 (vídeo) recém-concluída:** upload real de vídeo, extração de frames no cliente, análise por IA (Claude Vision) aplicando scores no perfil
- **Agente de IA** (área admin do Zeca): contexto único que baliza estratégia e vídeo — tabela `ai_agent_config`, lido pelas duas Edge Functions via service role
- Modelo Claude atual: `claude-sonnet-4-6`
- Pendências conhecidas: limitar tamanho/duração de vídeo no upload; permissão de galeria no `app.json` para build standalone; melhorar exibição de erro real das Edge Functions no app
