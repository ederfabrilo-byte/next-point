import { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useAuthStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { Role } from '../lib/types';

export default function SelectRoleScreen() {
  const { user, setRole } = useAuthStore();
  const [saving, setSaving] = useState(false);

  async function handleSelectRole(role: Role) {
    if (!user || saving) return;
    setSaving(true);
    const { error } = await supabase.from('users').upsert({ id: user.id, email: user.email, role });
    setSaving(false);
    if (error) {
      Alert.alert('Erro', error.message);
      return;
    }
    setRole(role);
  }

  return (
    <View className="flex-1 bg-bg justify-center px-6">
      <Text className="text-text-primary font-inter-bold text-3xl mb-2">Quem é você?</Text>
      <Text className="text-text-secondary font-inter text-base mb-10">
        Escolha seu perfil para continuar.
      </Text>

      {saving && (
        <View className="absolute inset-0 items-center justify-center">
          <ActivityIndicator color="#F97316" size="large" />
        </View>
      )}

      {/* Jogador */}
      <TouchableOpacity
        onPress={() => handleSelectRole('player')}
        disabled={saving}
        className="bg-surface border border-border rounded-2xl p-6 mb-4 active:opacity-80"
      >
        <Text className="text-3xl mb-3">🎾</Text>
        <Text className="text-text-primary font-inter-bold text-xl mb-1">Jogador</Text>
        <Text className="text-text-secondary font-inter text-sm leading-5">
          Cadastre adversários, gere estratégias com IA e envie vídeos para análise técnica.
        </Text>
      </TouchableOpacity>

      {/* Professor */}
      <TouchableOpacity
        onPress={() => handleSelectRole('teacher')}
        disabled={saving}
        className="bg-surface border border-border rounded-2xl p-6 active:opacity-80"
      >
        <Text className="text-3xl mb-3">🏫</Text>
        <Text className="text-text-primary font-inter-bold text-xl mb-1">Professor</Text>
        <Text className="text-text-secondary font-inter text-sm leading-5">
          Gerencie alunos, registre treinos e avalie vídeos técnicos com feedback personalizado.
        </Text>
      </TouchableOpacity>
    </View>
  );
}
