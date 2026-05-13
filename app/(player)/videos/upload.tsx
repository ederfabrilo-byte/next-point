import { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView,
  Alert, ActivityIndicator, Image,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../lib/store';
import { Opponent } from '../../../lib/types';

const zecaPhoto = require('../../../assets/zeca-mota.jpg');

type Purpose = 'profile_analysis' | 'technical_review';
type TargetType = 'self' | 'opponent';

interface SelectedVideo {
  uri: string;
  duration?: number; // ms
  fileName?: string;
}

const FRAME_COUNT = 12;

export default function UploadScreen() {
  const { user } = useAuthStore();
  const [purpose, setPurpose] = useState<Purpose | null>(null);
  const [targetType, setTargetType] = useState<TargetType>('self');
  const [opponentId, setOpponentId] = useState<string | null>(null);
  const [opponents, setOpponents] = useState<Opponent[]>([]);
  const [description, setDescription] = useState('');
  const [video, setVideo] = useState<SelectedVideo | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  useFocusEffect(useCallback(() => {
    if (!user) return;
    supabase.from('opponents').select('*').eq('owner_id', user.id).order('name').then(({ data }) => {
      setOpponents(data ?? []);
    });
  }, [user]));

  async function pickVideo() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à sua galeria para selecionar o vídeo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'videos' as const,
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setVideo({
        uri: asset.uri,
        duration: asset.duration ?? undefined,
        fileName: asset.fileName ?? 'video.mp4',
      });
    }
  }

  async function extractFrames(videoUri: string, duration: number): Promise<string[]> {
    const frameUris: string[] = [];
    const step = duration / (FRAME_COUNT + 1);

    for (let i = 1; i <= FRAME_COUNT; i++) {
      try {
        const timeMs = Math.floor(step * i);
        const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
          time: timeMs,
          quality: 0.7,
        });
        frameUris.push(uri);
      } catch {
        // Frame não extraído nesse ponto — continua
      }
    }

    return frameUris;
  }

  async function uploadFileToStorage(fileUri: string, storagePath: string, mimeType: string): Promise<string> {
    const response = await fetch(fileUri);
    const blob = await response.blob();

    const { error } = await supabase.storage
      .from('videos')
      .upload(storagePath, blob, { contentType: mimeType, upsert: true });

    if (error) throw new Error(`Upload falhou: ${error.message}`);

    const { data } = supabase.storage.from('videos').getPublicUrl(storagePath);
    return data.publicUrl;
  }

  async function handleSubmit() {
    if (!purpose || !user) return;
    if (!video) {
      Alert.alert('Selecione um vídeo', 'Escolha um vídeo da galeria antes de enviar.');
      return;
    }
    if (targetType === 'opponent' && !opponentId) {
      Alert.alert('Selecione um adversário', 'Escolha o adversário para análise.');
      return;
    }

    setUploading(true);

    try {
      const videoId = crypto.randomUUID();
      const basePath = `${user.id}/${videoId}`;

      // 1. Upload do vídeo
      setUploadProgress('Enviando vídeo...');
      const ext = video.fileName?.split('.').pop() ?? 'mp4';
      const mimeType = ext === 'mov' ? 'video/quicktime' : 'video/mp4';
      const videoUrl = await uploadFileToStorage(video.uri, `${basePath}/video.${ext}`, mimeType);

      // 2. Extrai e faz upload dos frames (só para profile_analysis)
      let framesUploaded = 0;
      if (purpose === 'profile_analysis' && video.duration && video.duration > 0) {
        setUploadProgress('Extraindo frames...');
        const frameUris = await extractFrames(video.uri, video.duration);

        setUploadProgress(`Enviando frames (0/${frameUris.length})...`);
        for (let i = 0; i < frameUris.length; i++) {
          try {
            await uploadFileToStorage(frameUris[i], `${basePath}/frames/frame_${i}.jpg`, 'image/jpeg');
            framesUploaded++;
            setUploadProgress(`Enviando frames (${framesUploaded}/${frameUris.length})...`);
          } catch {
            // Frame individual ignorado
          }
        }
      }

      // 3. Cria registro no banco
      setUploadProgress('Registrando...');
      const { data: videoRecord, error: insertError } = await supabase
        .from('videos')
        .insert({
          id: videoId,
          player_id: user.id,
          purpose,
          target_type: targetType,
          opponent_id: targetType === 'opponent' ? opponentId : null,
          description: description.trim() || null,
          status: purpose === 'profile_analysis' ? 'processing' : 'pending_review',
          storage_url: videoUrl,
        })
        .select()
        .single();

      if (insertError) throw new Error(insertError.message);

      // 4. Dispara Edge Function de análise (profile_analysis)
      if (purpose === 'profile_analysis') {
        setUploadProgress('Iniciando análise IA...');
        const { error: fnError } = await supabase.functions.invoke('analyze-video', {
          body: { video_id: videoRecord.id },
        });
        // Erro na Edge Function não bloqueia o fluxo — análise pode rodar em background
        if (fnError) console.warn('analyze-video fn error:', fnError.message);
      }

      // 5. Navega para tela adequada
      if (purpose === 'profile_analysis') {
        router.replace({
          pathname: '/(player)/videos/analyzing',
          params: { video_id: videoRecord.id },
        });
      } else {
        router.replace('/(player)/videos');
      }
    } catch (err: any) {
      Alert.alert('Erro no envio', err.message ?? 'Tente novamente.');
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  }

  const durationLabel = video?.duration
    ? `${Math.round(video.duration / 1000)}s`
    : null;

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ paddingBottom: 40 }}>
      <View className="px-6 pt-16 pb-6 flex-row items-center gap-3">
        <TouchableOpacity onPress={() => router.back()} disabled={uploading}>
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
            disabled={uploading}
            className={`rounded-2xl border-2 border-dashed items-center justify-center py-8 gap-2
              ${video ? 'border-primary bg-surface' : 'border-border bg-surface'}`}
          >
            <Ionicons
              name={video ? 'checkmark-circle' : 'cloud-upload-outline'}
              size={36}
              color={video ? '#F97316' : '#9CA3AF'}
            />
            {video ? (
              <>
                <Text className="text-primary font-inter-bold text-sm">{video.fileName ?? 'Vídeo selecionado'}</Text>
                {durationLabel && (
                  <Text className="text-text-secondary font-inter text-xs">Duração: {durationLabel}</Text>
                )}
                <Text className="text-text-secondary font-inter text-xs">Toque para trocar</Text>
              </>
            ) : (
              <>
                <Text className="text-text-primary font-inter-bold text-sm">Selecionar da galeria</Text>
                <Text className="text-text-secondary font-inter text-xs">MP4, MOV até 500 MB</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Propósito */}
        <View>
          <Text className="text-text-secondary font-inter text-sm mb-3">Tipo de análise</Text>
          <View className="gap-3">
            <TouchableOpacity
              onPress={() => setPurpose('profile_analysis')}
              disabled={uploading}
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
              disabled={uploading}
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
              disabled={uploading}
              className={`flex-1 rounded-xl p-3 border items-center ${targetType === 'self' ? 'bg-primary border-primary' : 'bg-surface border-border'}`}
            >
              <Text className={`font-inter-bold text-sm ${targetType === 'self' ? 'text-black' : 'text-text-primary'}`}>Meu jogo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setTargetType('opponent')}
              disabled={uploading}
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
                    disabled={uploading}
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
            editable={!uploading}
            multiline
            numberOfLines={3}
            placeholder="Contexto do vídeo, aspectos a observar..."
            placeholderTextColor="#9CA3AF"
            textAlignVertical="top"
          />
        </View>

        {/* Progress */}
        {uploading && uploadProgress ? (
          <View className="bg-surface border border-border rounded-xl p-4 flex-row items-center gap-3">
            <ActivityIndicator color="#F97316" />
            <Text className="text-text-primary font-inter text-sm flex-1">{uploadProgress}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!purpose || !video || uploading}
          className={`rounded-xl h-14 items-center justify-center mt-2
            ${purpose && video && !uploading ? 'bg-primary' : 'bg-surface'}`}
        >
          {uploading
            ? <ActivityIndicator color="#F97316" />
            : <Text className={`font-inter-bold text-base ${purpose && video ? 'text-black' : 'text-text-secondary'}`}>
                Confirmar envio
              </Text>
          }
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
