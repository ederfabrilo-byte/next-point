import { supabase } from './supabase';
import { AttributeKey, ATTRIBUTE_LABELS } from './types';

type Target = { playerId: string } | { opponentId: string };

/**
 * Atributos preenchidos pela última análise de vídeo do alvo — é o que alimenta
 * o badge 📹 (nota veio da IA) contra o ✎ (preenchida à mão).
 *
 * `video_analyses` guarda null no atributo que a IA não conseguiu observar, e
 * esses não sobrescrevem o perfil. Então "tem valor aqui" é exatamente
 * "esta nota veio do vídeo".
 */
export async function aiTouchedAttributes(target: Target): Promise<Set<AttributeKey>> {
  let query = supabase
    .from('video_analyses')
    .select('*, videos!inner(player_id, opponent_id, target_type)')
    .order('created_at', { ascending: false })
    .limit(1);

  query = 'playerId' in target
    ? query.eq('videos.player_id', target.playerId).eq('videos.target_type', 'self')
    : query.eq('videos.opponent_id', target.opponentId);

  const { data } = await query.maybeSingle();

  const touched = new Set<AttributeKey>();
  if (!data) return touched;

  const row = data as Record<string, unknown>;
  for (const key of Object.keys(ATTRIBUTE_LABELS) as AttributeKey[]) {
    if (row[key] != null) touched.add(key);
  }
  return touched;
}
