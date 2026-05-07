import { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

interface Video {
  id: string;
  purpose: 'profile_analysis' | 'technical_review';
  target_type: 'self' | 'opponent';
  status: string;
  description: string | null;
  created_at: string;
  users: { name: string | null; email: string } | null;
  opponents: { name: string } | null;
}

export default function TeacherVideos() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    supabase
      .from('videos')
      .select('*, users(name, email), opponents(name)')
      .eq('status', 'pending_review')
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setVideos((data as Video[]) ?? []);
        setLoading(false);
      });
  }, []));

  if (loading) {
    return <View className="flex-1 bg-bg items-center justify-center"><ActivityIndicator color="#F97316" /></View>;
  }

  return (
    <View className="flex-1 bg-bg">
      <View className="px-6 pt-16 pb-4">
        <Text className="text-text-primary font-inter-bold text-2xl">Fila de Vídeos</Text>
        <Text className="text-text-secondary font-inter text-sm mt-1">
          {videos.length === 0 ? 'Nenhum vídeo pendente' : `${videos.length} aguardando avaliação`}
        </Text>
      </View>

      {videos.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="checkmark-circle-outline" size={48} color="#4ade80" />
          <Text className="text-text-primary font-inter-bold text-lg text-center mt-4">Tudo em dia!</Text>
          <Text className="text-text-secondary font-inter text-sm text-center mt-2">
            Nenhum vídeo aguardando avaliação técnica.
          </Text>
        </View>
      ) : (
        <FlatList
          data={videos}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}
          ItemSeparatorComponent={() => <View className="h-3" />}
          renderItem={({ item }) => {
            const playerName = item.users?.name ?? item.users?.email?.split('@')[0] ?? 'Jogador';
            const target = item.target_type === 'self' ? 'próprio jogo' : `adversário: ${item.opponents?.name ?? '—'}`;
            return (
              <TouchableOpacity
                onPress={() => router.push(`/(teacher)/video-review/${item.id}`)}
                className="bg-surface border border-border rounded-2xl p-5 active:opacity-75"
              >
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-text-primary font-inter-bold text-base">{playerName}</Text>
                  <View className="bg-yellow-500/20 px-2 py-0.5 rounded-full">
                    <Text className="text-yellow-400 font-inter text-xs">Pendente</Text>
                  </View>
                </View>
                <Text className="text-text-secondary font-inter text-sm">Avaliação técnica — {target}</Text>
                {item.description ? (
                  <Text className="text-text-secondary font-inter text-xs mt-1" numberOfLines={2}>{item.description}</Text>
                ) : null}
                <View className="flex-row items-center justify-between mt-3">
                  <Text className="text-text-secondary font-inter text-xs">
                    {new Date(item.created_at).toLocaleDateString('pt-BR')}
                  </Text>
                  <View className="flex-row items-center gap-1">
                    <Text className="text-primary font-inter-semibold text-sm">Avaliar</Text>
                    <Ionicons name="chevron-forward" size={14} color="#F97316" />
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}
