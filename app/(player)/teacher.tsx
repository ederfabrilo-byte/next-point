import { useCallback, useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, ActivityIndicator, Alert, Image, ScrollView } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../lib/store';
import {
  PendingLink,
  counterpartName,
  fetchPendingLinks,
  requestLink,
  acceptLink,
  removeLink,
  linkErrorMessage,
} from '../../lib/links';
import { formatISODate } from '../../lib/dates';

interface Teacher {
  id: string;
  username: string | null;
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

function Avatar({ url, label, size = 44 }: { url: string | null; label: string; size?: number }) {
  if (url) {
    return <Image source={{ uri: url }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2 }}
      className="bg-primary/20 items-center justify-center"
    >
      <Text className="text-primary font-inter-bold text-base">{label[0].toUpperCase()}</Text>
    </View>
  );
}

export default function MyTeacherScreen() {
  const { user, profile } = useAuthStore();
  const myName = profile?.name?.trim() || (profile?.username ? `@${profile.username}` : 'Um jogador');
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [logs, setLogs] = useState<TrainingLog[]>([]);
  const [pending, setPending] = useState<PendingLink[]>([]);
  const [directory, setDirectory] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [found, setFound] = useState<Teacher | null>(null);
  const [searchError, setSearchError] = useState('');

  const load = useCallback(async () => {
    if (!user) return;

    const { data: link } = await supabase
      .from('student_teacher')
      .select('teacher_id, users!teacher_id(id, username, name, avatar_url)')
      .eq('student_id', user.id)
      .eq('status', 'accepted')
      .maybeSingle();

    const linked = (link?.users as unknown as Teacher) ?? null;
    setTeacher(linked);
    setPending(await fetchPendingLinks().catch(() => []));

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

  async function handleSearch() {
    const value = query.trim().replace(/^@/, '');
    if (!value) return;
    setSearching(true);
    setSearchError('');
    setFound(null);
    const { data, error } = await supabase.rpc('find_user_by_username', {
      p_username: value,
      p_role: 'teacher',
    });
    setSearching(false);
    if (error) { setSearchError(error.message); return; }
    const hit = (data as Teacher[])?.[0] ?? null;
    if (!hit) { setSearchError(`Nenhum professor com @${value}.`); return; }
    setFound(hit);
  }

  async function handleInvite(t: Teacher) {
    if (!user || busy) return;
    setBusy(true);
    try {
      await requestLink({ teacherId: t.id, studentId: user.id, requestedBy: user.id, fromName: myName });
      setQuery('');
      setFound(null);
      await load();
      Alert.alert('Convite enviado', `${displayName(t)} precisa aceitar para o vínculo valer.`);
    } catch (e: any) {
      Alert.alert('Não foi possível convidar', linkErrorMessage(e, displayName(t)));
    } finally {
      setBusy(false);
    }
  }

  async function handleAccept(link: PendingLink) {
    if (!user) return;
    setBusy(true);
    try {
      await acceptLink({
        teacherId: link.teacher_id,
        studentId: link.student_id,
        acceptedBy: user.id,
        acceptedByName: myName,
      });
      await load();
    } catch (e: any) {
      Alert.alert('Erro', e.message);
    } finally {
      setBusy(false);
    }
  }

  function handleRemovePending(link: PendingLink, mine: boolean) {
    const who = counterpartName(link, 'este professor');
    Alert.alert(
      mine ? 'Cancelar convite?' : 'Recusar convite?',
      mine ? `O convite para ${who} some.` : `${who} não poderá ver seu perfil.`,
      [
        { text: 'Voltar', style: 'cancel' },
        {
          text: mine ? 'Cancelar convite' : 'Recusar',
          style: 'destructive',
          onPress: async () => {
            if (!user) return;
            setBusy(true);
            try {
              await removeLink({
                teacherId: link.teacher_id,
                studentId: link.student_id,
                removedBy: user.id,
                removedByName: myName,
                wasPending: true,
              });
              await load();
            } catch (e: any) {
              Alert.alert('Erro', e.message);
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
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
            try {
              await removeLink({
                teacherId: teacher.id,
                studentId: user.id,
                removedBy: user.id,
                removedByName: myName,
                wasPending: false,
              });
              await load();
            } catch (e: any) {
              Alert.alert('Erro', e.message);
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return <View className="flex-1 bg-bg items-center justify-center"><ActivityIndicator color="#F97316" /></View>;
  }

  const header = (title: string, subtitle?: string) => (
    <View className="px-6 pt-16 pb-4 flex-row items-center gap-3">
      <TouchableOpacity onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>
      <View>
        <Text className="text-text-primary font-inter-bold text-2xl">{title}</Text>
        {subtitle ? <Text className="text-text-secondary font-inter text-sm">{subtitle}</Text> : null}
      </View>
    </View>
  );

  // ── Já tem professor ──────────────────────────────────────────────────────
  if (teacher) {
    const name = displayName(teacher);
    return (
      <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ paddingBottom: 40 }}>
        {header('Meu Professor')}

        <View className="px-6 gap-5">
          <View className="bg-surface border border-border rounded-2xl p-5">
            <View className="flex-row items-center gap-4">
              <Avatar url={teacher.avatar_url} label={name} size={56} />
              <View className="flex-1">
                <Text className="text-text-secondary font-inter text-xs">Professor</Text>
                <Text className="text-text-primary font-inter-bold text-xl">{name}</Text>
                {teacher.username ? (
                  <Text className="text-text-secondary font-inter text-xs">@{teacher.username}</Text>
                ) : null}
              </View>
            </View>

            <TouchableOpacity onPress={handleUnlink} disabled={busy} className="mt-4 pt-4 border-t border-border">
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
                      {formatISODate(log.date)}
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

  // ── Sem professor: convites pendentes + busca + diretório ─────────────────
  return (
    <View className="flex-1 bg-bg">
      {header('Meu Professor', 'Escolha quem acompanha seu jogo')}

      <FlatList
        data={directory}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}
        ItemSeparatorComponent={() => <View className="h-3" />}
        ListHeaderComponent={
          <View className="mb-5">
            {/* Convites pendentes */}
            {pending.length > 0 && (
              <View className="mb-6">
                <Text className="text-text-secondary font-inter-semibold text-xs uppercase tracking-wider mb-3">
                  Convites
                </Text>
                <View className="gap-3">
                  {pending.map((link) => {
                    const mine = link.requested_by === user?.id;
                    const who = counterpartName(link, 'Professor');
                    return (
                      <View
                        key={`${link.teacher_id}-${link.student_id}`}
                        className="bg-surface border border-primary rounded-2xl p-4"
                      >
                        <View className="flex-row items-center gap-3">
                          <Avatar url={link.counterpart_avatar_url} label={who} />
                          <View className="flex-1">
                            <Text className="text-text-primary font-inter-bold text-base">{who}</Text>
                            <Text className="text-text-secondary font-inter text-xs">
                              {link.counterpart_username ? `@${link.counterpart_username} · ` : ''}
                              {mine ? 'aguardando resposta' : 'quer ser seu professor'}
                            </Text>
                          </View>
                        </View>
                        <View className="flex-row gap-3 mt-4">
                          <TouchableOpacity
                            onPress={() => handleRemovePending(link, mine)}
                            disabled={busy}
                            className="flex-1 bg-bg border border-border rounded-xl h-11 items-center justify-center"
                          >
                            <Text className="text-text-secondary font-inter-semibold text-sm">
                              {mine ? 'Cancelar' : 'Recusar'}
                            </Text>
                          </TouchableOpacity>
                          {!mine && (
                            <TouchableOpacity
                              onPress={() => handleAccept(link)}
                              disabled={busy}
                              className="flex-1 bg-primary rounded-xl h-11 items-center justify-center"
                            >
                              <Text className="text-black font-inter-bold text-sm">Aceitar</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Busca por @username */}
            <Text className="text-text-secondary font-inter text-sm mb-2">
              Digite o nome de usuário do seu professor
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
                  placeholder="professor"
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
            {searchError ? <Text className="text-red-400 font-inter text-xs mt-2">{searchError}</Text> : null}

            {found && (
              <View className="bg-surface border border-primary rounded-2xl p-5 mt-3 flex-row items-center justify-between">
                <View className="flex-row items-center gap-3 flex-1">
                  <Avatar url={found.avatar_url} label={displayName(found)} />
                  <View className="flex-1">
                    <Text className="text-text-primary font-inter-bold text-base">{displayName(found)}</Text>
                    <Text className="text-text-secondary font-inter text-xs">@{found.username}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => handleInvite(found)}
                  disabled={busy}
                  className="bg-primary rounded-xl px-4 py-2"
                >
                  <Text className="text-black font-inter-bold text-sm">Convidar</Text>
                </TouchableOpacity>
              </View>
            )}

            {directory.length > 0 && (
              <Text className="text-text-secondary font-inter-semibold text-xs uppercase tracking-wider mt-6">
                Ou escolha da lista
              </Text>
            )}
          </View>
        }
        ListEmptyComponent={
          <View className="items-center px-2 py-8">
            <Ionicons name="school-outline" size={40} color="#9CA3AF" />
            <Text className="text-text-secondary font-inter text-sm text-center mt-3">
              Nenhum professor cadastrado ainda. Se o seu já usa o Next Point, peça o nome de
              usuário dele e busque acima.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const name = displayName(item);
          return (
            <TouchableOpacity
              onPress={() => handleInvite(item)}
              disabled={busy}
              className="bg-surface border border-border rounded-2xl p-5 active:opacity-75 flex-row items-center justify-between"
            >
              <View className="flex-row items-center gap-3 flex-1">
                <Avatar url={item.avatar_url} label={name} />
                <View className="flex-1">
                  <Text className="text-text-primary font-inter-bold text-base">{name}</Text>
                  {item.username ? (
                    <Text className="text-text-secondary font-inter text-xs">@{item.username}</Text>
                  ) : null}
                </View>
              </View>
              <Text className="text-primary font-inter-semibold text-sm">Convidar</Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}
