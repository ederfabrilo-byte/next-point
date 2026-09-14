import { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router, useFocusEffect, useSegments } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

interface QueueVideo {
  id: string;
  target_type: 'self' | 'opponent';
  status: string;
  description: string | null;
  created_at: string;
  users: { name: string | null; username: string | null } | null;
}

/**
 * Fila de avaliação do professor.
 *
 * A RLS já limita a vídeos de alunos vinculados com `reviewer = 'teacher'` —
 * o filtro aqui é para a tela, não para a segurança.
 */
export default function TeacherVideoQueue() {
  const group = useSegments()[0] ?? '(teacher)';
  const [videos, setVideos] = useState<QueueVideo[]>([]);
  const [done, setDone] = useState<QueueVideo[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('videos')
      .select('id, target_type, status, description, created_at, users!player_id(name, username)')
      .eq('purpose', 'technical_review')
      .eq('reviewer', 'teacher')
      .order('created_at', { ascending: true });

    const rows = (data as unknown as QueueVideo[]) ?? [];
    setVideos(rows.filter((v) => v.status === 'pending_review'));
    setDone(rows.filter((v) => v.status === 'reviewed').reverse());
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) {
    return <View className="flex-1 bg-bg items-center justify-center"><ActivityIndicator color="#F97316" /></View>;
  }

  const card = (item: QueueVideo, pending: boolean) => {
    const who = item.users?.name?.trim() || item.users?.username || 'Aluno';
    return (
      <TouchableOpacity
        onPress={() => router.push(`/${group}/video-review/${item.id}`)}
        className="bg-surface border border-border rounded-2xl p-5 active:opacity-75"
      >
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-text-primary font-inter-bold text-base">{who}</Text>
          <View className={`px-2 py-0.5 rounded-full ${pending ? 'bg-yellow-500/20' : 'bg-green-500/20'}`}>
            <Text className={`font-inter text-xs ${pending ? 'text-yellow-400' : 'text-green-400'}`}>
              {pending ? 'Pendente' : 'Avaliado'}
            </Text>
          </View>
        </View>
        <Text className="text-text-secondary font-inter text-sm">
          {item.target_type === 'self' ? 'Jogo do aluno' : 'Vídeo de adversário'}
        </Text>
        {item.description ? (
          <Text className="text-text-secondary font-inter text-xs mt-1" numberOfLines={2}>{item.description}</Text>
        ) : null}
        <View className="flex-row items-center justify-between mt-3">
          <Text className="text-text-secondary font-inter text-xs">
            {new Date(item.created_at).toLocaleDateString('pt-BR')}
          </Text>
          <View className="flex-row items-center gap-1">
            <Text className="text-primary font-inter-semibold text-sm">{pending ? 'Avaliar' : 'Ver'}</Text>
            <Ionicons name="chevron-forward" size={14} color="#F97316" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1 bg-bg">
      <View className="px-6 pt-16 pb-4">
        <Text className="text-text-primary font-inter-bold text-2xl">Vídeos</Text>
        <Text className="text-text-secondary font-inter text-sm mt-1">
          {videos.length === 0 ? 'Nenhum vídeo aguardando' : `${videos.length} aguardando avaliação`}
        </Text>
      </View>

      <FlatList
        data={videos}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32, flexGrow: 1 }}
        ItemSeparatorComponent={() => <View className="h-3" />}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center px-6">
            <Ionicons name="checkmark-circle-outline" size={48} color="#4ade80" />
            <Text className="text-text-primary font-inter-bold text-lg text-center mt-4">Tudo em dia!</Text>
            <Text className="text-text-secondary font-inter text-sm text-center mt-2">
              Quando um aluno seu enviar um vídeo para avaliação, ele aparece aqui.
            </Text>
          </View>
        }
        renderItem={({ item }) => card(item, true)}
        ListFooterComponent={
          done.length > 0 ? (
            <View className="mt-8">
              <Text className="text-text-secondary font-inter-semibold text-xs uppercase tracking-wider mb-3">
                Já avaliados
              </Text>
              <View className="gap-3">{done.map((v) => <View key={v.id}>{card(v, false)}</View>)}</View>
            </View>
          ) : null
        }
      />
    </View>
  );
}
