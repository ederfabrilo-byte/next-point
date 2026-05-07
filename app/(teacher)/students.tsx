import { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
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

  useFocusEffect(useCallback(() => {
    if (!user) return;
    supabase
      .from('student_teacher')
      .select('student_id, users!student_id(name, email)')
      .eq('teacher_id', user.id)
      .then(({ data }) => {
        setStudents((data as unknown as Student[]) ?? []);
        setLoading(false);
      });
  }, [user]));

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
            Alunos aparecem aqui quando se vincularem a você no app.
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
                className="bg-surface border border-border rounded-2xl p-5 active:opacity-75 flex-row items-center justify-between"
              >
                <View className="flex-row items-center gap-3">
                  <View className="bg-primary/20 rounded-full w-10 h-10 items-center justify-center">
                    <Text className="text-primary font-inter-bold text-base">{name[0].toUpperCase()}</Text>
                  </View>
                  <View>
                    <Text className="text-text-primary font-inter-bold text-base">{name}</Text>
                    <Text className="text-text-secondary font-inter text-xs">{item.users?.email}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}
