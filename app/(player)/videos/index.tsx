import { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { toVideoPath, removeVideoFrames } from '../../../lib/storage';
import { notify } from '../../../lib/notifications';
import { useAuthStore } from '../../../lib/store';
import { AttributeKey, ATTRIBUTE_LABELS } from '../../../lib/types';

type Status = 'processing' | 'analyzed' | 'pending_review' | 'reviewed' | 'failed';

interface Analysis {
  id: string;
  created_at: string;
  [key: string]: unknown;
}

interface Video {
  id: string;
  purpose: 'profile_analysis' | 'technical_review';
  target_type: 'self' | 'opponent';
  status: Status;
  description: string | null;
  feedback: string | null;
  storage_url: string | null;
  created_at: string;
  opponents?: { name: string } | null;
  video_analyses?: Analysis[] | null;
}

const STATUS_LABEL: Record<Status, string> = {
  processing: 'Analisando...',
  analyzed: 'Analisado',
  pending_review: 'Aguardando Prof.',
  reviewed: 'Avaliado',
  failed: 'Falhou',
};

const STATUS_COLOR: Record<Status, string> = {
  processing: '#F97316',
  analyzed: '#4ade80',
  pending_review: '#facc15',
  reviewed: '#4ade80',
  failed: '#f87171',
};

export default function VideosScreen() {
  const { user, profile } = useAuthStore();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('videos')
      .select('*, opponents(name), video_analyses(*)')
      .eq('player_id', user.id)
      .order('created_at', { ascending: false });
    setVideos((data as Video[]) ?? []);
    setLoading(false);
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const [reanalyzing, setReanalyzing] = useState<string | null>(null);

  /**
   * "Reavaliar" num vídeo do professor = pedir outra avaliação humana: volta
   * para a fila do professor vinculado e avisa. O feedback antigo fica na
   * linha até ele escrever o novo (a tela só mostra feedback em `reviewed`).
   */
  function handleRequestReview(video: Video) {
    Alert.alert('Pedir nova avaliação?', 'O vídeo volta para a fila do seu professor, que recebe um aviso.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Pedir',
        onPress: async () => {
          if (!user) return;
          setReanalyzing(video.id);
          try {
            const { data: link } = await supabase
              .from('student_teacher')
              .select('teacher_id')
              .eq('student_id', user.id)
              .eq('status', 'accepted')
              .maybeSingle();
            if (!link) throw new Error('Você não tem um professor vinculado no momento.');
            const { error } = await supabase.from('videos').update({ status: 'pending_review' }).eq('id', video.id);
            if (error) throw error;
            await notify({
              userId: link.teacher_id,
              type: 'video_submitted',
              title: 'Pedido de nova avaliação',
              body: `${profile?.name?.trim() || 'Seu aluno'} pediu uma nova avaliação de um vídeo.`,
              data: { video_id: video.id },
            });
          } catch (e: any) {
            Alert.alert('Não foi possível pedir', e.message);
          } finally {
            setReanalyzing(null);
            await load();
          }
        },
      },
    ]);
  }

  /**
   * Roda a IA de novo sobre os frames guardados no envio. Serve para quando a
   * primeira análise saiu incompleta/errada ou o Agente do Zeca ganhou contexto
   * novo. Gera outra linha em video_analyses (histórico) e um parecer novo.
   */
  function handleReanalyze(video: Video) {
    Alert.alert('Reavaliar vídeo?', 'A IA analisa de novo com o contexto atual do Agente. As notas e o parecer serão substituídos.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Reavaliar',
        onPress: async () => {
          if (!user) return;
          setReanalyzing(video.id);
          setVideos((prev) => prev.map((v) => (v.id === video.id ? { ...v, status: 'processing' } : v)));
          try {
            const { error } = await supabase.functions.invoke('analyze-video', { body: { video_id: video.id } });
            if (error) {
              const detail = await (error as any).context?.json?.().catch(() => null);
              throw new Error(detail?.error ?? error.message ?? 'Falha na reavaliação.');
            }
            await notify({
              userId: user.id,
              type: 'video_analyzed',
              title: 'Reavaliação concluída',
              body: 'O Prof. Zeca Mota (IA) reavaliou seu vídeo e atualizou seus atributos.',
              data: { video_id: video.id },
            });
          } catch (e: any) {
            Alert.alert('Não foi possível reavaliar', e.message);
          } finally {
            setReanalyzing(null);
            await load();
          }
        },
      },
    ]);
  }

  function handleDelete(video: Video) {
    Alert.alert('Excluir vídeo?', 'O arquivo e a análise vinculada são removidos.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          // Storage primeiro: se a linha sumir antes, o path se perde e o
          // arquivo fica órfão no bucket.
          if (video.storage_url) {
            await supabase.storage.from('videos').remove([toVideoPath(video.storage_url)]);
          }
          if (user) await removeVideoFrames(user.id, video.id);
          const { error } = await supabase.from('videos').delete().eq('id', video.id);
          if (error) { Alert.alert('Erro', error.message); return; }
          await load();
        },
      },
    ]);
  }

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
            const analysis = [...(item.video_analyses ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
            const scored = analysis
              ? (Object.keys(ATTRIBUTE_LABELS) as AttributeKey[])
                  .filter((k) => analysis[k] != null)
                  .map((k) => `${ATTRIBUTE_LABELS[k]} ${Number(analysis[k]).toFixed(1)}`)
              : [];

            return (
              <View className="bg-surface border border-border rounded-2xl p-4">
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center gap-2 flex-1">
                    <Ionicons
                      name={item.purpose === 'profile_analysis' ? 'analytics-outline' : 'school-outline'}
                      size={18}
                      color="#F97316"
                    />
                    <Text className="text-text-primary font-inter-bold text-sm">
                      {item.purpose === 'profile_analysis' ? 'Prof. Zeca Mota (IA)' : 'Avaliação do Professor'}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <View style={{ backgroundColor: STATUS_COLOR[item.status] + '22' }} className="px-2 py-0.5 rounded-full">
                      <Text style={{ color: STATUS_COLOR[item.status] }} className="font-inter text-xs">
                        {STATUS_LABEL[item.status]}
                      </Text>
                    </View>
                    {((item.purpose === 'profile_analysis' && (item.status === 'analyzed' || item.status === 'failed')) ||
                      (item.purpose === 'technical_review' && item.status === 'reviewed')) && (
                      <TouchableOpacity
                        onPress={() => (item.purpose === 'profile_analysis' ? handleReanalyze(item) : handleRequestReview(item))}
                        disabled={reanalyzing !== null}
                        hitSlop={10}
                        className="flex-row items-center gap-1"
                      >
                        {reanalyzing === item.id
                          ? <ActivityIndicator size="small" color="#F97316" />
                          : <Ionicons name="refresh-outline" size={16} color="#F97316" />}
                        <Text className="text-primary font-inter-semibold text-xs">Reavaliar</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={10}>
                      <Ionicons name="trash-outline" size={16} color="#9CA3AF" />
                    </TouchableOpacity>
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

                {/* Falha na análise */}
                {item.status === 'failed' && (
                  <View className="mt-3 pt-3 border-t border-border flex-row items-start gap-2">
                    <Ionicons name="alert-circle-outline" size={16} color="#f87171" />
                    <Text className="text-text-secondary font-inter text-xs flex-1">
                      A análise não foi concluída. Toque em Reavaliar; se falhar de novo, exclua e envie um clipe mais curto.
                    </Text>
                  </View>
                )}

                {/* Notas que a IA aplicou */}
                {scored.length > 0 && (
                  <View className="mt-3 pt-3 border-t border-border">
                    <View className="flex-row items-center gap-2 mb-2">
                      <View className="bg-ai-bg px-2 py-0.5 rounded-full">
                        <Text className="text-ai-text font-inter text-xs">IA</Text>
                      </View>
                      <Text className="text-text-secondary font-inter text-xs">Notas aplicadas ao perfil</Text>
                    </View>
                    <Text className="text-text-primary font-inter text-xs leading-5">{scored.join(' · ')}</Text>
                  </View>
                )}

                {/* Parecer: do professor (reviewed) ou da IA com o contexto do Zeca (analyzed) */}
                {item.feedback && (
                  (item.purpose === 'technical_review' && item.status === 'reviewed') ||
                  (item.purpose === 'profile_analysis' && item.status === 'analyzed')
                ) && (
                  <View className="mt-3 pt-3 border-t border-border">
                    <View className="flex-row items-center gap-2 mb-2">
                      <Ionicons name="chatbubble-ellipses" size={16} color="#F97316" />
                      <Text className="text-primary font-inter-semibold text-xs">
                        {item.purpose === 'profile_analysis' ? 'Avaliação do Prof. Zeca Mota (IA)' : 'Feedback do professor'}
                      </Text>
                    </View>
                    <Text className="text-text-primary font-inter text-sm leading-5">{item.feedback}</Text>
                  </View>
                )}

                {/* Aguardando avaliação */}
                {item.purpose === 'technical_review' && item.status === 'pending_review' && (
                  <View className="mt-3 pt-3 border-t border-border flex-row items-center gap-2">
                    <Ionicons name="hourglass-outline" size={16} color="#9CA3AF" />
                    <Text className="text-text-secondary font-inter text-xs">Aguardando avaliação do seu professor</Text>
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
