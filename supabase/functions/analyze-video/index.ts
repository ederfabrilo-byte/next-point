import { createClient } from 'npm:@supabase/supabase-js@2';
import Anthropic from 'npm:@anthropic-ai/sdk';

// Atributos técnicos avaliados (alinhados com lib/types.ts ATTRIBUTE_LABELS)
const ATTRS = ['forehand', 'backhand', 'slice', 'serve', 'volley', 'smash', 'dropshot', 'movement', 'mental'];

const BASE_INSTRUCTION = `Você analisa frames de um jogador de tênis e retorna SOMENTE um objeto JSON, sem texto adicional e sem markdown.
Notas de 1.0 a 5.0 (passo 0.5). Atributos que NÃO forem observáveis nos frames devem vir como null (não invente).
Formato exato:
{"forehand":X,"backhand":X,"slice":X,"serve":X,"volley":X,"smash":X,"dropshot":X,"movement":X,"mental":X,"hand":"right"|"left"|null,"style":"aggressive"|"defensive"|"all-around"|null}`;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey',
};

function extractJson(text: string): any {
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('IA não retornou JSON válido');
  return JSON.parse(cleaned.slice(start, end + 1));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  try {
    const { video_id, frames } = await req.json();
    if (!video_id) throw new Error('video_id é obrigatório');
    if (!Array.isArray(frames) || frames.length === 0) {
      throw new Error('frames é obrigatório (array de imagens base64 ou URLs)');
    }

    // Service role: função de servidor confiável (lê Agente + vídeo, aplica scores)
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const [{ data: video, error: vErr }, { data: agent }] = await Promise.all([
      admin.from('videos').select('*').eq('id', video_id).single(),
      admin.from('ai_agent_config').select('base_context, video_guidance').order('updated_at', { ascending: false }).limit(1).maybeSingle(),
    ]);
    if (vErr || !video) throw new Error('Vídeo não encontrado');

    // System prompt = contexto base do Agente + orientação de vídeo do Zeca + instrução fixa
    const systemPrompt = [agent?.base_context, agent?.video_guidance, BASE_INSTRUCTION]
      .filter((s) => s && String(s).trim())
      .join('\n\n');

    // Monta o conteúdo com as imagens
    const imageBlocks = frames.map((f: string) => {
      if (typeof f === 'string' && f.startsWith('http')) {
        return { type: 'image', source: { type: 'url', url: f } };
      }
      const data = typeof f === 'string' && f.includes(',') ? f.split(',')[1] : f; // remove prefixo data: se houver
      return { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data } };
    });

    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: [
          ...imageBlocks,
          { type: 'text', text: `Analise estes ${frames.length} frames e retorne o JSON com as notas. ${video.description ? 'Contexto do jogador: ' + video.description : ''}` },
        ],
      }],
    });

    const raw = message.content[0].type === 'text' ? message.content[0].text : '';
    const scores = extractJson(raw);

    // Só campos numéricos válidos (não-null) entram nos updates
    const cleanAttrs: Record<string, number> = {};
    for (const k of ATTRS) {
      const v = scores[k];
      if (typeof v === 'number' && !Number.isNaN(v)) cleanAttrs[k] = v;
    }
    const hand = scores.hand === 'right' || scores.hand === 'left' ? scores.hand : null;
    const style = ['aggressive', 'defensive', 'all-around'].includes(scores.style) ? scores.style : null;

    // Grava a análise (histórico)
    await admin.from('video_analyses').insert({
      video_id,
      ...cleanAttrs,
      hand,
      style,
      raw_response: scores,
      applied_at: new Date().toISOString(),
    });

    // Aplica os scores no alvo (só campos não-null NÃO sobrescrevem com null)
    const patch: Record<string, any> = { ...cleanAttrs };
    if (hand) patch.hand = hand;
    if (style) patch.style = style;

    if (Object.keys(patch).length > 0) {
      if (video.target_type === 'self') {
        patch.updated_at = new Date().toISOString();
        await admin.from('player_profiles').update(patch).eq('user_id', video.player_id);
      } else if (video.target_type === 'opponent' && video.opponent_id) {
        await admin.from('opponents').update(patch).eq('id', video.opponent_id);
      }
    }

    await admin.from('videos').update({ status: 'analyzed' }).eq('id', video_id);

    return new Response(JSON.stringify({ ok: true, scores }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
