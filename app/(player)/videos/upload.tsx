import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../lib/store';
import { Opponent } from '../../../lib/types';

const zecaPhoto = require('../../../assets/zeca-mota.jpg');

type Purpose = 'profile_analysis' | 'technical_review';
type TargetType = 'self' | 'opponent';

export default function UploadScreen() {
  const { user } = useAuthStore();
  const [purpose, setPurpose] = useState<Purpose | null>(null);
  const [targetType, setTargetType] = useState<TargetType>('self');
  const [opponentId, setOpponentId] = useState<string | null>(null);
  const [opponents, setOpponents] = useState<Opponent[]>([]);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useFocusEffect(useCallback(() => {
    if (!user) return;
    supabase.from('opponents').select('*').eq('owner_id', user.id).order('name').then(({ data }) => {
      setOpponents(data ?? []);
    });
  }, [user]));

  async function handleSubmit() {
    if (!purpose || !user) return;
    if (targetType === 'opponent' && !opponentId) {
      Alert.alert('Selecione um adversário', 'Escolha o adversário para análise.');
      return;
    }

    setSaving(true);
    const { error } = await supabase.from('videos').insert({
      player_id: user.id,
      purpose,
      target_type: targetType,
      opponent_id: targetType === 'opponent' ? opponentId : null,
      description: description.trim() || null,
      status: purpose === 'profile_analysis' ? 'processing' : 'pending_review',
      storage_url: 'pending',
    });
    setSaving(false);

    if (error) {
      Alert.alert('Erro', error.message);
      return;
    }

    if (purpose === 'profile_analysis') {
      router.replace('/(player)/videos/analyzing');
    } else {
      router.replace('/(player)/videos');
    }
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
          disabled={!purpose || saving}
          className={`rounded-xl h-14 items-center justify-center mt-2 ${purpose ? 'bg-primary' : 'bg-surface'}`}
        >
          {saving
            ? <ActivityIndicator color="#000" />
            : <Text className={`font-inter-bold text-base ${purpose ? 'text-black' : 'text-text-secondary'}`}>
                Confirmar envio
              </Text>
          }
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
