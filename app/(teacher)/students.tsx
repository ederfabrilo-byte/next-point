import { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../lib/store';

interface Student {
  student_id: string;
  users: { name: string | null; email: string } | null;
}

export default function TeacherStudents() {
  const { user } = useAuthStore();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('student_teacher')
      .select('student_id, users!student_id(name, email)')
      .eq('teacher_id', user.id);
    setStudents((data as unknown as Student[]) ?? []);
    setLoading(false);
  }, [user]);

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
      <View className="px-6 pt-16 pb-4">
        <Text className="text-text-primary font-inter-bold text-2xl">Alunos</Text>
        <Text className="text-text-secondary font-inter text-sm mt-1">{students.length} na sua turma</Text>
      </View>

      {students.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="people-outline" size={48} color="#9CA3AF" />
          <Text className="text-text-primary font-inter-bold text-lg text-center mt-4">Nenhum aluno ainda</Text>
          <Text className="text-text-secondary font-inter text-sm text-center mt-2">
            Peça ao aluno para abrir <Text className="text-primary font-inter-semibold">Meu Professor</Text> na
            home dele e escolher o seu nome. Ele aparece aqui na hora.
          </Text>
        </View>
      ) : (
        <FlatList
          data={students}
          keyExtractor={(item) => item.student_id}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}
          ItemSeparatorComponent={() => <View className="h-3" />}
          renderItem={({ item }) => {
            const name = item.users?.name ?? item.users?.email?.split('@')[0] ?? 'Jogador';
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
                    <Text className="text-text-secondary font-inter text-xs">{item.users?.email}</Text>
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
