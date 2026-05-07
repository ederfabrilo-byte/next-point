import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../lib/store';
import { PlayerProfile, AttributeKey, ATTRIBUTE_LABELS } from '../../../lib/types';

interface TrainingLog {
  id: string;
  date: string;
  notes: string | null;
  drills_suggested: string | null;
}

interface StudentData {
  name: string | null;
  email: string;
  profile: Partial<PlayerProfile> | null;
}

export default function StudentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const [student, setStudent] = useState<StudentData | null>(null);
  const [logs, setLogs] = useState<TrainingLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewLog, setShowNewLog] = useState(false);
  const [notes, setNotes] = useState('');
  const [drills, setDrills] = useState('');
  const [savingLog, setSavingLog] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.from('users').select('name, email').eq('id', id).single(),
      supabase.from('player_profiles').select('*').eq('user_id', id).maybeSingle(),
      supabase.from('training_logs').select('*').eq('student_id', id).order('date', { ascending: false }).limit(10),
    ]).then(([userRes, profileRes, logsRes]) => {
      setStudent({ name: userRes.data?.name, email: userRes.data?.email ?? '', profile: profileRes.data });
      setLogs(logsRes.data ?? []);
      setLoading(false);
    });
  }, [id]);

  async function handleSaveLog() {
    if (!notes.trim() || !user) return;
    setSavingLog(true);
    const { error } = await supabase.from('training_logs').insert({
      teacher_id: user.id,
      student_id: id,
      date: new Date().toISOString().split('T')[0],
      notes: notes.trim(),
      drills_suggested: drills.trim() || null,
    });
    setSavingLog(false);
    if (error) { Alert.alert('Erro', error.message); return; }
    setNotes('');
    setDrills('');
    setShowNewLog(false);
    const { data } = await supabase.from('training_logs').select('*').eq('student_id', id).order('date', { ascending: false }).limit(10);
    setLogs(data ?? []);
  }

  if (loading) {
    return <View className="flex-1 bg-bg items-center justify-center"><ActivityIndicator color="#F97316" /></View>;
  }

  const name = student?.name ?? student?.email?.split('@')[0] ?? 'Jogador';
  const ATTRS: AttributeKey[] = ['forehand', 'backhand', 'serve', 'volley', 'movement', 'mental'];

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ paddingBottom: 40 }}>
      <View className="px-6 pt-16 pb-6 flex-row items-center gap-3">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View>
          <Text className="text-text-primary font-inter-bold text-2xl">{name}</Text>
          <Text className="text-text-secondary font-inter text-sm">{student?.email}</Text>
        </View>
      </View>

      <View className="px-6 gap-5">
        {/* Perfil técnico */}
        <View className="bg-surface border border-border rounded-2xl p-5">
          <Text className="text-text-primary font-inter-bold text-base mb-4">Atributos Técnicos</Text>
          {student?.profile ? (
            <View className="gap-3">
              {ATTRS.map((key) => {
                const val = student.profile?.[key] as number | null;
                return (
                  <View key={key} className="flex-row items-center justify-between">
                    <Text className="text-text-secondary font-inter text-sm">{ATTRIBUTE_LABELS[key]}</Text>
                    <View className="flex-row items-center gap-2">
                      <View className="w-24 h-2 bg-border rounded-full overflow-hidden">
                        <View
                          className="h-full bg-primary rounded-full"
                          style={{ width: val ? `${(val / 5) * 100}%` : '0%' }}
                        />
                      </View>
                      <Text className="text-text-primary font-inter-bold text-sm w-6 text-right">
                        {val?.toFixed(1) ?? '—'}
                      </Text>
                    </View>
                  </View>
                );
              })}
              <View className="flex-row justify-between pt-2 border-t border-border">
                <Text className="text-text-secondary font-inter text-sm">Mão dominante</Text>
                <Text className="text-text-primary font-inter-semibold text-sm capitalize">
                  {student.profile.hand === 'right' ? 'Direita' : student.profile.hand === 'left' ? 'Esquerda' : '—'}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-text-secondary font-inter text-sm">Estilo</Text>
                <Text className="text-text-primary font-inter-semibold text-sm capitalize">{student.profile.style ?? '—'}</Text>
              </View>
            </View>
          ) : (
            <Text className="text-text-secondary font-inter text-sm">Perfil não preenchido ainda.</Text>
          )}
        </View>

        {/* Treinos */}
        <View>
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-text-primary font-inter-bold text-base">Treinos</Text>
            <TouchableOpacity onPress={() => setShowNewLog(!showNewLog)} className="bg-primary rounded-lg px-3 py-1.5">
              <Text className="text-black font-inter-bold text-sm">+ Registrar</Text>
            </TouchableOpacity>
          </View>

          {showNewLog && (
            <View className="bg-surface border border-border rounded-2xl p-4 mb-3 gap-3">
              <TextInput
                className="bg-bg border border-border rounded-xl px-4 py-3 text-text-primary font-inter"
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                placeholder="Observações do treino..."
                placeholderTextColor="#9CA3AF"
                textAlignVertical="top"
              />
              <TextInput
                className="bg-bg border border-border rounded-xl px-4 py-3 text-text-primary font-inter"
                value={drills}
                onChangeText={setDrills}
                multiline
                numberOfLines={2}
                placeholder="Exercícios sugeridos (opcional)..."
                placeholderTextColor="#9CA3AF"
                textAlignVertical="top"
              />
              <TouchableOpacity
                onPress={handleSaveLog}
                disabled={savingLog || !notes.trim()}
                className={`rounded-xl h-12 items-center justify-center ${notes.trim() ? 'bg-primary' : 'bg-surface'}`}
              >
                {savingLog ? <ActivityIndicator color="#000" /> : <Text className="text-black font-inter-bold">Salvar treino</Text>}
              </TouchableOpacity>
            </View>
          )}

          {logs.length === 0 ? (
            <Text className="text-text-secondary font-inter text-sm">Nenhum treino registrado.</Text>
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
