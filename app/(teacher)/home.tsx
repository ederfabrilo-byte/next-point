import { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useAuthStore } from '../../lib/store';
import { supabase } from '../../lib/supabase';
import AvatarPicker from '../../components/AvatarPicker';

export default function TeacherHome() {
  const { user, reset, setRole } = useAuthStore();
  const [pendingVideos, setPendingVideos] = useState(0);
  const [studentCount, setStudentCount] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    if (!user) return;
    Promise.all([
      supabase.from('videos').select('id', { count: 'exact', head: true }).eq('status', 'pending_review'),
      supabase.from('student_teacher').select('student_id', { count: 'exact', head: true }).eq('teacher_id', user.id),
      supabase.from('users').select('avatar_url, name').eq('id', user.id).single(),
    ]).then(([videos, students, userRes]) => {
      setPendingVideos(videos.count ?? 0);
      setStudentCount(students.count ?? 0);
      if (userRes.data?.avatar_url) setAvatarUrl(userRes.data.avatar_url);
      if (userRes.data?.name) setUserName(userRes.data.name);
      else setUserName(user.email?.split('@')[0] ?? 'Professor');
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
              <Text className="text-text-secondary font-inter text-xs">Professor</Text>
              <Text className="text-text-primary font-inter-bold text-xl">{userName || 'Professor'}</Text>
              <Text className="text-primary font-inter text-xs">Tennis Coach</Text>
            </View>
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

        {/* Stats */}
        {loading ? (
          <ActivityIndicator color="#F97316" />
        ) : (
          <View className="flex-row gap-3 mb-6">
            <View className="flex-1 bg-surface border border-border rounded-2xl p-4 items-center">
              <Text className="text-primary font-inter-bold text-3xl">{studentCount}</Text>
              <Text className="text-text-secondary font-inter text-xs mt-1">Alunos</Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/(teacher)/videos')}
              className="flex-1 bg-surface border border-border rounded-2xl p-4 items-center"
            >
              <Text className="text-primary font-inter-bold text-3xl">{pendingVideos}</Text>
              <Text className="text-text-secondary font-inter text-xs mt-1">Vídeos pendentes</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Atalhos */}
        <View className="gap-3">
          <TouchableOpacity
            onPress={() => router.push('/(teacher)/videos')}
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
            onPress={() => router.push('/(teacher)/students')}
            className="bg-surface border border-border rounded-2xl p-5 active:opacity-75"
          >
            <Text className="text-text-primary font-inter-bold text-lg">👥 Alunos</Text>
            <Text className="text-text-secondary font-inter text-sm mt-1">Gerencie sua turma</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(teacher)/video-guidelines')}
            className="bg-surface border border-border rounded-2xl p-5 active:opacity-75"
          >
            <View className="flex-row items-center gap-2 mb-1">
              <Text className="text-text-primary font-inter-bold text-lg">📋 Diretrizes de Análise</Text>
              <View className="bg-ai-bg px-2 py-0.5 rounded-full">
                <Text className="text-ai-text font-inter text-xs">IA</Text>
              </View>
            </View>
            <Text className="text-text-secondary font-inter text-sm">Como a IA deve analisar seus vídeos</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(teacher)/ai-config')}
            className="bg-surface border border-border rounded-2xl p-5 active:opacity-75"
          >
            <View className="flex-row items-center gap-2 mb-1">
              <Text className="text-text-primary font-inter-bold text-lg">⚙️ Config de IA</Text>
              <View className="bg-ai-bg px-2 py-0.5 rounded-full">
                <Text className="text-ai-text font-inter text-xs">IA</Text>
              </View>
            </View>
            <Text className="text-text-secondary font-inter text-sm">Personalize o sistema de estratégias</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
