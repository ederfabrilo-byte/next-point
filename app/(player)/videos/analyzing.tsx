import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';

type VideoStatus = 'processing' | 'analyzed' | 'pending_review' | 'reviewed';

export default function AnalyzingScreen() {
  const { video_id } = useLocalSearchParams<{ video_id: string }>();
  const [status, setStatus] = useState<VideoStatus>('processing');
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Polling do status do vídeo a cada 4 segundos
  useEffect(() => {
    if (!video_id) {
      // Sem video_id: aguarda 5s e vai para lista (fallback legado)
      const t = setTimeout(() => router.replace('/(player)/videos'), 5000);
      return () => clearTimeout(t);
    }

    let cancelled = false;

    async function checkStatus() {
      const { data, error: err } = await supabase
        .from('videos')
        .select('status')
        .eq('id', video_id)
        .single();

      if (cancelled) return;

      if (err) {
        setError('Erro ao verificar status.');
        return;
      }

      const s = data?.status as VideoStatus;
      setStatus(s);

      if (s === 'analyzed') {
        // Análise concluída — navega para lista
        setTimeout(() => {
          if (!cancelled) router.replace('/(player)/videos');
        }, 1500);
      }
    }

    // Primeira checagem imediata
    checkStatus();

    // Polling a cada 4s
    const interval = setInterval(() => {
      setElapsed((e) => e + 4);
      checkStatus();
    }, 4000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [video_id]);

  const isDone = status === 'analyzed';
  const isUploaded = true; // já chegou aqui, vídeo foi enviado
  const isProcessing = status === 'processing';

  function formatTime(s: number) {
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m${s % 60}s`;
  }

  return (
    <View className="flex-1 bg-bg items-center justify-center px-6">
      <View className={`rounded-full p-6 mb-6 ${isDone ? 'bg-ai-bg' : 'bg-surface border border-border'}`}>
        {isDone
          ? <Ionicons name="checkmark-circle" size={48} color="#4ade80" />
          : <Ionicons name="analytics" size={48} color="#F97316" />
        }
      </View>

      <Text className="text-text-primary font-inter-bold text-2xl text-center mb-2">
        {isDone ? 'Análise concluída!' : 'Analisando vídeo'}
      </Text>
      <Text className="text-text-secondary font-inter text-sm text-center mb-8">
        {isDone
          ? 'Seus atributos foram atualizados. Redirecionando...'
          : 'Nossa IA está extraindo seus atributos técnicos. Aguarde.'}
      </Text>

      {/* Steps */}
      <View className="bg-surface border border-border rounded-2xl p-5 w-full mb-6">
        {/* Step 1 */}
        <View className="flex-row items-center gap-3 mb-4">
          <Ionicons name="checkmark-circle" size={20} color="#4ade80" />
          <View className="flex-1">
            <Text className="text-text-primary font-inter-semibold text-sm">Vídeo enviado</Text>
          </View>
        </View>

        {/* Step 2 */}
        <View className="flex-row items-center gap-3 mb-4">
          <Ionicons name="checkmark-circle" size={20} color="#4ade80" />
          <View className="flex-1">
            <Text className="text-text-primary font-inter-semibold text-sm">Frames extraídos</Text>
          </View>
        </View>

        {/* Step 3 */}
        <View className="flex-row items-center gap-3 mb-4">
          {isDone
            ? <Ionicons name="checkmark-circle" size={20} color="#4ade80" />
            : isProcessing
              ? <ActivityIndicator size="small" color="#F97316" />
              : <Ionicons name="time-outline" size={20} color="#9CA3AF" />
          }
          <View className="flex-1">
            <Text className={`font-inter-semibold text-sm ${isDone ? 'text-text-primary' : isProcessing ? 'text-primary' : 'text-text-secondary'}`}>
              {isDone ? 'Claude Vision processou' : 'Claude Vision analisando...'}
            </Text>
          </View>
        </View>

        {/* Step 4 */}
        <View className="flex-row items-center gap-3">
          {isDone
            ? <Ionicons name="checkmark-circle" size={20} color="#4ade80" />
            : <Ionicons name="time-outline" size={20} color="#9CA3AF" />
          }
          <View className="flex-1">
            <Text className={`font-inter-semibold text-sm ${isDone ? 'text-text-primary' : 'text-text-secondary'}`}>
              Perfil atualizado
            </Text>
          </View>
        </View>
      </View>

      {/* Tempo decorrido */}
      {!isDone && elapsed > 0 && (
        <Text className="text-text-secondary font-inter text-xs mb-4">
          Tempo: {formatTime(elapsed)} • Verificando a cada 4s
        </Text>
      )}

      {/* Erro */}
      {error && (
        <View className="bg-red-900/30 border border-red-800 rounded-xl p-3 w-full mb-4">
          <Text className="text-red-400 font-inter text-sm text-center">{error}</Text>
        </View>
      )}

      <TouchableOpacity
        onPress={() => router.replace('/(player)/videos')}
        className="mt-2"
      >
        <Text className="text-text-secondary font-inter text-sm">Ver todos os vídeos</Text>
      </TouchableOpacity>
    </View>
  );
}
