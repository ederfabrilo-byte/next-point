# NEXT POINT — Contexto do Projeto para Claude Code

## O que é este projeto

App mobile de tênis chamado **Next Point**. Conecta jogadores e professores.
Plataforma: iOS + Android via React Native + Expo (managed workflow).
Desenvolvimento: vibe coding (você, Claude, gerando o código).

UI/textos em **português brasileiro**. Mantenha esse idioma em strings exibidas
ao usuário. Código (identificadores, comentários) em inglês ou português curto.

---

## Stack real (conforme `package.json`)

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Runtime | React + React Native | 19.1.0 / 0.81.5 |
| Plataforma | Expo SDK | ~54.0.33 |
| Navegação | Expo Router (file-based) | ~6.0.23 |
| Estilos | NativeWind (Tailwind RN) | ^4.2.3 |
| Estado | Zustand | ^5.0.13 |
| Backend / DB | Supabase JS | ^2.105.3 |
| IA — Estratégias | Claude Sonnet via Edge Function | `claude-sonnet-4-20250514` |
| IA — Vídeo | Claude Vision via Edge Function | `claude-sonnet-4-20250514` |
| Frames de vídeo | `expo-video-thumbnails` (client-side) | ~10.0.8 |
| Notificações | `expo-notifications` (Expo Push) | ~0.32.17 |
| Auth storage | `@react-native-async-storage/async-storage` | ^2.2.0 |
| Fontes | `@expo-google-fonts/inter` | ^0.4.2 |
| Sliders | `@react-native-community/slider` | 5.0.1 |
| Ícones | `@expo/vector-icons` (Ionicons) | ^15.1.1 |

`newArchEnabled: false` em `app.json` — manter desativado (várias libs ainda
dependem da arquitetura antiga, ver commit `bd44489`).
EAS Project ID: `3e292258-d710-4cbe-8778-b18a3a4c5663` (hardcoded em
`app/_layout.tsx:45` para `getExpoPushTokenAsync`).

**Nunca sugira trocar nenhum item desta stack sem aprovação explícita.**

---

## Comandos

```bash
npm start            # expo start (Metro)
npm run ios          # expo run:ios
npm run android      # expo run:android
npm run web          # expo start --web
```

Não há scripts de teste, lint ou type-check configurados — peça permissão
antes de adicioná-los. Para verificar tipos manualmente: `npx tsc --noEmit`.

`.npmrc` define `legacy-peer-deps=true`; `eas.json` também passa
`NPM_FLAGS=--legacy-peer-deps` em todos os profiles.

`/ios` e `/android` estão no `.gitignore` — managed workflow, EAS faz prebuild.
Não comite essas pastas.

---

## Identidade visual

```
Background:        #0A0A0A  (preto)
Superfície/cards:  #1A1A1A  (cinza escuro)
Cor primária:      #F97316  (laranja)
Texto principal:   #FFFFFF
Texto secundário:  #9CA3AF
Bordas sutis:      #333333 / #374151
Badge de IA:       fundo #1e3a1e, texto #4ade80
Fonte:             Inter (400/500/600/700)
```

Cores estão configuradas no `tailwind.config.js` como tokens semânticos:
`bg-bg`, `bg-surface`, `bg-primary`, `text-text-primary`, `text-text-secondary`,
`bg-ai-bg`, `text-ai-text`, `border-border`. Use NativeWind (`className`) para
layouts novos; inline `style={{}}` apenas para valores dinâmicos (cores
calculadas, larguras percentuais, etc.).

Botão primário: `bg-primary rounded-xl h-14`, texto preto `font-inter-bold`.
Badge IA padrão:
```tsx
<View className="bg-ai-bg px-2 py-0.5 rounded-full">
  <Text className="text-ai-text font-inter text-xs">IA</Text>
</View>
```

---

## Layout do código

```
.
├── app.json                  # config Expo + plugins (expo-router, expo-font, expo-notifications)
├── App.tsx                   # DEAD CODE — entry real é index.ts → expo-router
├── index.ts                  # import 'expo-router/entry'
├── babel.config.js           # babel-preset-expo + jsxImportSource: 'nativewind'
├── metro.config.js           # withNativeWind(input: './global.css')
├── global.css                # @tailwind base/components/utilities
├── tailwind.config.js        # tokens de cor e fonte
├── tsconfig.json             # strict: true; exclui supabase/functions (Deno)
├── eas.json                  # builds dev/preview/production
├── assets/                   # ícones + zeca-mota.jpg (foto do Prof.)
├── lib/
│   ├── supabase.ts           # cliente único; usa env EXPO_PUBLIC_SUPABASE_*
│   ├── store.ts              # Zustand: useAuthStore (session, user, role)
│   └── types.ts              # Role/Hand/Style + interfaces de tabela
├── components/
│   ├── AttributeSlider.tsx   # slider 1.0–5.0 step 0.5 com badge IA/manual
│   ├── HandStylePicker.tsx   # exporta HandPicker e StylePicker
│   └── AvatarPicker.tsx      # upload p/ Storage bucket "avatars"
├── app/                      # rotas Expo Router (file-based)
│   ├── _layout.tsx           # auth bootstrap + push registration + redirect por role
│   ├── index.tsx             # splash com seleção de perfil → /login
│   ├── login.tsx
│   ├── register.tsx          # cria auth user + upsert em public.users
│   ├── forgot-password.tsx   # supabase.auth.resetPasswordForEmail
│   ├── select-role.tsx       # fallback se users.role for null
│   ├── (player)/             # tabs do jogador
│   │   ├── _layout.tsx       # Tabs: home/profile/opponents/strategy/videos
│   │   ├── home.tsx
│   │   ├── profile.tsx
│   │   ├── opponents/        # index, new (modal), [id], match-result
│   │   ├── strategy/         # index (seleciona oponente), [id]
│   │   └── videos/           # index, upload, analyzing
│   └── (teacher)/            # tabs do professor
│       ├── _layout.tsx       # Tabs: home/videos/students/video-guidelines/ai-config
│       ├── home.tsx
│       ├── videos.tsx        # fila pending_review
│       ├── students.tsx
│       ├── students/new.tsx  # vincula aluno por e-mail
│       ├── student/[id].tsx  # perfil técnico + treinos
│       ├── video-review/[id].tsx
│       ├── video-guidelines.tsx
│       └── ai-config.tsx     # apenas Prof. Zeca pode editar
└── supabase/
    ├── migrations/           # 3 arquivos — VER DRIFT abaixo
    └── functions/            # generate-strategy, analyze-video (Deno + Anthropic SDK)
```

---

## Perfis de usuário

### Jogador (`role: 'player'`)
- Cadastra próprio perfil com atributos técnicos (sliders 1–5)
- Cadastra adversários com os mesmos atributos
- Registra partidas (H2H) em `match_results`
- Envia vídeos para análise de perfil (IA) ou avaliação técnica (professor)
- Gera estratégias de jogo via IA

### Professor (`role: 'teacher'`)
- Gerencia alunos (vincula por e-mail em `student_teacher`)
- Registra treinos em `training_logs`
- Avalia vídeos técnicos e envia feedback
- Edita diretrizes de análise de vídeo em `video_analysis_config`
- **Prof. Zeca Mota** (`zeca@nextpoint.app`) tem acesso exclusivo à tela
  `ai-config` (system prompt do coach). Gating é por **email**, não por role
  ou flag — ver `app/(teacher)/ai-config.tsx:7`.

---

## Modelo de dados (Supabase)

### ⚠️ Drift entre código e migrações

`supabase/migrations/` tem 3 arquivos que cobrem o schema base. Algumas
tabelas e colunas referenciadas pelo código **não estão em migrations** —
assume-se que foram aplicadas via Supabase Studio. Ao mexer no schema, crie
uma migração nova e mantenha a paridade.

Faltando em migrations (referenciado no código):
- `users`: colunas `phone`, `instagram`, `cpf`, `address` (escritas em `app/register.tsx`)
- `match_results` (lida/escrita em `app/(player)/opponents/[id].tsx` e `match-result.tsx`)
- `video_analysis_config` (lida/escrita em `app/(teacher)/video-guidelines.tsx`)
- `users.push_token` **está** na migration `20260508000002_push_token.sql` ✓

### `users` (auth.users → trigger `handle_new_user` cria a row)
```sql
id uuid PK references auth.users on delete cascade
email text not null
name text
role text CHECK (role IN ('player','teacher'))
avatar_url text
phone text          -- não está na migration base
instagram text      -- idem
cpf text            -- idem
address text        -- idem
push_token text     -- migration 20260508000002
created_at timestamptz DEFAULT now()
```
RLS: `auth.uid() = id` (own row).

### `player_profiles`
```sql
id uuid PK
user_id uuid FK → users
forehand|backhand|serve|volley|movement|mental numeric(3,1)
hand text CHECK (hand IN ('right','left'))
style text CHECK (style IN ('aggressive','defensive','all-around'))
notes text
updated_at timestamptz DEFAULT now()
```

### `opponents`
Mesmos atributos técnicos de `player_profiles`, mais `owner_id`, `name`,
`created_at`.

### `strategies`
```sql
id uuid PK
player_id uuid FK → users
opponent_id uuid FK → opponents
content text          -- texto corrido gerado pela Claude API
created_at timestamptz
```

### `coach_config`
```sql
id uuid PK
coach_id uuid FK → users
system_prompt text
version int DEFAULT 1
updated_at timestamptz
```
A Edge Function `generate-strategy` lê **somente o registro mais recente**:
`ORDER BY version DESC LIMIT 1`. Salvar uma nova versão = inserir nova linha
com `version + 1` (ver `app/(teacher)/ai-config.tsx:44`).

### `videos`
```sql
id uuid PK
player_id uuid FK → users
target_type text CHECK (target_type IN ('self','opponent'))
opponent_id uuid FK → opponents  -- nullable, ON DELETE SET NULL
purpose text CHECK (purpose IN ('profile_analysis','technical_review'))
storage_url text
description text
feedback text                    -- preenchido apenas em technical_review
status text CHECK (status IN ('processing','analyzed','pending_review','reviewed'))
created_at timestamptz
```
Fluxo de status:
- `profile_analysis` → upload cria `processing`, Edge Function muda p/ `analyzed`
- `technical_review` → upload cria `pending_review`, professor muda p/ `reviewed`

RLS: jogador vê os próprios; professor vê todos `purpose='technical_review'`.

### `video_analyses`
Resultado da Claude Vision. Mesmos campos numéricos + `hand`, `style`,
`raw_response jsonb`, `applied_at`. Campos `null` indicam que o atributo
não foi observável nos frames.

### `match_results` (não está em migration)
```sql
id uuid PK
player_id uuid FK → users
opponent_id uuid FK → opponents
player_sets int
opponent_sets int
date date
notes text
created_at timestamptz
```

### `video_analysis_config` (não está em migration)
```sql
teacher_id uuid PK FK → users
guidelines text                  -- JSON serializado em string
updated_at timestamptz
```
`guidelines` é um JSON com chaves: `geral`, `forehand`, `backhand`, `saque`,
`voleio`, `movimentacao`, `mental` (ver `app/(teacher)/video-guidelines.tsx:7`).

### `student_teacher`
Pivot (teacher_id, student_id) — PRIMARY KEY composta.

### `training_logs`
`teacher_id`, `student_id`, `date`, `notes`, `drills_suggested`.

### Storage buckets
- `avatars` (público) — foto do usuário em `avatars/{user_id}.{ext}`
- `videos` (privado, 500 MB max) — `{user_id}/{video_id}/video.{ext}` e
  `{user_id}/{video_id}/frames/frame_N.jpg`. MIMEs aceitos: mp4, quicktime,
  mpeg, webm, jpeg, png.

---

## Fluxos críticos

### Bootstrap de auth (`app/_layout.tsx`)
1. Carrega fontes Inter (não renderiza nada antes).
2. `supabase.auth.getSession()` + `onAuthStateChange`.
3. Lê `users.role` do banco para decidir destino.
4. Registra Expo push token e grava em `users.push_token` (silencioso em web).
5. Redireciona:
   - Sem sessão → `/`
   - Sem role → `/select-role`
   - role `player` → `/(player)/home`
   - role `teacher` → `/(teacher)/home`

Notification handler global está configurado no topo do arquivo
(banner + sound + badge). Há listener para deep-link via
`notification.data.screen`.

### Inventário de telas

#### Área do Jogador
| Rota | Tela |
|------|------|
| `/` | Splash com seleção player/teacher → `/login` |
| `/login`, `/register`, `/forgot-password` | Auth |
| `/select-role` | Fallback quando `users.role` é null |
| `/(player)/home` | Stats + atalhos |
| `/(player)/profile` | Sliders próprios |
| `/(player)/opponents` | Lista |
| `/(player)/opponents/new` | Modal |
| `/(player)/opponents/[id]` | Detalhe + H2H + estratégias |
| `/(player)/opponents/match-result` | Registro de partida |
| `/(player)/strategy` | Seleciona oponente |
| `/(player)/strategy/[id]` | Detalhe da estratégia |
| `/(player)/videos` | Lista com status |
| `/(player)/videos/upload` | Propósito + target + descrição |
| `/(player)/videos/analyzing` | Polling do status a cada 4s |

#### Área do Professor
| Rota | Tela |
|------|------|
| `/(teacher)/home` | Stats + atalhos |
| `/(teacher)/videos` | Fila `pending_review` |
| `/(teacher)/video-review/[id]` | Avaliação + feedback |
| `/(teacher)/students` | Lista |
| `/(teacher)/students/new` | Vincula aluno por e-mail |
| `/(teacher)/student/[id]` | Perfil técnico + log de treinos |
| `/(teacher)/video-guidelines` | Diretrizes de análise para IA |
| `/(teacher)/ai-config` | System prompt (exclusivo Prof. Zeca) |

### Geração de estratégia
**Nunca chame a Claude API direto do app.** Use a Edge Function.

```
App → supabase.functions.invoke('generate-strategy', { body: { player_id, opponent_id } })
    → Edge Function (supabase/functions/generate-strategy/index.ts)
      1. Lê player_profiles, opponents, coach_config (mais recente)
      2. Chama Anthropic SDK (model: claude-sonnet-4-20250514, max_tokens: 1024)
      3. INSERT em strategies, retorna { strategy_id }
    → App navega para /(player)/strategy/[id]
```

Fallback: se `coach_config` estiver vazio, usa `DEFAULT_SYSTEM_PROMPT` definido
na própria Edge Function (`supabase/functions/generate-strategy/index.ts:4`).

### Análise de vídeo (`profile_analysis`)
**Frames são extraídos no cliente** (não em Edge Function/FFmpeg — divergência
intencional do plano original). Pipeline:

```
1. Jogador escolhe vídeo da galeria (expo-image-picker)
2. expo-video-thumbnails extrai 12 frames distribuídos pela duração
3. Frames JPEG são enviados ao Storage em {user_id}/{video_id}/frames/frame_N.jpg
4. Vídeo é enviado para {user_id}/{video_id}/video.{ext}
5. INSERT em videos com status='processing'
6. supabase.functions.invoke('analyze-video', { body: { video_id } })
7. Edge Function (supabase/functions/analyze-video/index.ts):
   a. Lista frames no bucket via service role
   b. Baixa, converte para base64
   c. Chama Claude Vision (até 12 imagens + VISION_PROMPT fixo)
   d. Extrai JSON, valida range 1.0–5.0 com step 0.5
   e. INSERT em video_analyses (com raw_response)
   f. UPDATE em player_profiles OU opponents — APENAS campos não-null
   g. UPDATE videos.status='analyzed'
   h. Envia Expo push notification ao jogador
8. App fica em /(player)/videos/analyzing fazendo polling a cada 4s
9. Quando status='analyzed', redireciona para /(player)/videos
```

`VISION_PROMPT` fixo (em `supabase/functions/analyze-video/index.ts:13`):
```
Analise os frames e retorne SOMENTE um JSON com scores 1.0–5.0.
Atributos não observáveis retornam null.
{"forehand":X,"backhand":X,"serve":X,"volley":X,"movement":X,"mental":X,"hand":"right|left","style":"aggressive|defensive|all-around"}
```

### Avaliação técnica (`technical_review`)
1. Upload com `purpose='technical_review'` → `status='pending_review'`.
2. Aparece em `/(teacher)/videos` (lista filtrada).
3. Professor escreve `feedback` em `/(teacher)/video-review/[id]`.
4. UPDATE `videos.feedback` + `status='reviewed'`.
5. Push notification é enviada ao jogador via Expo Push API direto, sem Edge
   Function (ver `app/(teacher)/video-review/[id].tsx:52`).

### Diretrizes de análise (`video_analysis_config`)
Professor preenche guidelines por seção (geral, forehand, backhand, saque,
voleio, movimentação, mental). São salvas como JSON serializado em
`guidelines` (text). **Hoje a Edge Function `analyze-video` não lê
`video_analysis_config`** — a integração é pendente. O `VISION_PROMPT` ainda
é fixo.

---

## Variáveis de ambiente

```bash
# .env.local (cliente — acessível em runtime via process.env)
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=

# Edge Functions (Supabase Dashboard → Edge Functions → Secrets)
SUPABASE_URL=                # injetado automaticamente
SUPABASE_ANON_KEY=           # idem
SUPABASE_SERVICE_ROLE_KEY=   # idem
ANTHROPIC_API_KEY=           # configurar manualmente
```

Apenas `EXPO_PUBLIC_*` chega no bundle do app. `ANTHROPIC_API_KEY` **nunca**
entra no app.

---

## Convenções de código

1. **Componentes**: function components com TypeScript. `export default function Name() {}`.
2. **Estado**: prefira `useState` local; `useAuthStore` (Zustand) só para
   sessão/role/user.
3. **Estilos**: NativeWind (`className`) com tokens do `tailwind.config.js`.
   Inline `style={{...}}` apenas para casos dinâmicos.
4. **Navegação**: `router.push` / `router.replace` / `router.back` do
   `expo-router`. Rotas com grupos: `/(player)/home`, `/(teacher)/videos`.
5. **Refetch ao focar tela**: `useFocusEffect(useCallback(() => {...}, [deps]))`.
   Use em listas que mudam (vídeos, oponentes, fila).
6. **Sliders**: escala 1.0 a 5.0, step 0.5. `AttributeSlider` aceita `source`
   `'ai'` (📹), `'manual'` (✎), ou `null`.
7. **Fonte**: `font-inter`, `font-inter-medium`, `font-inter-semibold`,
   `font-inter-bold`. Defina sempre — fontes do sistema têm fallback feio.
8. **Strings de erro**: em português, mostre no UI via `Alert.alert` ou
   inline `<Text className="text-red-400">`. Não use `console.error` como
   única forma de reporte.
9. **Datas**: armazenar em `YYYY-MM-DD` (date) ou ISO timestamp; exibir com
   `toLocaleDateString('pt-BR')`.
10. **Service role no client**: NUNCA. Edge Functions usam service role
    apenas server-side (Deno).

---

## Regras de desenvolvimento

1. **API key da Anthropic nunca no frontend.** Sempre via Edge Function.
2. **Campos `null` em `video_analyses` não sobrescrevem perfil.** A Edge
   Function já filtra (`updates[field] = result[field]` só quando não-null).
3. **`coach_config` sempre usa o registro mais recente**
   (`ORDER BY version DESC LIMIT 1`).
4. **Separação de navegação por role**: `(player)/` e `(teacher)/` são grupos
   distintos. Não cruze rotas — o `_layout.tsx` redireciona com base em `role`.
5. **Notificações push** via `expo-notifications`:
   - Análise de vídeo concluída → enviado pela Edge Function `analyze-video`
   - Feedback do professor disponível → enviado pelo client em
     `video-review/[id].tsx`
   - O token só é gerado em dispositivos reais (web é skipped).
6. **Sliders de atributos**: escala 1.0 a 5.0, step 0.5, exibir valor numérico.
7. **Badge de origem dos scores**: 📹 = analisado por vídeo | ✎ = preenchido
   manualmente.
8. **Schema drift**: se alterar tabelas, crie migration nova em
   `supabase/migrations/{YYYYMMDDHHMMSS}_descricao.sql` (formato CLI). Não
   confie só no Studio.
9. **RLS é obrigatório** em qualquer tabela nova com dados de usuário.

---

## Fase atual de desenvolvimento

Status real conforme o código:

- [x] **Fase 1** — Setup, auth, seleção de role, navegação base
- [x] **Fase 2** — Perfil, adversários, geração de estratégia
- [x] **Fase 3** — Upload de vídeo, análise IA (Vision), aplicação de scores
- [x] **Fase 4** — Avaliação técnica pelo Prof. Zeca, notificações
- [x] **Fase 5** — Área do professor, config de IA, registro de treinos
- [ ] **Fase 6** — Polimento visual, animações, testes iOS + Android
- [ ] **Pendente**: Edge Function `analyze-video` consumir
  `video_analysis_config` para personalizar `VISION_PROMPT` por professor

---

## Pegadinhas conhecidas

- `App.tsx` na raiz é **dead code** — o entry real é `index.ts` →
  `expo-router/entry`. Não edite `App.tsx` esperando ver mudanças.
- `react-native-reanimated` está pinado em `^3.19.5` porque a v4 exige New
  Architecture (desativada). Não atualize sem testar.
- `tsconfig.json` exclui `supabase/functions` — essas rodam em Deno e têm
  tipos diferentes; não importe nada do app dentro delas.
- A trigger SQL `handle_new_user` insere automaticamente em `public.users`
  ao criar um auth user. `register.tsx` faz `upsert` em seguida para
  preencher os demais campos.
- Push notifications dependem do EAS Project ID hardcoded em
  `app/_layout.tsx:45` (`3e292258-d710-4cbe-8778-b18a3a4c5663`). Se o
  projeto Expo mudar, atualize ali.
- O fluxo de upload de vídeo é **lento** (12 thumbnails + upload de cada).
  Não promete progresso percentual exato — apenas frases (`Enviando vídeo...`,
  `Extraindo frames...`, `Enviando frames (X/Y)...`).
- `video_analysis_config` ainda **não** influencia a análise — só está sendo
  coletado. Avise antes de assumir que diretrizes mudam o output da IA.

---

*Next Point — atualizado conforme estado da branch
`claude/add-claude-documentation-YtqtV`.*
