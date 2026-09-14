import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { supabase } from '../../../lib/supabase';
import { getVideoSignedUrl } from '../../../lib/storage';
import { useAuthStore } from '../../../lib/store';
import { notify } from '../../../lib/notifications';

interface ReviewVideo {
  id: string;
  player_id: string;
  purpose: string;
  target_type: string;
  description: string | null;
  feedback: string | null;
  status: string;
  storage_url: string | null;
  created_at: string;
  users: { name: string | null; username: string | null } | null;
  opponents: { name: string } | null;
}

export default function VideoReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, profile } = useAuthStore();
  const [video, setVideo] = useState<ReviewVideo | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // O player aceita null e fica ocioso até a URL assinada chegar.
  const player = useVideoPlayer(signedUrl, (p) => { p.loop = false; });

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('videos')
        .select('*, users!player_id(name, username), opponents(name)')
        .eq('id', id)
        .single();

      const row = data as ReviewVideo | null;
      setVideo(row);
      setFeedback(row?.feedback ?? '');
      if (row?.storage_url) setSignedUrl(await getVideoSignedUrl(row.storage_url));
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleSubmit() {
    if (!video || !user) return;
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
    if (error) { Alert.alert('Erro', error.message); return; }

    await notify({
      userId: video.player_id,
      type: 'feedback_ready',
      title: 'Avaliação pronta',
      body: `${profile?.name?.trim() || 'Seu professor'} avaliou seu vídeo.`,
      data: { video_id: video.id },
    });

    Alert.alert('Enviado!', 'Feedback enviado ao aluno.', [{ text: 'OK', onPress: () => router.back() }]);
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

  const playerName = video.users?.name?.trim() || video.users?.username || 'Aluno';
  const target = video.target_type === 'self' ? 'jogo do aluno' : `adversário: ${video.opponents?.name ?? '—'}`;

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
        {/* Player */}
        <View className="bg-surface border border-border rounded-2xl overflow-hidden">
          {signedUrl ? (
            <VideoView
              player={player}
              style={{ width: '100%', height: 220, backgroundColor: '#000' }}
              allowsFullscreen
              contentFit="contain"
            />
          ) : (
            <View className="items-center py-12">
              <Ionicons name="videocam-off-outline" size={36} color="#9CA3AF" />
              <Text className="text-text-secondary font-inter text-sm mt-3 text-center px-6">
                Não foi possível carregar o vídeo.
              </Text>
            </View>
          )}
        </View>

        {/* Info */}
        <View className="bg-surface border border-border rounded-2xl p-5">
          <View className="gap-2">
            <View className="flex-row justify-between">
              <Text className="text-text-secondary font-inter text-sm">Aluno</Text>
              <Text className="text-text-primary font-inter-semibold text-sm">{playerName}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-text-secondary font-inter text-sm">Conteúdo</Text>
              <Text className="text-text-primary font-inter-semibold text-sm">{target}</Text>
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
              <Text className="text-text-secondary font-inter text-xs mb-1">Descrição do aluno</Text>
              <Text className="text-text-primary font-inter text-sm">{video.description}</Text>
            </View>
          ) : null}
        </View>

        {/* Feedback */}
        <View>
          <Text className="text-text-secondary font-inter text-sm mb-2">
            {video.status === 'reviewed' ? 'Sua avaliação' : 'Seu feedback'}
          </Text>
          <TextInput
            className="bg-surface border border-border rounded-xl px-4 py-4 text-text-primary font-inter"
            value={feedback}
            onChangeText={setFeedback}
            multiline
            placeholder="Pontos fortes, o que corrigir, exercícios recomendados..."
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
            : (
              <Text className="text-black font-inter-bold text-base">
                {video.status === 'reviewed' ? 'Atualizar feedback' : 'Enviar feedback'}
              </Text>
            )
          }
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
