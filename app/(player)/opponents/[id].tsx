import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { Opponent, Strategy, AttributeKey, ATTRIBUTE_LABELS } from '../../../lib/types';
import AttributeSlider from '../../../components/AttributeSlider';

export default function OpponentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [opponent, setOpponent] = useState<Opponent | null>(null);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [aiFields, setAiFields] = useState<Set<AttributeKey>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [{ data: opp }, { data: strats }, { data: analysis }] = await Promise.all([
        supabase.from('opponents').select('*').eq('id', id).single(),
        supabase.from('strategies').select('*').eq('opponent_id', id).order('created_at', { ascending: false }),
        // Última análise de vídeo deste adversário
        supabase
          .from('video_analyses')
          .select('forehand, backhand, serve, volley, movement, mental, video_id, videos!inner(opponent_id, target_type)')
          .eq('videos.opponent_id', id)
          .eq('videos.target_type', 'opponent')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      setOpponent(opp);
      setStrategies(strats ?? []);
      if (analysis) {
        const aiSet = new Set<AttributeKey>();
        (['forehand', 'backhand', 'serve', 'volley', 'movement', 'mental'] as AttributeKey[]).forEach(k => {
          if ((analysis as any)[k] !== null) aiSet.add(k);
        });
        setAiFields(aiSet);
      }
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleDelete() {
    Alert.alert('Excluir adversário?', 'Todas as estratégias também serão removidas.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive',
        onPress: async () => {
          await supabase.from('opponents').delete().eq('id', id);
          router.back();
        },
      },
    ]);
  }

  if (loading) {
    return <View className="flex-1 bg-bg items-center justify-center"><ActivityIndicator color="#F97316" /></View>;
  }
  if (!opponent) {
    return <View className="flex-1 bg-bg items-center justify-center"><Text className="text-text-secondary">Adversário não encontrado.</Text></View>;
  }

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View className="px-6 pt-16 pb-4 flex-row items-center justify-between">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-primary font-inter text-sm">← Voltar</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDelete}>
          <Text className="text-red-400 font-inter text-sm">Excluir</Text>
        </TouchableOpacity>
      </View>

      <View className="px-6 pb-6">
        <Text className="text-text-primary font-inter-bold text-2xl">{opponent.name}</Text>
        <View className="flex-row gap-2 mt-2">
          {opponent.style && (
            <View className="bg-surface border border-border rounded-full px-3 py-1">
              <Text className="text-text-secondary font-inter text-xs capitalize">{opponent.style}</Text>
            </View>
          )}
          {opponent.hand && (
            <View className="bg-surface border border-border rounded-full px-3 py-1">
              <Text className="text-text-secondary font-inter text-xs">{opponent.hand === 'right' ? 'Direita' : 'Esquerda'}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Atributos */}
      <View className="px-6 mb-6">
        <Text className="text-text-secondary font-inter-semibold text-xs uppercase tracking-wider mb-4">Atributos</Text>
        {(Object.keys(ATTRIBUTE_LABELS) as AttributeKey[]).map((key) => (
          <AttributeSlider
            key={key}
            label={ATTRIBUTE_LABELS[key]}
            value={opponent[key] ?? null}
            readonly
            source={opponent[key] !== null ? (aiFields.has(key) ? 'ai' : 'manual') : null}
          />
        ))}
        {opponent.notes ? (
          <View className="bg-surface border border-border rounded-xl p-4 mt-2">
            <Text className="text-text-secondary font-inter text-sm">{opponent.notes}</Text>
          </View>
        ) : null}
      </View>

      {/* Gerar estratégia */}
      <View className="px-6 mb-6">
        <TouchableOpacity
          onPress={() => router.push({ pathname: '/(player)/strategy', params: { opponentId: id } })}
          className="bg-primary rounded-xl h-14 items-center justify-center"
        >
          <Text className="text-black font-inter-bold text-base">💡 Gerar estratégia</Text>
        </TouchableOpacity>
      </View>

      {/* Histórico de estratégias */}
      {strategies.length > 0 && (
        <View className="px-6">
          <Text className="text-text-secondary font-inter-semibold text-xs uppercase tracking-wider mb-4">Estratégias geradas</Text>
          {strategies.map((s) => (
            <TouchableOpacity
              key={s.id}
              onPress={() => router.push(`/(player)/strategy/${s.id}`)}
              className="bg-surface border border-border rounded-2xl p-4 mb-3 active:opacity-75"
            >
              <View className="flex-row items-center gap-2 mb-2">
                <View className="bg-ai-bg px-2 py-0.5 rounded-full">
                  <Text className="text-ai-text font-inter text-xs">IA</Text>
                </View>
                <Text className="text-text-secondary font-inter text-xs">
                  {new Date(s.created_at).toLocaleDateString('pt-BR')}
                </Text>
              </View>
              <Text className="text-text-primary font-inter text-sm" numberOfLines={2}>{s.content}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
