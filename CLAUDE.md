# NEXT POINT — Contexto do Projeto para Claude Code

> **Retomando o projeto?** Leia primeiro o `HANDOFF.md` — tem o estado atual exato,
> o que já está pronto, e os próximos passos. Depois volte aqui para a spec completa.

## O que é este projeto

App mobile de tênis chamado **Next Point**. Conecta jogadores e professores.
Plataforma: iOS + Android via React Native + Expo.
Desenvolvimento: vibe coding (você, Claude, gerando o código).

---

## Stack obrigatória

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React Native + Expo SDK 51 |
| Navegação | Expo Router (file-based) |
| Backend / DB | Supabase (auth + PostgreSQL + Storage) |
| IA — Estratégias | Claude API `claude-sonnet-4-6` |
| IA — Vídeo | Claude Vision API (mesma versão) |
| Extração de frames | FFmpeg via Supabase Edge Function |
| Estilos | NativeWind (Tailwind para React Native) |
| State management | Zustand |

**Nunca sugira trocar nenhum item desta stack sem aprovação explícita.**

---

## Identidade visual — aplicar em tudo

```
Background:        #0A0A0A  (preto)
Superfície/cards:  #1A1A1A  (cinza escuro)
Cor primária:      #F97316  (laranja)
Texto principal:   #FFFFFF
Texto secundário:  #9CA3AF
Fonte:             Inter
```

Botões de ação primária: fundo `#F97316`, texto preto, `font-weight: 700`.
Bordas sutis: `#333` ou `#374151`.
Badge de IA: fundo `#1e3a1e`, texto `#4ade80`.

---

## Perfis de usuário

### Jogador (`role: 'player'`)
- Cadastra próprio perfil com atributos técnicos (sliders 1–5)
- Cadastra adversários com os mesmos atributos
- Envia vídeos para análise de perfil (IA) ou avaliação técnica (professor)
- Gera estratégias de jogo via IA

### Professor (`role: 'teacher'`)
- Gerencia alunos e registra treinos
- Avalia vídeos técnicos e envia feedback
- **Prof. Zeca Mota** tem acesso exclusivo à tela de Configuração de IA

---

## Modelo de dados completo (Supabase)

### `users`
```sql
id uuid PK
email text
name text
role text CHECK (role IN ('player','teacher'))
avatar_url text
created_at timestamptz DEFAULT now()
```

### `player_profiles`
```sql
id uuid PK
user_id uuid FK → users
forehand numeric(3,1)
backhand numeric(3,1)
serve numeric(3,1)
volley numeric(3,1)
movement numeric(3,1)
mental numeric(3,1)
hand text CHECK (hand IN ('right','left'))
style text CHECK (style IN ('aggressive','defensive','all-around'))
notes text
updated_at timestamptz DEFAULT now()
```

### `opponents`
```sql
id uuid PK
owner_id uuid FK → users
name text
forehand numeric(3,1)
backhand numeric(3,1)
serve numeric(3,1)
volley numeric(3,1)
movement numeric(3,1)
mental numeric(3,1)
hand text CHECK (hand IN ('right','left'))
style text CHECK (style IN ('aggressive','defensive','all-around'))
notes text
created_at timestamptz DEFAULT now()
```

### `strategies`
```sql
id uuid PK
player_id uuid FK → users
opponent_id uuid FK → opponents
content text
created_at timestamptz DEFAULT now()
```

### `coach_config`
```sql
id uuid PK
coach_id uuid FK → users
system_prompt text
version int DEFAULT 1
updated_at timestamptz DEFAULT now()
```
> Apenas o registro mais recente (ORDER BY version DESC LIMIT 1) é usado na geração.

### `videos`
```sql
id uuid PK
player_id uuid FK → users
target_type text CHECK (target_type IN ('self','opponent'))
opponent_id uuid FK → opponents  -- nullable
purpose text CHECK (purpose IN ('profile_analysis','technical_review'))
storage_url text
description text
feedback text  -- apenas para technical_review
status text CHECK (status IN ('processing','analyzed','pending_review','reviewed'))
created_at timestamptz DEFAULT now()
```

### `video_analyses`
```sql
id uuid PK
video_id uuid FK → videos
forehand numeric(3,1)   -- nullable
backhand numeric(3,1)   -- nullable
serve numeric(3,1)      -- nullable
volley numeric(3,1)     -- nullable
movement numeric(3,1)   -- nullable
mental numeric(3,1)     -- nullable
hand text               -- nullable
style text              -- nullable
raw_response jsonb
applied_at timestamptz
created_at timestamptz DEFAULT now()
```

### `student_teacher`
```sql
teacher_id uuid FK → users
student_id uuid FK → users
created_at timestamptz DEFAULT now()
PRIMARY KEY (teacher_id, student_id)
```

### `training_logs`
```sql
id uuid PK
teacher_id uuid FK → users
student_id uuid FK → users
date date
notes text
drills_suggested text
created_at timestamptz DEFAULT now()
```

---

## Inventário de telas

### Área do Jogador
| Rota (Expo Router) | Tela |
|--------------------|------|
| `/` | Splash / Login |
| `/select-role` | Seleção de perfil (Jogador / Professor) |
| `/(player)/home` | Home com stats e atalhos |
| `/(player)/profile` | Meu Perfil com sliders |
| `/(player)/opponents` | Lista de adversários |
| `/(player)/opponents/new` | Novo adversário |
| `/(player)/opponents/[id]` | Detalhe + histórico de estratégias |
| `/(player)/strategy` | Gerar estratégia (seleciona adversário) |
| `/(player)/strategy/[id]` | Detalhe da estratégia gerada |
| `/(player)/videos` | Meus vídeos (lista com status) |
| `/(player)/videos/upload` | Upload: seleção de propósito + target |
| `/(player)/videos/analyzing` | Aguardando análise IA (progresso) |

### Área do Professor
| Rota (Expo Router) | Tela |
|--------------------|------|
| `/(teacher)/home` | Home com alunos + fila de vídeos |
| `/(teacher)/students/[id]` | Detalhe do aluno |
| `/(teacher)/training/new` | Novo registro de treino |
| `/(teacher)/videos` | Fila de vídeos técnicos pendentes |
| `/(teacher)/videos/[id]` | Avaliação de vídeo + campo de feedback |
| `/(teacher)/ai-config` | Config do system prompt (exclusivo Prof. Zeca) |

---

## Fluxo de geração de estratégia

**NUNCA chamar a Claude API diretamente do frontend.**

```
App → Edge Function `generate-strategy` → Claude API
```

A Edge Function:
1. Busca `coach_config` mais recente (ORDER BY version DESC LIMIT 1)
2. Monta user_message com atributos do jogador e adversário
3. Chama `POST https://api.anthropic.com/v1/messages`:
   - `model: "claude-sonnet-4-6"`
   - `system: coach_config.system_prompt`
   - `messages: [{ role: "user", content: user_message }]`
4. Salva resultado em `strategies`
5. Retorna ao app

---

## Fluxo de análise de vídeo por IA

**Dois propósitos — o jogador escolhe no upload:**

| `purpose` | Destino | Resultado |
|-----------|---------|-----------|
| `profile_analysis` | Claude Vision API | Scores JSON → atualiza `player_profiles` ou `opponents` |
| `technical_review` | Fila do Prof. Zeca | Feedback textual do professor |

**Pipeline técnico para `profile_analysis`:**

```
1. Upload vídeo → Supabase Storage
2. Edge Function `analyze-video` acionada:
   a. Baixa vídeo do Storage
   b. FFmpeg extrai ~12 frames distribuídos
   c. Frames → base64
   d. Claude Vision API: frames + prompt estruturado
   e. Retorno: JSON { forehand, backhand, serve, volley, movement, mental, hand, style }
   f. Campos null = atributo não observável (NÃO sobrescreve valor existente)
   g. Salva em video_analyses
   h. Atualiza player_profiles ou opponents (somente campos não-null)
   i. videos.status → 'analyzed'
3. Push notification: "Análise concluída"
4. Badge 📹 aparece nos atributos atualizados
```

**Prompt da Claude Vision (fixo):**
```
Analise os frames e retorne SOMENTE um JSON com scores 1.0–5.0.
Atributos não observáveis retornam null.
{"forehand":X,"backhand":X,"serve":X,"volley":X,"movement":X,"mental":X,"hand":"right|left","style":"aggressive|defensive|all-around"}
```

---

## Variáveis de ambiente

```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
ANTHROPIC_API_KEY=          # Edge Function apenas — nunca no app
```

---

## Regras de desenvolvimento

1. **API Key da Anthropic nunca no frontend.** Sempre via Edge Function.
2. **Campos null em video_analyses não sobrescrevem perfil.** Use `UPDATE ... WHERE valor IS NOT NULL`.
3. **coach_config sempre usa o registro mais recente** (ORDER BY version DESC LIMIT 1).
4. **Separação de navegação por role:** `/player/` e `/teacher/` são grupos distintos no Expo Router.
5. **Notificações push** via `expo-notifications` para: análise de vídeo concluída + feedback do professor disponível.
6. **Sliders de atributos:** escala 1.0 a 5.0, step 0.5, exibir valor numérico ao lado.
7. **Badge de origem dos scores:** 📹 = analisado por vídeo | ✎ = preenchido manualmente.

---

## Fase atual de desenvolvimento

Construir na ordem:

- [ ] **Fase 1** — Setup, auth, seleção de role, navegação base
- [ ] **Fase 2** — Perfil, adversários, geração de estratégia
- [ ] **Fase 3** — Upload de vídeo, análise IA, aplicação de scores
- [ ] **Fase 4** — Avaliação técnica pelo Prof. Zeca, notificações
- [ ] **Fase 5** — Área do professor, config de IA, registro de treinos
- [ ] **Fase 6** — Polimento visual, animações, testes iOS + Android

---

*Next Point MVP v1.1 — 06/05/2026*
