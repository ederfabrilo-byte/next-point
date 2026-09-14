import { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert, Image, ScrollView } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../lib/store';

interface Teacher {
  id: string;
  name: string | null;
  avatar_url: string | null;
}

interface TrainingLog {
  id: string;
  date: string;
  notes: string | null;
  drills_suggested: string | null;
}

function displayName(t: { name: string | null } | null, fallback = 'Professor') {
  return t?.name?.trim() || fallback;
}

export default function MyTeacherScreen() {
  const { user } = useAuthStore();
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [logs, setLogs] = useState<TrainingLog[]>([]);
  const [directory, setDirectory] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;

    const { data: link } = await supabase
      .from('student_teacher')
      .select('teacher_id, users!teacher_id(id, name, avatar_url)')
      .eq('student_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const linked = (link?.users as unknown as Teacher) ?? null;
    setTeacher(linked);

    if (linked) {
      const { data } = await supabase
        .from('training_logs')
        .select('id, date, notes, drills_suggested')
        .eq('student_id', user.id)
        .order('date', { ascending: false })
        .limit(10);
      setLogs(data ?? []);
      setDirectory([]);
    } else {
      setLogs([]);
      const { data } = await supabase.rpc('list_teachers');
      setDirectory((data as Teacher[]) ?? []);
    }
    setLoading(false);
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function handleLink(t: Teacher) {
    if (!user || busy) return;
    setBusy(true);
    const { error } = await supabase
      .from('student_teacher')
      .insert({ teacher_id: t.id, student_id: user.id });
    setBusy(false);
    if (error) { Alert.alert('Erro', error.message); return; }
    await load();
  }

  function handleUnlink() {
    if (!user || !teacher) return;
    Alert.alert(
      'Desvincular professor?',
      `${displayName(teacher)} deixará de ver seu perfil e seus treinos. Os treinos já registrados continuam no seu histórico.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desvincular',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            const { error } = await supabase
              .from('student_teacher')
              .delete()
              .eq('student_id', user.id)
              .eq('teacher_id', teacher.id);
            setBusy(false);
            if (error) { Alert.alert('Erro', error.message); return; }
            await load();
          },
        },
      ]
    );
  }

  if (loading) {
    return <View className="flex-1 bg-bg items-center justify-center"><ActivityIndicator color="#F97316" /></View>;
  }

  // ── Sem professor: diretório para escolher ────────────────────────────────
  if (!teacher) {
    return (
      <View className="flex-1 bg-bg">
        <View className="px-6 pt-16 pb-4 flex-row items-center gap-3">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View>
            <Text className="text-text-primary font-inter-bold text-2xl">Meu Professor</Text>
            <Text className="text-text-secondary font-inter text-sm">Escolha quem acompanha seu jogo</Text>
          </View>
        </View>

        {directory.length === 0 ? (
          <View className="flex-1 items-center justify-center px-6">
            <Ionicons name="school-outline" size={48} color="#9CA3AF" />
            <Text className="text-text-primary font-inter-bold text-lg text-center mt-4">
              Nenhum professor disponível
            </Text>
            <Text className="text-text-secondary font-inter text-sm text-center mt-2">
              Ainda não há professores cadastrados no Next Point.
            </Text>
          </View>
        ) : (
          <FlatList
            data={directory}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}
            ItemSeparatorComponent={() => <View className="h-3" />}
            ListHeaderComponent={
              <Text className="text-text-secondary font-inter text-sm mb-4">
                Ao escolher um professor, ele passa a ver seus atributos técnicos e pode registrar
                seus treinos. Você pode desvincular quando quiser.
              </Text>
            }
            renderItem={({ item }) => {
              const name = displayName(item);
              return (
                <TouchableOpacity
                  onPress={() => handleLink(item)}
                  disabled={busy}
                  className="bg-surface border border-border rounded-2xl p-5 active:opacity-75 flex-row items-center justify-between"
                >
                  <View className="flex-row items-center gap-3 flex-1">
                    {item.avatar_url ? (
                      <Image
                        source={{ uri: item.avatar_url }}
                        style={{ width: 44, height: 44, borderRadius: 22 }}
                      />
                    ) : (
                      <View className="bg-primary/20 rounded-full w-11 h-11 items-center justify-center">
                        <Text className="text-primary font-inter-bold text-base">{name[0].toUpperCase()}</Text>
                      </View>
                    )}
                    <Text className="text-text-primary font-inter-bold text-base flex-1">{name}</Text>
                  </View>
                  <Text className="text-primary font-inter-semibold text-sm">Escolher</Text>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>
    );
  }

  // ── Com professor: card + histórico de treinos ────────────────────────────
  const name = displayName(teacher);

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ paddingBottom: 40 }}>
      <View className="px-6 pt-16 pb-6 flex-row items-center gap-3">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text className="text-text-primary font-inter-bold text-2xl">Meu Professor</Text>
      </View>

      <View className="px-6 gap-5">
        <View className="bg-surface border border-border rounded-2xl p-5">
          <View className="flex-row items-center gap-4">
            {teacher.avatar_url ? (
              <Image
                source={{ uri: teacher.avatar_url }}
                style={{ width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: '#F97316' }}
              />
            ) : (
              <View className="bg-primary/20 rounded-full w-14 h-14 items-center justify-center">
                <Text className="text-primary font-inter-bold text-xl">{name[0].toUpperCase()}</Text>
              </View>
            )}
            <View className="flex-1">
              <Text className="text-text-secondary font-inter text-xs">Professor</Text>
              <Text className="text-text-primary font-inter-bold text-xl">{name}</Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleUnlink}
            disabled={busy}
            className="mt-4 pt-4 border-t border-border"
          >
            <Text className="text-red-400 font-inter text-sm">Desvincular professor</Text>
          </TouchableOpacity>
        </View>

        <View>
          <Text className="text-text-primary font-inter-bold text-base mb-3">Treinos registrados</Text>
          {logs.length === 0 ? (
            <View className="bg-surface border border-border rounded-2xl p-5 items-center">
              <Ionicons name="clipboard-outline" size={32} color="#9CA3AF" />
              <Text className="text-text-secondary font-inter text-sm text-center mt-3">
                {name} ainda não registrou nenhum treino seu.
              </Text>
            </View>
          ) : (
            <View className="gap-3">
              {logs.map((log) => (
                <View key={log.id} className="bg-surface border border-border rounded-2xl p-4">
                  <Text className="text-primary font-inter-semibold text-sm mb-2">
                    {new Date(log.date).toLocaleDateString('pt-BR')}
                  </Text>
                  <Text className="text-text-primary font-inter text-sm">{log.notes}</Text>
                  {log.drills_suggested ? (
                    <View className="mt-2 pt-2 border-t border-border">
                      <Text className="text-text-secondary font-inter text-xs mb-1">Exercícios</Text>
                      <Text className="text-text-primary font-inter text-sm">{log.drills_suggested}</Text>
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}
