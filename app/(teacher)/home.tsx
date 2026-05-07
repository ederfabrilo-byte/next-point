import { View, Text, TouchableOpacity } from 'react-native';
import { useAuthStore } from '../../lib/store';
import { supabase } from '../../lib/supabase';

export default function TeacherHome() {
  const { user, reset } = useAuthStore();

  async function handleSignOut() {
    await supabase.auth.signOut();
    reset();
  }

  return (
    <View className="flex-1 bg-bg px-6 pt-16">
      <View className="flex-row items-center justify-between mb-8">
        <View>
          <Text className="text-text-secondary font-inter text-sm">Professor</Text>
          <Text className="text-text-primary font-inter-bold text-2xl">{user?.email?.split('@')[0]}</Text>
        </View>
        <TouchableOpacity onPress={handleSignOut} className="bg-surface border border-border rounded-xl px-4 py-2">
          <Text className="text-text-secondary font-inter text-sm">Sair</Text>
        </TouchableOpacity>
      </View>

      <View className="gap-3">
        <View className="bg-surface border border-border rounded-2xl p-5">
          <Text className="text-text-secondary font-inter text-xs mb-1">EM BREVE</Text>
          <Text className="text-text-primary font-inter-bold text-lg">Alunos</Text>
          <Text className="text-text-secondary font-inter text-sm mt-1">Gerencie sua turma</Text>
        </View>
        <View className="bg-surface border border-border rounded-2xl p-5">
          <Text className="text-text-secondary font-inter text-xs mb-1">EM BREVE</Text>
          <Text className="text-text-primary font-inter-bold text-lg">Treinos</Text>
          <Text className="text-text-secondary font-inter text-sm mt-1">Registre sessões e exercícios</Text>
        </View>
        <View className="bg-surface border border-border rounded-2xl p-5">
          <Text className="text-text-secondary font-inter text-xs mb-1">EM BREVE</Text>
          <Text className="text-text-primary font-inter-bold text-lg">Fila de Vídeos</Text>
          <Text className="text-text-secondary font-inter text-sm mt-1">Avaliações técnicas pendentes</Text>
        </View>
      </View>
    </View>
  );
}
