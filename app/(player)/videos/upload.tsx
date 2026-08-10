import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../lib/store';
import { Opponent } from '../../../lib/types';

const zecaPhoto = require('../../../assets/zeca-mota.jpg');

type Purpose = 'profile_analysis' | 'technical_review';
type TargetType = 'self' | 'opponent';

const NUM_FRAMES = 6;

export default function UploadScreen() {
  const { user } = useAuthStore();
  const [purpose, setPurpose] = useState<Purpose | null>(null);
  const [targetType, setTargetType] = useState<TargetType>('self');
  const [opponentId, setOpponentId] = useState<string | null>(null);
  const [opponents, setOpponents] = useState<Opponent[]>([]);
  const [description, setDescription] = useState('');
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [thumb, setThumb] = useState<string | null>(null);
  const [stage, setStage] = useState<string>(''); // '' = idle, senão está processando

  useFocusEffect(useCallback(() => {
    if (!user) return;
    supabase.from('opponents').select('*').eq('owner_id', user.id).order('name').then(({ data }) => {
      setOpponents(data ?? []);
    });
  }, [user]));

  async function pickVideo() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permissão necessária', 'Autorize o acesso à galeria para escolher um vídeo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'videos',
      quality: 1,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setVideoUri(asset.uri);
    setVideoDuration(asset.duration ?? null);
    // preview: primeiro frame
    try {
      const { uri } = await VideoThumbnails.getThumbnailAsync(asset.uri, { time: 500, quality: 0.6 });
      setThumb(uri);
    } catch { setThumb(null); }
  }

  async function extractFrames(uri: string, durationMs: number | null): Promise<string[]> {
    // distribui os frames ao longo do vídeo (ou usa tempos fixos se duração desconhecida)
    const dur = durationMs && durationMs > 0 ? durationMs : 6000;
    const times = Array.from({ length: NUM_FRAMES }, (_, i) =>
      Math.floor((dur * (i + 1)) / (NUM_FRAMES + 1))
    );
    const frames: string[] = [];
    for (const t of times) {
      try {
        const { uri: frameUri } = await VideoThumbnails.getThumbnailAsync(uri, { time: t, quality: 0.5 });
        const b64 = await FileSystem.readAsStringAsync(frameUri, { encoding: 'base64' });
        frames.push(b64);
      } catch {
        // pula frame que falhar
      }
    }
    return frames;
  }

  async function uploadVideo(uri: string, userId: string): Promise<string> {
    const b64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
    const path = `${userId}/${Date.now()}.mp4`;
    const { error } = await supabase.storage.from('videos').upload(path, decode(b64), {
      contentType: 'video/mp4',
      upsert: false,
    });
    if (error) throw error;
    return supabase.storage.from('videos').getPublicUrl(path).data.publicUrl;
  }

  async function handleSubmit() {
    if (!purpose || !user) return;
    if (!videoUri) {
      Alert.alert('Selecione um vídeo', 'Escolha o vídeo que deseja enviar.');
      return;
    }
    if (targetType === 'opponent' && !opponentId) {
      Alert.alert('Selecione um adversário', 'Escolha o adversário para análise.');
      return;
    }

    try {
      setStage('Enviando vídeo...');
      const storageUrl = await uploadVideo(videoUri, user.id);

      setStage('Registrando...');
      const { data: video, error } = await supabase.from('videos').insert({
        player_id: user.id,
        purpose,
        target_type: targetType,
        opponent_id: targetType === 'opponent' ? opponentId : null,
        description: description.trim() || null,
        status: purpose === 'profile_analysis' ? 'processing' : 'pending_review',
        storage_url: storageUrl,
      }).select('id').single();
      if (error) throw error;

      if (purpose === 'profile_analysis') {
        setStage('Extraindo frames...');
        const frames = await extractFrames(videoUri, videoDuration);
        if (frames.length === 0) throw new Error('Não foi possível extrair frames do vídeo.');

        setStage('Analisando com IA...');
        const { error: fnErr } = await supabase.functions.invoke('analyze-video', {
          body: { video_id: video.id, frames },
        });
        if (fnErr) {
          // corpo do erro da função vem em context
          const detail = await fnErr.context?.json?.().catch(() => null);
          throw new Error(detail?.error ?? fnErr.message ?? 'Falha na análise.');
        }
        setStage('');
        Alert.alert('Análise concluída', 'Seus atributos foram atualizados a partir do vídeo.', [
          { text: 'Ver perfil', onPress: () => router.replace('/(player)/profile') },
          { text: 'OK', onPress: () => router.replace('/(player)/videos') },
        ]);
      } else {
        setStage('');
        Alert.alert('Enviado!', 'Vídeo enviado para o Prof. Zeca avaliar.', [
          { text: 'OK', onPress: () => router.replace('/(player)/videos') },
        ]);
      }
    } catch (e: any) {
      setStage('');
      Alert.alert('Erro', e.message ?? 'Não foi possível enviar o vídeo.');
    }
  }

  if (stage) {
    return (
      <View className="flex-1 bg-bg items-center justify-center px-6">
        <View className="bg-ai-bg rounded-full p-6 mb-6">
          <ActivityIndicator color="#4ade80" size="large" />
        </View>
        <Text className="text-text-primary font-inter-bold text-xl text-center mb-2">Processando</Text>
        <Text className="text-primary font-inter text-sm text-center">{stage}</Text>
        <Text className="text-text-secondary font-inter text-xs text-center mt-4">
          Não feche o app. Isso pode levar alguns segundos.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ paddingBottom: 40 }}>
      <View className="px-6 pt-16 pb-6 flex-row items-center gap-3">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View>
          <Text className="text-text-primary font-inter-bold text-2xl">Enviar Vídeo</Text>
          <Text className="text-text-secondary font-inter text-sm">Configure a análise</Text>
        </View>
      </View>

      <View className="px-6 gap-5">
        {/* Seleção de vídeo */}
        <View>
          <Text className="text-text-secondary font-inter text-sm mb-3">Vídeo</Text>
          <TouchableOpacity
            onPress={pickVideo}
            className="bg-surface border border-border rounded-2xl overflow-hidden active:opacity-80"
          >
            {thumb ? (
              <View>
                <Image source={{ uri: thumb }} style={{ width: '100%', height: 180 }} resizeMode="cover" />
                <View className="flex-row items-center justify-center gap-2 py-3">
                  <Ionicons name="checkmark-circle" size={18} color="#4ade80" />
                  <Text className="text-text-primary font-inter text-sm">Vídeo selecionado · toque para trocar</Text>
                </View>
              </View>
            ) : (
              <View className="items-center py-10">
                <Ionicons name="cloud-upload-outline" size={40} color="#F97316" />
                <Text className="text-text-primary font-inter-bold text-base mt-3">Selecionar vídeo</Text>
                <Text className="text-text-secondary font-inter text-xs mt-1">Da galeria do aparelho</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Propósito */}
        <View>
          <Text className="text-text-secondary font-inter text-sm mb-3">Tipo de análise</Text>
          <View className="gap-3">
            <TouchableOpacity
              onPress={() => setPurpose('profile_analysis')}
              className={`rounded-2xl p-4 border ${purpose === 'profile_analysis' ? 'bg-primary border-primary' : 'bg-surface border-border'}`}
            >
              <View className="flex-row items-center gap-3">
                <Ionicons name="analytics" size={22} color={purpose === 'profile_analysis' ? '#000' : '#F97316'} />
                <View className="flex-1">
                  <View className="flex-row items-center gap-2">
                    <Text className={`font-inter-bold text-base ${purpose === 'profile_analysis' ? 'text-black' : 'text-text-primary'}`}>
                      Análise de Perfil
                    </Text>
                    <View className="bg-ai-bg px-2 py-0.5 rounded-full">
                      <Text className="text-ai-text font-inter text-xs">IA</Text>
                    </View>
                  </View>
                  <Text className={`font-inter text-xs mt-0.5 ${purpose === 'profile_analysis' ? 'text-black' : 'text-text-secondary'}`}>
                    IA extrai atributos técnicos do vídeo automaticamente
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setPurpose('technical_review')}
              className={`rounded-2xl p-4 border ${purpose === 'technical_review' ? 'bg-primary border-primary' : 'bg-surface border-border'}`}
            >
              <View className="flex-row items-center gap-3">
                <Image
                  source={zecaPhoto}
                  style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: purpose === 'technical_review' ? '#000' : '#F97316' }}
                />
                <View className="flex-1">
                  <Text className={`font-inter-bold text-base ${purpose === 'technical_review' ? 'text-black' : 'text-text-primary'}`}>
                    Avaliação Técnica
                  </Text>
                  <Text className={`font-inter text-xs mt-0.5 ${purpose === 'technical_review' ? 'text-black' : 'text-text-secondary'}`}>
                    Prof. Zeca Mota revisa e envia feedback personalizado
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Alvo */}
        <View>
          <Text className="text-text-secondary font-inter text-sm mb-3">O vídeo é de</Text>
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={() => { setTargetType('self'); setOpponentId(null); }}
              className={`flex-1 rounded-xl p-3 border items-center ${targetType === 'self' ? 'bg-primary border-primary' : 'bg-surface border-border'}`}
            >
              <Text className={`font-inter-bold text-sm ${targetType === 'self' ? 'text-black' : 'text-text-primary'}`}>Meu jogo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setTargetType('opponent')}
              className={`flex-1 rounded-xl p-3 border items-center ${targetType === 'opponent' ? 'bg-primary border-primary' : 'bg-surface border-border'}`}
            >
              <Text className={`font-inter-bold text-sm ${targetType === 'opponent' ? 'text-black' : 'text-text-primary'}`}>Adversário</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Seleção de adversário */}
        {targetType === 'opponent' && (
          <View>
            <Text className="text-text-secondary font-inter text-sm mb-3">Qual adversário?</Text>
            {opponents.length === 0 ? (
              <View className="bg-surface border border-border rounded-xl p-4 items-center">
                <Text className="text-text-secondary font-inter text-sm">Nenhum adversário cadastrado</Text>
                <TouchableOpacity onPress={() => router.push('/(player)/opponents/new')} className="mt-2">
                  <Text className="text-primary font-inter-semibold text-sm">Cadastrar agora</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View className="gap-2">
                {opponents.map((op) => (
                  <TouchableOpacity
                    key={op.id}
                    onPress={() => setOpponentId(op.id)}
                    className={`rounded-xl p-3 border ${opponentId === op.id ? 'bg-primary border-primary' : 'bg-surface border-border'}`}
                  >
                    <Text className={`font-inter-bold ${opponentId === op.id ? 'text-black' : 'text-text-primary'}`}>{op.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Descrição */}
        <View>
          <Text className="text-text-secondary font-inter text-sm mb-2">Descrição (opcional)</Text>
          <TextInput
            className="bg-surface border border-border rounded-xl px-4 py-3 text-text-primary font-inter"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            placeholder="Contexto do vídeo, aspectos a observar..."
            placeholderTextColor="#9CA3AF"
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!purpose || !videoUri}
          className={`rounded-xl h-14 items-center justify-center mt-2 ${purpose && videoUri ? 'bg-primary' : 'bg-surface'}`}
        >
          <Text className={`font-inter-bold text-base ${purpose && videoUri ? 'text-black' : 'text-text-secondary'}`}>
            Confirmar envio
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
