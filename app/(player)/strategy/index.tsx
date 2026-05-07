import { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../lib/store';
import { Opponent } from '../../../lib/types';

export default function StrategyScreen() {
  const { user } = useAuthStore();
  const { opponentId } = useLocalSearchParams<{ opponentId?: string }>();
  const [opponents, setOpponents] = useState<Opponent[]>([]);
  const [selected, setSelected] = useState<string | null>(opponentId ?? null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useFocusEffect(useCallback(() => {
    if (!user) return;
    supabase.from('opponents').select('*').eq('owner_id', user.id).order('created_at', { ascending: false })
      .then(({ data }) => { setOpponents(data ?? []); setLoading(false); });
  }, [user]));

  async function handleGenerate() {
    if (!selected || !user) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-strategy', {
        body: { opponent_id: selected, player_id: user.id },
      });
      if (error) throw error;
      router.push(`/(player)/strategy/${data.strategy_id}`);
    } catch (e: any) {
      Alert.alert('Erro', e.message ?? 'Não foi possível gerar a estratégia.');
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return <View className="flex-1 bg-bg items-center justify-center"><ActivityIndicator color="#F97316" /></View>;
  }

  return (
    <View className="flex-1 bg-bg">
      <View className="px-6 pt-16 pb-4">
        <Text className="text-text-primary font-inter-bold text-2xl">Estratégia</Text>
        <Text className="text-text-secondary font-inter text-sm mt-1">Selecione um adversário</Text>
      </View>

      {opponents.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-4xl mb-4">👥</Text>
          <Text className="text-text-primary font-inter-bold text-lg text-center">Nenhum adversário cadastrado</Text>
          <TouchableOpacity onPress={() => router.push('/(player)/opponents/new')} className="mt-4 bg-primary rounded-xl px-6 py-3">
            <Text className="text-black font-inter-bold">Cadastrar adversário</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={opponents}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 }}
            ItemSeparatorComponent={() => <View className="h-3" />}
            renderItem={({ item }) => {
              const isSelected = selected === item.id;
              return (
                <TouchableOpacity
                  onPress={() => setSelected(item.id)}
                  className={`rounded-2xl p-5 border ${isSelected ? 'bg-primary border-primary' : 'bg-surface border-border'} active:opacity-75`}
                >
                  <Text className={`font-inter-bold text-lg ${isSelected ? 'text-black' : 'text-text-primary'}`}>{item.name}</Text>
                  {item.style && (
                    <Text className={`font-inter text-sm mt-1 capitalize ${isSelected ? 'text-black' : 'text-text-secondary'}`}>{item.style}</Text>
                  )}
                </TouchableOpacity>
              );
            }}
          />

          <View className="absolute bottom-0 left-0 right-0 px-6 pb-8 bg-bg pt-4 border-t border-border">
            <TouchableOpacity
              onPress={handleGenerate}
              disabled={!selected || generating}
              className={`rounded-xl h-14 items-center justify-center ${selected ? 'bg-primary' : 'bg-surface'}`}
            >
              {generating
                ? <ActivityIndicator color="#000" />
                : (
                  <View className="flex-row items-center gap-2">
                    <Text className={`font-inter-bold text-base ${selected ? 'text-black' : 'text-text-secondary'}`}>
                      💡 Gerar estratégia
                    </Text>
                    <View className="bg-ai-bg px-2 py-0.5 rounded-full">
                      <Text className="text-ai-text font-inter text-xs">IA</Text>
                    </View>
                  </View>
                )
              }
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}
