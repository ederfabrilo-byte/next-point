import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';

interface Video {
  id: string;
  purpose: string;
  target_type: string;
  description: string | null;
  storage_url: string;
  created_at: string;
  users: { name: string | null; email: string } | null;
  opponents: { name: string } | null;
}

export default function VideoReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [video, setVideo] = useState<Video | null>(null);
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from('videos')
      .select('*, users(name, email), opponents(name)')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        setVideo(data as Video);
        setFeedback(data?.feedback ?? '');
        setLoading(false);
      });
  }, [id]);

  async function handleSubmit() {
    if (!feedback.trim()) {
      Alert.alert('Feedback obrigatório', 'Escreva uma avaliação antes de enviar.');
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('videos')
      .update({ feedback: feedback.trim(), status: 'reviewed' })
      .eq('id', id);
    setSaving(false);
    if (error) {
      Alert.alert('Erro', error.message);
      return;
    }
    Alert.alert('Enviado!', 'Feedback enviado ao jogador.', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  }

  if (loading) {
    return <View className="flex-1 bg-bg items-center justify-center"><ActivityIndicator color="#F97316" /></View>;
  }

  if (!video) {
    return (
      <View className="flex-1 bg-bg items-center justify-center px-6">
        <Text className="text-text-secondary font-inter">Vídeo não encontrado.</Text>
      </View>
    );
  }

  const playerName = video.users?.name ?? video.users?.email?.split('@')[0] ?? 'Jogador';
  const target = video.target_type === 'self' ? 'próprio jogo' : `adversário: ${video.opponents?.name ?? '—'}`;

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ paddingBottom: 40 }}>
      <View className="px-6 pt-16 pb-6 flex-row items-center gap-3">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View>
          <Text className="text-text-primary font-inter-bold text-2xl">Avaliação Técnica</Text>
          <Text className="text-text-secondary font-inter text-sm">{playerName}</Text>
        </View>
      </View>

      <View className="px-6 gap-5">
        {/* Info do vídeo */}
        <View className="bg-surface border border-border rounded-2xl p-5">
          <View className="flex-row items-center gap-2 mb-3">
            <Ionicons name="videocam" size={18} color="#F97316" />
            <Text className="text-text-primary font-inter-bold text-base">Detalhes do vídeo</Text>
          </View>
          <View className="gap-2">
            <View className="flex-row justify-between">
              <Text className="text-text-secondary font-inter text-sm">Jogador</Text>
              <Text className="text-text-primary font-inter-semibold text-sm">{playerName}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-text-secondary font-inter text-sm">Alvo</Text>
              <Text className="text-text-primary font-inter-semibold text-sm capitalize">{target}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-text-secondary font-inter text-sm">Enviado em</Text>
              <Text className="text-text-primary font-inter-semibold text-sm">
                {new Date(video.created_at).toLocaleDateString('pt-BR')}
              </Text>
            </View>
          </View>
          {video.description ? (
            <View className="mt-3 pt-3 border-t border-border">
              <Text className="text-text-secondary font-inter text-xs mb-1">Descrição do jogador</Text>
              <Text className="text-text-primary font-inter text-sm">{video.description}</Text>
            </View>
          ) : null}
        </View>

        {/* Feedback */}
        <View>
          <Text className="text-text-secondary font-inter text-sm mb-2">Seu feedback</Text>
          <TextInput
            className="bg-surface border border-border rounded-xl px-4 py-4 text-text-primary font-inter"
            value={feedback}
            onChangeText={setFeedback}
            multiline
            numberOfLines={8}
            placeholder="Descreva sua avaliação técnica: pontos fortes, áreas de melhoria, exercícios recomendados..."
            placeholderTextColor="#9CA3AF"
            textAlignVertical="top"
            style={{ minHeight: 180 }}
          />
        </View>

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={saving}
          className="bg-primary rounded-xl h-14 items-center justify-center"
        >
          {saving
            ? <ActivityIndicator color="#000" />
            : <Text className="text-black font-inter-bold text-base">Enviar feedback</Text>
          }
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
