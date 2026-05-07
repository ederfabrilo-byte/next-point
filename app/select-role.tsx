import { View, Text, TouchableOpacity } from 'react-native';
import { useAuthStore } from '../lib/store';

export default function SelectRoleScreen() {
  const setRole = useAuthStore((s) => s.setRole);

  return (
    <View className="flex-1 bg-bg justify-center px-6">
      <Text className="text-text-primary font-inter-bold text-3xl mb-2">Quem é você?</Text>
      <Text className="text-text-secondary font-inter text-base mb-10">
        Escolha seu perfil para continuar.
      </Text>

      {/* Jogador */}
      <TouchableOpacity
        onPress={() => setRole('player')}
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
        onPress={() => setRole('teacher')}
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
