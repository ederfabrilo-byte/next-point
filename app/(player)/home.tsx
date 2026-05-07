import { View, Text, TouchableOpacity } from 'react-native';
import { useAuthStore } from '../../lib/store';
import { supabase } from '../../lib/supabase';

export default function PlayerHome() {
  const { user, reset } = useAuthStore();

  async function handleSignOut() {
    await supabase.auth.signOut();
    reset();
  }

  return (
    <View className="flex-1 bg-bg px-6 pt-16">
      <View className="flex-row items-center justify-between mb-8">
        <View>
          <Text className="text-text-secondary font-inter text-sm">Bem-vindo</Text>
          <Text className="text-text-primary font-inter-bold text-2xl">{user?.email?.split('@')[0]}</Text>
        </View>
        <TouchableOpacity onPress={handleSignOut} className="bg-surface border border-border rounded-xl px-4 py-2">
          <Text className="text-text-secondary font-inter text-sm">Sair</Text>
        </TouchableOpacity>
      </View>

      {/* Quick actions */}
      <View className="gap-3">
        <View className="bg-surface border border-border rounded-2xl p-5">
          <Text className="text-text-secondary font-inter text-xs mb-1">EM BREVE</Text>
          <Text className="text-text-primary font-inter-bold text-lg">Meu Perfil</Text>
          <Text className="text-text-secondary font-inter text-sm mt-1">Seus atributos técnicos</Text>
        </View>
        <View className="bg-surface border border-border rounded-2xl p-5">
          <Text className="text-text-secondary font-inter text-xs mb-1">EM BREVE</Text>
          <Text className="text-text-primary font-inter-bold text-lg">Adversários</Text>
          <Text className="text-text-secondary font-inter text-sm mt-1">Gerencie seus rivais</Text>
        </View>
        <View className="bg-surface border border-border rounded-2xl p-5">
          <View className="flex-row items-center gap-2 mb-1">
            <Text className="text-text-secondary font-inter text-xs">EM BREVE</Text>
            <View className="bg-ai-bg px-2 py-0.5 rounded-full">
              <Text className="text-ai-text font-inter text-xs">IA</Text>
            </View>
          </View>
          <Text className="text-text-primary font-inter-bold text-lg">Estratégias</Text>
          <Text className="text-text-secondary font-inter text-sm mt-1">Geradas por inteligência artificial</Text>
        </View>
      </View>
    </View>
  );
}
