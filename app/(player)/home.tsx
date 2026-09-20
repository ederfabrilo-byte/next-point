import { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useAuthStore } from '../../lib/store';
import { supabase } from '../../lib/supabase';
import { unregisterPush } from '../../lib/push';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLayout } from '../../lib/layout';

const zecaAction = require('../../assets/zeca-action.jpg');

export default function PlayerHome() {
  const { user, reset, setRole, profile } = useAuthStore();
  const { height, isWide } = useLayout();
  const [teacherName, setTeacherName] = useState<string | null>(null);
  const [stats, setStats] = useState({ opponents: 0, strategies: 0, videos: 0 });

  useFocusEffect(useCallback(() => {
    if (!user) return;
    Promise.all([
      supabase
        .from('student_teacher')
        .select('users!teacher_id(name)')
        .eq('student_id', user.id)
        .eq('status', 'accepted')
        .maybeSingle(),
      supabase.from('opponents').select('id', { count: 'exact', head: true }).eq('owner_id', user.id),
      supabase.from('strategies').select('id', { count: 'exact', head: true }).eq('player_id', user.id),
      supabase.from('videos').select('id', { count: 'exact', head: true }).eq('player_id', user.id),
    ]).then(([link, opponents, strategies, videos]) => {
      const t = link.data?.users as unknown as { name: string | null } | null;
      setTeacherName(t?.name?.trim() || (t ? 'Professor' : null));
      setStats({
        opponents: opponents.count ?? 0,
        strategies: strategies.count ?? 0,
        videos: videos.count ?? 0,
      });
    });
  }, [user]));

  async function handleSignOut() {
    if (user) await unregisterPush(user.id);
    await supabase.auth.signOut();
    reset();
  }

  async function handleSwitchRole() {
    if (!user) return;
    await supabase.from('users').update({ role: null }).eq('id', user.id);
    setRole(null);
  }

  // gap-3 = 12px; em 2 colunas cada card leva metade menos meio gap
  const menuCard = isWide ? { width: '50%' as const, flexGrow: 0, flexBasis: '48%' as const } : { width: '100%' as const };

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ paddingBottom: 32 }}>
      <View className="px-6 pt-16 pb-4">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-text-secondary font-inter text-sm">Bem-vindo</Text>
            <Text className="text-text-primary font-inter-bold text-2xl">
              {profile?.name?.trim() || profile?.username || user?.email?.split('@')[0]}
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

      {/* Banner do método — foto de ação do Zeca; altura relativa à janela, com teto */}
      <TouchableOpacity
        onPress={() => router.push('/(player)/strategy')}
        activeOpacity={0.85}
        className="mx-6 mb-4 rounded-2xl overflow-hidden border border-border"
        style={{ height: Math.min(Math.max(height * 0.2, 150), isWide ? 220 : 190) }}
      >
        <ExpoImage
          source={zecaAction}
          contentFit="cover"
          contentPosition="left"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <LinearGradient
          colors={['rgba(10,10,10,0.05)', 'rgba(10,10,10,0.55)', 'rgba(10,10,10,0.9)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <View className="flex-1 justify-end items-end p-4">
          <Text className="text-text-secondary font-inter-semibold text-[10px] uppercase tracking-widest text-right">
            Método Zeca Mota
          </Text>
          <Text className="text-text-primary font-inter-bold text-lg leading-6 text-right mt-1">
            Estratégia para o{'\n'}seu próximo jogo
          </Text>
          <View className="bg-primary rounded-full px-3 py-1 mt-2">
            <Text className="text-black font-inter-bold text-xs">Gerar com IA</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Stats */}
      <View className="px-6 flex-row gap-3 mb-4">
        {([
          { label: 'Adversários', value: stats.opponents, route: '/(player)/opponents' },
          { label: 'Estratégias', value: stats.strategies, route: '/(player)/strategy' },
          { label: 'Vídeos', value: stats.videos, route: '/(player)/videos' },
        ] as const).map((s) => (
          <TouchableOpacity
            key={s.label}
            onPress={() => router.push(s.route)}
            className="flex-1 bg-surface border border-border rounded-2xl p-4 items-center active:opacity-75"
          >
            <Text className="text-primary font-inter-bold text-3xl">{s.value}</Text>
            <Text className="text-text-secondary font-inter text-xs mt-1">{s.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Menu: 1 coluna no celular, 2 no PC */}
      <View className="px-6 gap-3 flex-row flex-wrap">
        <TouchableOpacity onPress={() => router.push('/(player)/profile')} className="bg-surface border border-border rounded-2xl p-5 active:opacity-75" style={menuCard}>
          <Text className="text-text-primary font-inter-bold text-lg">🎾 Meu Perfil</Text>
          <Text className="text-text-secondary font-inter text-sm mt-1">Seus atributos técnicos</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/(player)/opponents')} className="bg-surface border border-border rounded-2xl p-5 active:opacity-75" style={menuCard}>
          <Text className="text-text-primary font-inter-bold text-lg">👥 Adversários</Text>
          <Text className="text-text-secondary font-inter text-sm mt-1">Gerencie seus rivais</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/(player)/strategy')} className="bg-surface border border-border rounded-2xl p-5 active:opacity-75" style={menuCard}>
          <View className="flex-row items-center gap-2 mb-1">
            <Text className="text-text-primary font-inter-bold text-lg">💡 Estratégias</Text>
            <View className="bg-ai-bg px-2 py-0.5 rounded-full">
              <Text className="text-ai-text font-inter text-xs">IA</Text>
            </View>
          </View>
          <Text className="text-text-secondary font-inter text-sm">Geradas por inteligência artificial</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/(player)/teacher')} className="bg-surface border border-border rounded-2xl p-5 active:opacity-75" style={menuCard}>
          <Text className="text-text-primary font-inter-bold text-lg">🏫 Meu Professor</Text>
          <Text className="text-text-secondary font-inter text-sm mt-1">
            {teacherName ? teacherName : 'Escolha quem acompanha seu jogo'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
