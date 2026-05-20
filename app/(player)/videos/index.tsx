import { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../lib/store';
import VideoPlayer from '../../../components/VideoPlayer';

const zecaPhoto = require('../../../assets/zeca-mota.jpg');

interface Video {
  id: string;
  purpose: 'profile_analysis' | 'technical_review';
  target_type: 'self' | 'opponent';
  status: 'processing' | 'analyzed' | 'pending_review' | 'reviewed';
  description: string | null;
  feedback: string | null;
  storage_url: string;
  created_at: string;
  opponents?: { name: string } | null;
}

const STATUS_LABEL: Record<Video['status'], string> = {
  processing: 'Analisando...',
  analyzed: 'Analisado',
  pending_review: 'Aguardando Prof.',
  reviewed: 'Avaliado',
};

const STATUS_COLOR: Record<Video['status'], string> = {
  processing: '#F97316',
  analyzed: '#4ade80',
  pending_review: '#facc15',
  reviewed: '#4ade80',
};

export default function VideosScreen() {
  const { user } = useAuthStore();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    if (!user) return;
    supabase
      .from('videos')
      .select('*, opponents(name)')
      .eq('player_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setVideos((data as Video[]) ?? []);
        setLoading(false);
      });
  }, [user]));

  if (loading) {
    return <View className="flex-1 bg-bg items-center justify-center"><ActivityIndicator color="#F97316" /></View>;
  }

  return (
    <View className="flex-1 bg-bg">
      <View className="px-6 pt-16 pb-4 flex-row items-center justify-between">
        <View>
          <Text className="text-text-primary font-inter-bold text-2xl">Meus Vídeos</Text>
          <Text className="text-text-secondary font-inter text-sm mt-1">Análises e avaliações técnicas</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/(player)/videos/upload')}
          className="bg-primary rounded-xl px-4 py-2 flex-row items-center gap-2"
        >
          <Ionicons name="add" size={18} color="#000" />
          <Text className="text-black font-inter-bold text-sm">Enviar</Text>
        </TouchableOpacity>
      </View>

      {videos.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="videocam-outline" size={48} color="#9CA3AF" />
          <Text className="text-text-primary font-inter-bold text-lg text-center mt-4">Nenhum vídeo enviado</Text>
          <Text className="text-text-secondary font-inter text-sm text-center mt-2">
            Envie um vídeo para análise de perfil pela IA ou avaliação técnica pelo professor.
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(player)/videos/upload')}
            className="mt-6 bg-primary rounded-xl px-6 py-3"
          >
            <Text className="text-black font-inter-bold">Enviar primeiro vídeo</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={videos}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}
          ItemSeparatorComponent={() => <View className="h-3" />}
          renderItem={({ item }) => {
            const expanded = expandedId === item.id;
            return (
            <View className="bg-surface border border-border rounded-2xl p-4">
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center gap-2">
                  <Ionicons
                    name={item.purpose === 'profile_analysis' ? 'analytics-outline' : 'school-outline'}
                    size={18}
                    color="#F97316"
                  />
                  <Text className="text-text-primary font-inter-bold text-sm">
                    {item.purpose === 'profile_analysis' ? 'Análise de Perfil' : 'Avaliação Técnica'}
                  </Text>
                </View>
                <View style={{ backgroundColor: STATUS_COLOR[item.status] + '22' }} className="px-2 py-0.5 rounded-full">
                  <Text style={{ color: STATUS_COLOR[item.status] }} className="font-inter text-xs">
                    {STATUS_LABEL[item.status]}
                  </Text>
                </View>
              </View>

              <Text className="text-text-secondary font-inter text-xs">
                {item.target_type === 'self' ? 'Meu jogo' : `Adversário: ${item.opponents?.name ?? '—'}`}
              </Text>
              {item.description ? (
                <Text className="text-text-secondary font-inter text-xs mt-1" numberOfLines={2}>{item.description}</Text>
              ) : null}
              <Text className="text-text-secondary font-inter text-xs mt-2">
                {new Date(item.created_at).toLocaleDateString('pt-BR')}
              </Text>

              {/* Player do vídeo */}
              <TouchableOpacity
                onPress={() => setExpandedId(expanded ? null : item.id)}
                className="mt-3 flex-row items-center gap-2"
              >
                <Ionicons name={expanded ? 'chevron-up' : 'play-circle'} size={18} color="#F97316" />
                <Text className="text-primary font-inter-semibold text-sm">
                  {expanded ? 'Ocultar vídeo' : 'Assistir vídeo'}
                </Text>
              </TouchableOpacity>
              {expanded && (
                <View className="mt-3">
                  <VideoPlayer url={item.storage_url} />
                </View>
              )}

              {/* Feedback do Prof. Zeca */}
              {item.purpose === 'technical_review' && item.status === 'reviewed' && item.feedback && (
                <View className="mt-3 pt-3 border-t border-border">
                  <View className="flex-row items-center gap-2 mb-2">
                    <Image
                      source={zecaPhoto}
                      style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: '#F97316' }}
                    />
                    <Text className="text-primary font-inter-semibold text-xs">Feedback — Prof. Zeca Mota</Text>
                  </View>
                  <Text className="text-text-primary font-inter text-sm leading-5">{item.feedback}</Text>
                </View>
              )}

              {/* Aguardando avaliação */}
              {item.purpose === 'technical_review' && item.status === 'pending_review' && (
                <View className="mt-3 pt-3 border-t border-border flex-row items-center gap-2">
                  <Image
                    source={zecaPhoto}
                    style={{ width: 24, height: 24, borderRadius: 12, opacity: 0.6 }}
                  />
                  <Text className="text-text-secondary font-inter text-xs">Aguardando avaliação do Prof. Zeca</Text>
                </View>
              )}
            </View>
            );
          }}
        />
      )}
    </View>
  );
}
