import { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useAuthStore } from '../../lib/store';
import { supabase } from '../../lib/supabase';
import AvatarPicker from '../../components/AvatarPicker';

export default function AdminHome() {
  const { user, reset } = useAuthStore();
  const [pendingVideos, setPendingVideos] = useState(0);
  const [userCount, setUserCount] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    if (!user) return;
    Promise.all([
      supabase.from('videos').select('id', { count: 'exact', head: true }).eq('status', 'pending_review'),
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('users').select('avatar_url, name').eq('id', user.id).single(),
    ]).then(([videos, users, userRes]) => {
      setPendingVideos(videos.count ?? 0);
      setUserCount(users.count ?? 0);
      if (userRes.data?.avatar_url) setAvatarUrl(userRes.data.avatar_url);
      setName(userRes.data?.name ?? null);
      setLoading(false);
    });
  }, [user]));

  async function handleSignOut() {
    await supabase.auth.signOut();
    reset();
  }

  const displayName = name?.trim() || user?.email?.split('@')[0] || 'Administrador';

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ paddingBottom: 32 }}>
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
              <View className="flex-row items-center gap-2">
                <Text className="text-text-secondary font-inter text-xs">Administrador</Text>
                <View className="bg-primary/20 px-2 py-0.5 rounded-full">
                  <Text className="text-primary font-inter text-xs">Dono</Text>
                </View>
              </View>
              <Text className="text-text-primary font-inter-bold text-xl">{displayName}</Text>
              <Text className="text-primary font-inter text-xs">A mente por trás da IA</Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleSignOut} className="bg-surface border border-border rounded-xl px-3 py-2">
            <Text className="text-text-secondary font-inter text-sm">Sair</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        {loading ? (
          <ActivityIndicator color="#F97316" />
        ) : (
          <View className="flex-row gap-3 mb-6">
            <TouchableOpacity
              onPress={() => router.push('/(admin)/videos')}
              className="flex-1 bg-surface border border-border rounded-2xl p-4 items-center"
            >
              <Text className="text-primary font-inter-bold text-3xl">{pendingVideos}</Text>
              <Text className="text-text-secondary font-inter text-xs mt-1">Vídeos pendentes</Text>
            </TouchableOpacity>
            <View className="flex-1 bg-surface border border-border rounded-2xl p-4 items-center">
              <Text className="text-primary font-inter-bold text-3xl">{userCount}</Text>
              <Text className="text-text-secondary font-inter text-xs mt-1">Usuários</Text>
            </View>
          </View>
        )}

        {/* Atalhos */}
        <View className="gap-3">
          <TouchableOpacity
            onPress={() => router.push('/(admin)/videos')}
            className="bg-surface border border-border rounded-2xl p-5 active:opacity-75"
          >
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-text-primary font-inter-bold text-lg">📹 Fila de Vídeos</Text>
                <Text className="text-text-secondary font-inter text-sm mt-1">Avaliações técnicas pendentes</Text>
              </View>
              {pendingVideos > 0 && (
                <View className="bg-primary rounded-full w-6 h-6 items-center justify-center">
                  <Text className="text-black font-inter-bold text-xs">{pendingVideos}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(admin)/agent')}
            className="bg-surface border border-border rounded-2xl p-5 active:opacity-75"
          >
            <View className="flex-row items-center gap-2 mb-1">
              <Text className="text-text-primary font-inter-bold text-lg">🧠 Agente de IA</Text>
              <View className="bg-ai-bg px-2 py-0.5 rounded-full">
                <Text className="text-ai-text font-inter text-xs">IA</Text>
              </View>
            </View>
            <Text className="text-text-secondary font-inter text-sm">Contexto e orientações que balizam estratégia e vídeo</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
