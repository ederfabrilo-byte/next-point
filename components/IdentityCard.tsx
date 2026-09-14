import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

const USERNAME_RE = /^[a-z0-9_.]{3,20}$/;

interface Props {
  userId: string;
  /** Explica, na tela em que está, para que serve o @username. */
  hint?: string;
  /** Avisa a tela que já exibe o nome em outro lugar (ex.: header da home). */
  onChange?: (identity: { name: string; username: string }) => void;
}

/**
 * Identidade pública do usuário: nome de exibição + @username.
 *
 * O nome é o que aparece para as outras pessoas (lista de alunos, diretório de
 * professores, fila do Zeca); o @username é o que a outra ponta digita para
 * criar o vínculo aluno<->professor.
 */
export default function IdentityCard({ userId, hint, onChange }: Props) {
  const [name, setName] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState('');
  const [usernameDraft, setUsernameDraft] = useState('');
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase
      .from('users')
      .select('name, username')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        setName(data?.name ?? null);
        setUsername(data?.username ?? null);
        setLoading(false);
      });
  }, [userId]);

  function startEdit() {
    setNameDraft(name ?? '');
    setUsernameDraft(username ?? '');
    setError('');
    setEditing(true);
  }

  async function handleSave() {
    const nextName = nameDraft.trim();
    const nextUsername = usernameDraft.trim().toLowerCase().replace(/^@/, '');

    if (!nextName) {
      setError('Informe seu nome.');
      return;
    }
    if (!USERNAME_RE.test(nextUsername)) {
      setError('Nome de usuário: 3 a 20 caracteres, letras minúsculas, números, ponto ou _.');
      return;
    }

    setSaving(true);
    const { error: err } = await supabase
      .from('users')
      .update({ name: nextName, username: nextUsername })
      .eq('id', userId);
    setSaving(false);

    if (err) {
      // 23505 = unique_violation em users_username_lower_idx
      setError(err.code === '23505' ? 'Esse nome de usuário já está em uso.' : err.message);
      return;
    }

    const changedUsername = nextUsername !== username;
    setName(nextName);
    setUsername(nextUsername);
    setEditing(false);
    onChange?.({ name: nextName, username: nextUsername });
    if (changedUsername) {
      Alert.alert('Pronto', `Agora você é @${nextUsername}. É esse nome que a outra pessoa digita para te vincular.`);
    }
  }

  if (loading) {
    return (
      <View className="bg-surface border border-border rounded-2xl p-4 items-center">
        <ActivityIndicator color="#F97316" />
      </View>
    );
  }

  if (editing) {
    return (
      <View className="bg-surface border border-border rounded-2xl p-4">
        <Text className="text-text-secondary font-inter text-sm mb-2">Seu nome</Text>
        <TextInput
          className="bg-bg border border-border rounded-xl px-4 h-14 text-text-primary font-inter"
          value={nameDraft}
          onChangeText={(v) => { setNameDraft(v); setError(''); }}
          placeholder="Como você quer ser chamado"
          placeholderTextColor="#9CA3AF"
          maxLength={60}
        />

        <Text className="text-text-secondary font-inter text-sm mb-2 mt-4">Nome de usuário</Text>
        <View className="flex-row items-center bg-bg border border-border rounded-xl px-4 h-14">
          <Text className="text-text-secondary font-inter-bold text-base">@</Text>
          <TextInput
            className="flex-1 text-text-primary font-inter ml-1"
            value={usernameDraft}
            onChangeText={(v) => { setUsernameDraft(v); setError(''); }}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={20}
            placeholder="seunome"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {error ? <Text className="text-red-400 font-inter text-xs mt-2">{error}</Text> : null}

        <View className="flex-row gap-3 mt-4">
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
    );
  }

  return (
    <TouchableOpacity
      onPress={startEdit}
      className="bg-surface border border-border rounded-2xl p-4 flex-row items-center justify-between"
    >
      <View className="flex-1">
        <Text className="text-text-primary font-inter-bold text-lg">
          {name?.trim() || 'Definir seu nome'}
        </Text>
        <Text className="text-primary font-inter text-sm">
          {username ? `@${username}` : 'definir nome de usuário'}
        </Text>
        {hint ? <Text className="text-text-secondary font-inter text-xs mt-1">{hint}</Text> : null}
      </View>
      <Ionicons name="create-outline" size={20} color="#F97316" />
    </TouchableOpacity>
  );
}
