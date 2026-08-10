import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Share, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '../../../lib/supabase';
import { Strategy, Opponent } from '../../../lib/types';

export default function StrategyDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [opponent, setOpponent] = useState<Opponent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: s } = await supabase.from('strategies').select('*').eq('id', id).single();
      setStrategy(s);
      if (s?.opponent_id) {
        const { data: o } = await supabase.from('opponents').select('*').eq('id', s.opponent_id).single();
        setOpponent(o);
      }
      setLoading(false);
    }
    load();
  }, [id]);

  function exportText() {
    const header = opponent ? `Estratégia — vs ${opponent.name}\n\n` : 'Estratégia\n\n';
    return `${header}${strategy?.content ?? ''}\n\n— Gerado no Next Point`;
  }

  async function handleCopy() {
    await Clipboard.setStringAsync(exportText());
    Alert.alert('Copiado', 'Estratégia copiada para a área de transferência.');
  }

  async function handleShare() {
    try {
      await Share.share({ message: exportText() });
    } catch {
      // usuário cancelou — ignora
    }
  }

  if (loading) {
    return <View className="flex-1 bg-bg items-center justify-center"><ActivityIndicator color="#F97316" /></View>;
  }
  if (!strategy) {
    return <View className="flex-1 bg-bg items-center justify-center"><Text className="text-text-secondary">Estratégia não encontrada.</Text></View>;
  }

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ paddingBottom: 40 }}>
      <View className="px-6 pt-16 pb-4">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-primary font-inter text-sm">← Voltar</Text>
        </TouchableOpacity>
      </View>

      <View className="px-6 pb-6">
        <View className="flex-row items-center gap-2 mb-2">
          <View className="bg-ai-bg px-2 py-0.5 rounded-full">
            <Text className="text-ai-text font-inter text-xs">IA</Text>
          </View>
          <Text className="text-text-secondary font-inter text-xs">
            {new Date(strategy.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </Text>
        </View>
        {opponent && (
          <Text className="text-text-primary font-inter-bold text-2xl mb-1">vs {opponent.name}</Text>
        )}
        {opponent?.style && (
          <Text className="text-text-secondary font-inter text-sm capitalize mb-6">{opponent.style}</Text>
        )}

        <View className="bg-surface border border-border rounded-2xl p-5">
          <Text className="text-text-primary font-inter text-base leading-7">{strategy.content}</Text>
        </View>

        {/* Exportar */}
        <Text className="text-text-secondary font-inter text-sm mt-6 mb-2">Exportar</Text>
        <View className="flex-row gap-3">
          <TouchableOpacity
            onPress={handleCopy}
            className="flex-1 flex-row items-center justify-center gap-2 bg-surface border border-border rounded-xl h-14"
          >
            <Ionicons name="copy-outline" size={18} color="#F97316" />
            <Text className="text-text-primary font-inter-semibold text-base">Copiar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleShare}
            className="flex-1 flex-row items-center justify-center gap-2 bg-primary rounded-xl h-14"
          >
            <Ionicons name="share-outline" size={18} color="#000" />
            <Text className="text-black font-inter-bold text-base">Compartilhar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
