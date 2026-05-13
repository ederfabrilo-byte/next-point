import { createClient } from 'npm:@supabase/supabase-js@2';
import Anthropic from 'npm:@anthropic-ai/sdk';

async function sendPushNotification(pushToken: string, title: string, body: string, data?: Record<string, string>) {
  if (!pushToken.startsWith('ExponentPushToken')) return;
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: pushToken, title, body, data, sound: 'default' }),
  });
}

const VISION_PROMPT = `Você é um especialista em análise técnica de tênis. Analise estes frames de vídeo e retorne SOMENTE um objeto JSON válido com os atributos técnicos do jogador principal em cena.

Regras:
- Scores de 1.0 a 5.0, incrementos de 0.5
- Retorne null para atributos não observáveis nos frames
- Retorne APENAS o JSON, sem texto adicional

Formato obrigatório:
{"forehand":X,"backhand":X,"serve":X,"volley":X,"movement":X,"mental":X,"hand":"right|left","style":"aggressive|defensive|all-around"}`;

interface AnalysisResult {
  forehand: number | null;
  backhand: number | null;
  serve: number | null;
  volley: number | null;
  movement: number | null;
  mental: number | null;
  hand: 'right' | 'left' | null;
  style: 'aggressive' | 'defensive' | 'all-around' | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');

    // Cliente com auth do usuário (para validar permissões)
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader! } } }
    );

    // Cliente com service role (para acessar Storage e atualizar tabelas)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { video_id } = await req.json();
    if (!video_id) throw new Error('video_id é obrigatório');

    // 1. Busca o registro do vídeo (valida que pertence ao usuário autenticado)
    const { data: video, error: videoError } = await supabaseUser
      .from('videos')
      .select('id, player_id, target_type, opponent_id, storage_url, status')
      .eq('id', video_id)
      .eq('purpose', 'profile_analysis')
      .single();

    if (videoError || !video) throw new Error('Vídeo não encontrado ou sem permissão');
    if (video.status === 'analyzed') {
      return new Response(JSON.stringify({ message: 'Já analisado' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Lista frames no Storage: {user_id}/{video_id}/frames/frame_N.jpg
    const framesPath = `${video.player_id}/${video_id}/frames`;
    const { data: frameFiles, error: listError } = await supabaseAdmin.storage
      .from('videos')
      .list(framesPath, { sortBy: { column: 'name', order: 'asc' } });

    if (listError) throw new Error(`Erro ao listar frames: ${listError.message}`);
    if (!frameFiles || frameFiles.length === 0) throw new Error('Nenhum frame encontrado para análise');

    // 3. Baixa os frames e converte para base64
    const imageContents: Anthropic.ImageBlockParam[] = [];

    for (const file of frameFiles.slice(0, 12)) {
      const filePath = `${framesPath}/${file.name}`;
      const { data: fileData, error: downloadError } = await supabaseAdmin.storage
        .from('videos')
        .download(filePath);

      if (downloadError || !fileData) continue;

      const buffer = await fileData.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));

      imageContents.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/jpeg',
          data: base64,
        },
      });
    }

    if (imageContents.length === 0) throw new Error('Não foi possível carregar nenhum frame');

    // 4. Chama Claude Vision API
    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! });

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: [
            ...imageContents,
            { type: 'text', text: VISION_PROMPT },
          ],
        },
      ],
    });

    const rawText = message.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as Anthropic.TextBlock).text)
      .join('');

    // 5. Extrai e valida o JSON da resposta
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error(`Claude não retornou JSON válido: ${rawText}`);

    const result: AnalysisResult = JSON.parse(jsonMatch[0]);

    // Valida scores dentro do range 1.0–5.0
    const numericFields = ['forehand', 'backhand', 'serve', 'volley', 'movement', 'mental'] as const;
    for (const field of numericFields) {
      if (result[field] !== null && result[field] !== undefined) {
        const val = Number(result[field]);
        result[field] = Math.min(5.0, Math.max(1.0, Math.round(val * 2) / 2));
      }
    }

    // 6. Salva em video_analyses
    const { error: analysisError } = await supabaseAdmin.from('video_analyses').insert({
      video_id,
      forehand: result.forehand ?? null,
      backhand: result.backhand ?? null,
      serve: result.serve ?? null,
      volley: result.volley ?? null,
      movement: result.movement ?? null,
      mental: result.mental ?? null,
      hand: result.hand ?? null,
      style: result.style ?? null,
      raw_response: { text: rawText, frames_analyzed: imageContents.length },
      applied_at: new Date().toISOString(),
    });

    if (analysisError) throw new Error(`Erro ao salvar análise: ${analysisError.message}`);

    // 7. Atualiza player_profiles ou opponents com campos não-null
    const updates: Record<string, number | string> = {};
    for (const field of numericFields) {
      if (result[field] !== null && result[field] !== undefined) {
        updates[field] = result[field] as number;
      }
    }
    if (result.hand) updates.hand = result.hand;
    if (result.style) updates.style = result.style;

    if (Object.keys(updates).length > 0) {
      if (video.target_type === 'self') {
        await supabaseAdmin
          .from('player_profiles')
          .update(updates)
          .eq('user_id', video.player_id);
      } else if (video.target_type === 'opponent' && video.opponent_id) {
        await supabaseAdmin
          .from('opponents')
          .update(updates)
          .eq('id', video.opponent_id);
      }
    }

    // 8. Atualiza status do vídeo para 'analyzed'
    await supabaseAdmin
      .from('videos')
      .update({ status: 'analyzed' })
      .eq('id', video_id);

    // 9. Envia push notification ao jogador
    const { data: playerUser } = await supabaseAdmin
      .from('users')
      .select('push_token')
      .eq('id', video.player_id)
      .single();

    if (playerUser?.push_token) {
      const updatedCount = Object.keys(updates).length;
      await sendPushNotification(
        playerUser.push_token,
        '📹 Análise concluída!',
        `${updatedCount} atributo${updatedCount !== 1 ? 's' : ''} atualizado${updatedCount !== 1 ? 's' : ''} no seu perfil.`,
        { screen: '/(player)/videos' }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        frames_analyzed: imageContents.length,
        attributes_updated: Object.keys(updates),
        result,
      }),
      { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('analyze-video error:', message);

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
});
