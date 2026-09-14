import { useCallback, useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../lib/store';

interface Student {
  student_id: string;
  users: { name: string | null; username: string | null } | null;
}

interface FoundPlayer {
  id: string;
  username: string | null;
  name: string | null;
}

export default function TeacherStudents() {
  const { user } = useAuthStore();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [found, setFound] = useState<FoundPlayer | null>(null);
  const [searchError, setSearchError] = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('student_teacher')
      .select('student_id, users!student_id(name, username)')
      .eq('teacher_id', user.id);
    setStudents((data as unknown as Student[]) ?? []);
    setLoading(false);
  }, [user]);

  async function handleSearch() {
    const value = query.trim().replace(/^@/, '');
    if (!value) return;
    setSearching(true);
    setSearchError('');
    setFound(null);
    const { data, error } = await supabase.rpc('find_user_by_username', {
      p_username: value,
      p_role: 'player',
    });
    setSearching(false);
    if (error) { setSearchError(error.message); return; }
    const hit = (data as FoundPlayer[])?.[0] ?? null;
    if (!hit) { setSearchError(`Nenhum jogador com @${value}.`); return; }
    if (students.some((s) => s.student_id === hit.id)) {
      setSearchError('Esse aluno já está na sua turma.');
      return;
    }
    setFound(hit);
  }

  async function handleAdd(player: FoundPlayer) {
    if (!user) return;
    const { error } = await supabase
      .from('student_teacher')
      .insert({ teacher_id: user.id, student_id: player.id });
    if (error) { Alert.alert('Erro', error.message); return; }
    setQuery('');
    setFound(null);
    setAdding(false);
    await load();
  }

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function handleRemove(student: Student, name: string) {
    if (!user) return;
    Alert.alert(
      'Remover aluno?',
      `${name} sai da sua turma e você deixa de ver o perfil dele. Os treinos já registrados são mantidos.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('student_teacher')
              .delete()
              .eq('teacher_id', user.id)
              .eq('student_id', student.student_id);
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

  return (
    <View className="flex-1 bg-bg">
      <View className="px-6 pt-16 pb-4 flex-row items-start justify-between">
        <View>
          <Text className="text-text-primary font-inter-bold text-2xl">Alunos</Text>
          <Text className="text-text-secondary font-inter text-sm mt-1">{students.length} na sua turma</Text>
        </View>
        <TouchableOpacity
          onPress={() => { setAdding(!adding); setQuery(''); setFound(null); setSearchError(''); }}
          className="bg-primary rounded-xl px-4 py-2"
        >
          <Text className="text-black font-inter-bold text-sm">{adding ? 'Fechar' : '+ Adicionar'}</Text>
        </TouchableOpacity>
      </View>

      {adding && (
        <View className="px-6 pb-4">
          <Text className="text-text-secondary font-inter text-sm mb-2">
            Nome de usuário do aluno
          </Text>
          <View className="flex-row gap-2">
            <View className="flex-1 flex-row items-center bg-surface border border-border rounded-xl px-4 h-14">
              <Text className="text-text-secondary font-inter-bold text-base">@</Text>
              <TextInput
                className="flex-1 text-text-primary font-inter ml-1"
                value={query}
                onChangeText={(v) => { setQuery(v); setSearchError(''); setFound(null); }}
                onSubmitEditing={handleSearch}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                placeholder="aluno"
                placeholderTextColor="#9CA3AF"
              />
            </View>
            <TouchableOpacity
              onPress={handleSearch}
              disabled={searching || !query.trim()}
              className={`rounded-xl h-14 w-14 items-center justify-center ${query.trim() ? 'bg-primary' : 'bg-surface border border-border'}`}
            >
              {searching
                ? <ActivityIndicator color="#000" />
                : <Ionicons name="search" size={20} color={query.trim() ? '#000' : '#9CA3AF'} />
              }
            </TouchableOpacity>
          </View>
          {searchError ? (
            <Text className="text-red-400 font-inter text-xs mt-2">{searchError}</Text>
          ) : null}

          {found && (
            <View className="bg-surface border border-primary rounded-2xl p-5 mt-3 flex-row items-center justify-between">
              <View className="flex-row items-center gap-3 flex-1">
                <View className="bg-primary/20 rounded-full w-11 h-11 items-center justify-center">
                  <Text className="text-primary font-inter-bold text-base">
                    {(found.name?.trim() || found.username || '?')[0].toUpperCase()}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-text-primary font-inter-bold text-base">
                    {found.name?.trim() || found.username}
                  </Text>
                  <Text className="text-text-secondary font-inter text-xs">@{found.username}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => handleAdd(found)} className="bg-primary rounded-xl px-4 py-2">
                <Text className="text-black font-inter-bold text-sm">Adicionar</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {students.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="people-outline" size={48} color="#9CA3AF" />
          <Text className="text-text-primary font-inter-bold text-lg text-center mt-4">Nenhum aluno ainda</Text>
          <Text className="text-text-secondary font-inter text-sm text-center mt-2">
            Use <Text className="text-primary font-inter-semibold">+ Adicionar</Text> com o nome de usuário
            dele, ou peça para ele te escolher em Meu Professor.
          </Text>
        </View>
      ) : (
        <FlatList
          data={students}
          keyExtractor={(item) => item.student_id}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}
          ItemSeparatorComponent={() => <View className="h-3" />}
          renderItem={({ item }) => {
            const name = item.users?.name?.trim() || item.users?.username || 'Jogador';
            return (
              <TouchableOpacity
                onPress={() => router.push(`/(teacher)/student/${item.student_id}`)}
                onLongPress={() => handleRemove(item, name)}
                className="bg-surface border border-border rounded-2xl p-5 active:opacity-75 flex-row items-center justify-between"
              >
                <View className="flex-row items-center gap-3 flex-1">
                  <View className="bg-primary/20 rounded-full w-10 h-10 items-center justify-center">
                    <Text className="text-primary font-inter-bold text-base">{name[0].toUpperCase()}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-text-primary font-inter-bold text-base">{name}</Text>
                    {item.users?.username ? (
                      <Text className="text-text-secondary font-inter text-xs">@{item.users.username}</Text>
                    ) : null}
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => handleRemove(item, name)}
                  hitSlop={10}
                  className="px-2"
                >
                  <Ionicons name="close-circle-outline" size={20} color="#9CA3AF" />
                </TouchableOpacity>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}
