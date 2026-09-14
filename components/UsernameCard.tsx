import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

const USERNAME_RE = /^[a-z0-9_.]{3,20}$/;

interface Props {
  userId: string;
  /** Texto explicando para que serve o username naquela tela. */
  hint?: string;
}

/**
 * Mostra e edita o @username do próprio usuário. É o identificador que a outra
 * ponta digita para criar o vínculo aluno<->professor.
 */
export default function UsernameCard({ userId, hint }: Props) {
  const [username, setUsername] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase
      .from('users')
      .select('username')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        setUsername(data?.username ?? null);
        setLoading(false);
      });
  }, [userId]);

  function startEdit() {
    setDraft(username ?? '');
    setError('');
    setEditing(true);
  }

  async function handleSave() {
    const value = draft.trim().toLowerCase().replace(/^@/, '');
    if (!USERNAME_RE.test(value)) {
      setError('Use de 3 a 20 caracteres: letras minúsculas, números, ponto ou _.');
      return;
    }
    if (value === username) { setEditing(false); return; }

    setSaving(true);
    const { error: err } = await supabase.from('users').update({ username: value }).eq('id', userId);
    setSaving(false);

    if (err) {
      // 23505 = unique_violation no índice users_username_lower_idx
      setError(err.code === '23505' ? 'Esse nome de usuário já está em uso.' : err.message);
      return;
    }
    setUsername(value);
    setEditing(false);
    Alert.alert('Pronto', `Agora você é @${value}. É esse nome que a outra pessoa digita para te vincular.`);
  }

  if (loading) {
    return (
      <View className="bg-surface border border-border rounded-2xl p-4 items-center">
        <ActivityIndicator color="#F97316" />
      </View>
    );
  }

  return (
    <View className="bg-surface border border-border rounded-2xl p-4">
      {editing ? (
        <View>
          <Text className="text-text-secondary font-inter text-sm mb-2">Nome de usuário</Text>
          <View className="flex-row items-center bg-bg border border-border rounded-xl px-4 h-14">
            <Text className="text-text-secondary font-inter-bold text-base">@</Text>
            <TextInput
              className="flex-1 text-text-primary font-inter ml-1"
              value={draft}
              onChangeText={(v) => { setDraft(v); setError(''); }}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={20}
              placeholder="seunome"
              placeholderTextColor="#9CA3AF"
            />
          </View>
          {error ? <Text className="text-red-400 font-inter text-xs mt-2">{error}</Text> : null}
          <View className="flex-row gap-3 mt-3">
            <TouchableOpacity
              onPress={() => setEditing(false)}
              className="flex-1 bg-bg border border-border rounded-xl h-12 items-center justify-center"
            >
              <Text className="text-text-secondary font-inter-semibold">Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              className="flex-1 bg-primary rounded-xl h-12 items-center justify-center"
            >
              {saving ? <ActivityIndicator color="#000" /> : <Text className="text-black font-inter-bold">Salvar</Text>}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity onPress={startEdit} className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-text-secondary font-inter text-xs">Nome de usuário</Text>
            <Text className="text-text-primary font-inter-bold text-lg">
              {username ? `@${username}` : 'definir'}
            </Text>
            {hint ? <Text className="text-text-secondary font-inter text-xs mt-1">{hint}</Text> : null}
          </View>
          <Ionicons name="create-outline" size={20} color="#F97316" />
        </TouchableOpacity>
      )}
    </View>
  );
}
