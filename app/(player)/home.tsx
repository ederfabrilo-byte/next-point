import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../lib/store';
import { supabase } from '../../lib/supabase';

export default function PlayerHome() {
  const { user, reset, setRole } = useAuthStore();

  async function handleSignOut() {
    await supabase.auth.signOut();
    reset();
  }

  async function handleSwitchRole() {
    if (!user) return;
    await supabase.from('users').update({ role: null }).eq('id', user.id);
    setRole(null);
  }

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ paddingBottom: 32 }}>
      <View className="px-6 pt-16 pb-4">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-text-secondary font-inter text-sm">Bem-vindo</Text>
            <Text className="text-text-primary font-inter-bold text-2xl">
              {user?.email?.split('@')[0]}
            </Text>
          </View>
          <View className="flex-row gap-2">
            <TouchableOpacity onPress={handleSwitchRole} className="bg-surface border border-border rounded-xl px-3 py-2">
              <Text className="text-text-secondary font-inter text-sm">Trocar perfil</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSignOut} className="bg-surface border border-border rounded-xl px-3 py-2">
              <Text className="text-text-secondary font-inter text-sm">Sair</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View className="px-6 gap-3">
        <TouchableOpacity onPress={() => router.push('/(player)/profile')} className="bg-surface border border-border rounded-2xl p-5 active:opacity-75">
          <Text className="text-text-primary font-inter-bold text-lg">🎾 Meu Perfil</Text>
          <Text className="text-text-secondary font-inter text-sm mt-1">Seus atributos técnicos</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/(player)/opponents')} className="bg-surface border border-border rounded-2xl p-5 active:opacity-75">
          <Text className="text-text-primary font-inter-bold text-lg">👥 Adversários</Text>
          <Text className="text-text-secondary font-inter text-sm mt-1">Gerencie seus rivais</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/(player)/strategy')} className="bg-surface border border-border rounded-2xl p-5 active:opacity-75">
          <View className="flex-row items-center gap-2 mb-1">
            <Text className="text-text-primary font-inter-bold text-lg">💡 Estratégias</Text>
            <View className="bg-ai-bg px-2 py-0.5 rounded-full">
              <Text className="text-ai-text font-inter text-xs">IA</Text>
            </View>
          </View>
          <Text className="text-text-secondary font-inter text-sm">Geradas por inteligência artificial</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
