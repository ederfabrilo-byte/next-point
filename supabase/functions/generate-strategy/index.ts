import { createClient } from 'npm:@supabase/supabase-js@2';
import Anthropic from 'npm:@anthropic-ai/sdk';

const DEFAULT_SYSTEM_PROMPT = `Você é um coach de tênis especializado em análise estratégica de alto nível.
Com base nos atributos técnicos do jogador e do adversário, elabore uma estratégia detalhada em português brasileiro.
Seja objetivo e prático. Cubra: padrões de jogo recomendados, pontos fracos do adversário a explorar, como neutralizar os pontos fortes dele, e dicas táticas concretas para cada situação de jogo.
Responda em texto corrido, sem usar markdown.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' } });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader! } } }
    );

    const { player_id, opponent_id } = await req.json();
    if (!player_id || !opponent_id) throw new Error('player_id e opponent_id são obrigatórios');

    // Busca dados do jogador e adversário em paralelo
    const [{ data: playerProfile }, { data: opponent }, { data: coachConfig }] = await Promise.all([
      supabase.from('player_profiles').select('*').eq('user_id', player_id).maybeSingle(),
      supabase.from('opponents').select('*').eq('id', opponent_id).single(),
      supabase.from('coach_config').select('system_prompt').order('version', { ascending: false }).limit(1).maybeSingle(),
    ]);

    if (!opponent) throw new Error('Adversário não encontrado');

    const systemPrompt = coachConfig?.system_prompt ?? DEFAULT_SYSTEM_PROMPT;

    const formatAttrs = (obj: Record<string, any>) => {
      const attrs = ['forehand', 'backhand', 'serve', 'volley', 'movement', 'mental'];
      const labels: Record<string, string> = { forehand: 'Forehand', backhand: 'Backhand', serve: 'Saque', volley: 'Voleio', movement: 'Movimentação', mental: 'Mental' };
      return attrs.map((k) => obj?.[k] != null ? `${labels[k]}: ${obj[k]}/5` : null).filter(Boolean).join(', ') || 'não informado';
    };

    const userMessage = `
JOGADOR:
- Atributos: ${formatAttrs(playerProfile ?? {})}
- Mão dominante: ${playerProfile?.hand === 'right' ? 'Direita' : playerProfile?.hand === 'left' ? 'Esquerda' : 'não informado'}
- Estilo: ${playerProfile?.style ?? 'não informado'}
- Notas: ${playerProfile?.notes ?? 'nenhuma'}

ADVERSÁRIO: ${opponent.name}
- Atributos: ${formatAttrs(opponent)}
- Mão dominante: ${opponent.hand === 'right' ? 'Direita' : opponent.hand === 'left' ? 'Esquerda' : 'não informado'}
- Estilo: ${opponent.style ?? 'não informado'}
- Notas: ${opponent.notes ?? 'nenhuma'}

Gere uma estratégia de jogo detalhada para enfrentar este adversário.
    `.trim();

    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    const content = message.content[0].type === 'text' ? message.content[0].text : '';

    const { data: strategy, error: insertError } = await supabase
      .from('strategies')
      .insert({ player_id, opponent_id, content })
      .select()
      .single();

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ strategy_id: strategy.id }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
});
