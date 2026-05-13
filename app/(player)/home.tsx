import { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../lib/store';
import { supabase } from '../../lib/supabase';
import AvatarPicker from '../../components/AvatarPicker';

export default function PlayerHome() {
  const { user, reset, setRole } = useAuthStore();
  const [stats, setStats] = useState({ opponents: 0, strategies: 0, videos: 0, analyzing: 0 });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    if (!user) return;
    Promise.all([
      supabase.from('opponents').select('id', { count: 'exact', head: true }).eq('owner_id', user.id),
      supabase.from('strategies').select('id', { count: 'exact', head: true }).eq('player_id', user.id),
      supabase.from('videos').select('id', { count: 'exact', head: true }).eq('player_id', user.id).eq('status', 'processing'),
      supabase.from('videos').select('id', { count: 'exact', head: true }).eq('player_id', user.id),
      supabase.from('users').select('avatar_url, name').eq('id', user.id).single(),
    ]).then(([opponents, strategies, analyzing, allVideos, userRes]) => {
      setStats({
        opponents: opponents.count ?? 0,
        strategies: strategies.count ?? 0,
        videos: allVideos.count ?? 0,
        analyzing: analyzing.count ?? 0,
      });
      if (userRes.data?.avatar_url) setAvatarUrl(userRes.data.avatar_url);
      if (userRes.data?.name) setUserName(userRes.data.name);
      else setUserName(user.email?.split('@')[0] ?? 'Jogador');
      setLoading(false);
    });
  }, [user]));

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
      {/* Header */}
      <View className="px-6 pt-16 pb-6">
        <View className="flex-row items-center justify-between mb-6">
          <View className="flex-row items-center gap-4">
            {user && (
              <AvatarPicker
                userId={user.id}
                avatarUrl={avatarUrl}
                size={52}
                onUpdate={setAvatarUrl}
              />
            )}
            <View>
              <Text className="text-text-secondary font-inter text-xs">Jogador</Text>
              <Text className="text-text-primary font-inter-bold text-xl">{userName || 'Jogador'}</Text>
              <Text className="text-primary font-inter text-xs">Next Point</Text>
            </View>
          </View>
          <View className="flex-row gap-2">
            <TouchableOpacity onPress={handleSwitchRole} className="bg-surface border border-border rounded-xl px-3 py-2">
              <Text className="text-text-secondary font-inter text-sm">Trocar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSignOut} className="bg-surface border border-border rounded-xl px-3 py-2">
              <Text className="text-text-secondary font-inter text-sm">Sair</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats */}
        {loading ? (
          <ActivityIndicator color="#F97316" />
        ) : (
          <View className="flex-row gap-3 mb-2">
            <TouchableOpacity
              onPress={() => router.push('/(player)/opponents')}
              className="flex-1 bg-surface border border-border rounded-2xl p-4 items-center"
            >
              <Text className="text-primary font-inter-bold text-3xl">{stats.opponents}</Text>
              <Text className="text-text-secondary font-inter text-xs mt-1">Adversários</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/(player)/strategy')}
              className="flex-1 bg-surface border border-border rounded-2xl p-4 items-center"
            >
              <Text className="text-primary font-inter-bold text-3xl">{stats.strategies}</Text>
              <Text className="text-text-secondary font-inter text-xs mt-1">Estratégias</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/(player)/videos')}
              className="flex-1 bg-surface border border-border rounded-2xl p-4 items-center"
            >
              <Text className="text-primary font-inter-bold text-3xl">{stats.videos}</Text>
              <Text className="text-text-secondary font-inter text-xs mt-1">Vídeos</Text>
              {stats.analyzing > 0 && (
                <View className="bg-primary rounded-full w-4 h-4 items-center justify-center mt-1">
                  <Text className="text-black font-inter-bold text-xs">{stats.analyzing}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Atalhos */}
      <View className="px-6 gap-3">
        <TouchableOpacity onPress={() => router.push('/(player)/profile')} className="bg-surface border border-border rounded-2xl p-5 active:opacity-75">
          <View className="flex-row items-center gap-3">
            <Ionicons name="person-circle-outline" size={28} color="#F97316" />
            <View className="flex-1">
              <Text className="text-text-primary font-inter-bold text-base">Meu Perfil</Text>
              <Text className="text-text-secondary font-inter text-sm">Atributos técnicos e avatar</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/(player)/opponents')} className="bg-surface border border-border rounded-2xl p-5 active:opacity-75">
          <View className="flex-row items-center gap-3">
            <Ionicons name="people-outline" size={28} color="#F97316" />
            <View className="flex-1">
              <Text className="text-text-primary font-inter-bold text-base">Adversários</Text>
              <Text className="text-text-secondary font-inter text-sm">
                {stats.opponents === 0 ? 'Nenhum cadastrado ainda' : `${stats.opponents} cadastrado${stats.opponents > 1 ? 's' : ''}`}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/(player)/strategy')} className="bg-surface border border-border rounded-2xl p-5 active:opacity-75">
          <View className="flex-row items-center gap-3">
            <Ionicons name="bulb-outline" size={28} color="#F97316" />
            <View className="flex-1">
              <View className="flex-row items-center gap-2">
                <Text className="text-text-primary font-inter-bold text-base">Estratégias</Text>
                <View className="bg-ai-bg px-2 py-0.5 rounded-full">
                  <Text className="text-ai-text font-inter text-xs">IA</Text>
                </View>
              </View>
              <Text className="text-text-secondary font-inter text-sm">
                {stats.strategies === 0 ? 'Gerar primeira estratégia' : `${stats.strategies} gerada${stats.strategies > 1 ? 's' : ''}`}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/(player)/videos')} className="bg-surface border border-border rounded-2xl p-5 active:opacity-75">
          <View className="flex-row items-center gap-3">
            <Ionicons name="videocam-outline" size={28} color="#F97316" />
            <View className="flex-1">
              <Text className="text-text-primary font-inter-bold text-base">Vídeos</Text>
              <Text className="text-text-secondary font-inter text-sm">
                {stats.analyzing > 0
                  ? `${stats.analyzing} em análise...`
                  : stats.videos === 0 ? 'Enviar primeiro vídeo' : `${stats.videos} enviado${stats.videos > 1 ? 's' : ''}`}
              </Text>
            </View>
            {stats.analyzing > 0 && (
              <ActivityIndicator size="small" color="#F97316" />
            )}
            {stats.analyzing === 0 && (
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            )}
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
