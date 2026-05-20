import { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../lib/store';
import { Opponent } from '../../../lib/types';
import FadeInView from '../../../components/FadeInView';

export default function OpponentsList() {
  const { user } = useAuthStore();
  const [opponents, setOpponents] = useState<Opponent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('opponents')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });
    setOpponents(data ?? []);
    setLoading(false);
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) {
    return <View className="flex-1 bg-bg items-center justify-center"><ActivityIndicator color="#F97316" /></View>;
  }

  return (
    <View className="flex-1 bg-bg">
      <View className="px-6 pt-16 pb-4 flex-row items-center justify-between">
        <Text className="text-text-primary font-inter-bold text-2xl">Adversários</Text>
        <TouchableOpacity
          onPress={() => router.push('/(player)/opponents/new')}
          className="bg-primary rounded-xl px-4 py-2"
        >
          <Text className="text-black font-inter-bold text-sm">+ Novo</Text>
        </TouchableOpacity>
      </View>

      {opponents.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-4xl mb-4">👥</Text>
          <Text className="text-text-primary font-inter-bold text-lg text-center">Nenhum adversário ainda</Text>
          <Text className="text-text-secondary font-inter text-sm text-center mt-2">
            Cadastre adversários para gerar estratégias personalizadas
          </Text>
        </View>
      ) : (
        <FlatList
          data={opponents}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}
          ItemSeparatorComponent={() => <View className="h-3" />}
          renderItem={({ item, index }) => (
            <FadeInView index={index}>
            <TouchableOpacity
              onPress={() => router.push(`/(player)/opponents/${item.id}`)}
              className="bg-surface border border-border rounded-2xl p-5 active:opacity-75"
            >
              <Text className="text-text-primary font-inter-bold text-lg">{item.name}</Text>
              <View className="flex-row gap-3 mt-2">
                {item.style && (
                  <View className="bg-bg border border-border rounded-full px-3 py-1">
                    <Text className="text-text-secondary font-inter text-xs capitalize">{item.style}</Text>
                  </View>
                )}
                {item.hand && (
                  <View className="bg-bg border border-border rounded-full px-3 py-1">
                    <Text className="text-text-secondary font-inter text-xs">{item.hand === 'right' ? 'Direita' : 'Esquerda'}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
            </FadeInView>
          )}
        />
      )}
    </View>
  );
}
