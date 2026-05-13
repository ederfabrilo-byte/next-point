import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../lib/store';
import { PlayerProfile, AttributeKey, ATTRIBUTE_LABELS } from '../../lib/types';
import AttributeSlider from '../../components/AttributeSlider';
import { HandPicker, StylePicker } from '../../components/HandStylePicker';
import AvatarPicker from '../../components/AvatarPicker';

export default function ProfileScreen() {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<Partial<PlayerProfile>>({});
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [aiFields, setAiFields] = useState<Set<AttributeKey>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('player_profiles').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('users').select('avatar_url').eq('id', user.id).single(),
      // Busca a análise de vídeo mais recente para saber quais campos vieram da IA
      supabase
        .from('video_analyses')
        .select('forehand, backhand, serve, volley, movement, mental, video_id, videos!inner(player_id, target_type)')
        .eq('videos.player_id', user.id)
        .eq('videos.target_type', 'self')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]).then(([profileRes, userRes, analysisRes]) => {
      if (profileRes.data) setProfile(profileRes.data);
      if (userRes.data?.avatar_url) setAvatarUrl(userRes.data.avatar_url);
      // Marca campos que foram definidos pela IA (não-null na última análise)
      if (analysisRes.data) {
        const aiSet = new Set<AttributeKey>();
        const attrs: AttributeKey[] = ['forehand', 'backhand', 'serve', 'volley', 'movement', 'mental'];
        attrs.forEach(k => {
          if (analysisRes.data![k] !== null) aiSet.add(k);
        });
        setAiFields(aiSet);
      }
      setLoading(false);
    });
  }, [user]);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    const payload = { ...profile, user_id: user.id, updated_at: new Date().toISOString() };
    const { error } = profile.id
      ? await supabase.from('player_profiles').update(payload).eq('id', profile.id)
      : await supabase.from('player_profiles').insert(payload).select().single().then(({ data, error }) => {
          if (data) setProfile(data);
          return { error };
        });
    setSaving(false);
    if (error) Alert.alert('Erro', error.message);
    else Alert.alert('Salvo', 'Perfil atualizado.');
  }

  if (loading) {
    return <View className="flex-1 bg-bg items-center justify-center"><ActivityIndicator color="#F97316" /></View>;
  }

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ paddingBottom: 40 }}>
      <View className="px-6 pt-16 pb-6">
        <View className="items-center mb-6">
          {user && (
            <AvatarPicker
              userId={user.id}
              avatarUrl={avatarUrl}
              size={96}
              onUpdate={setAvatarUrl}
            />
          )}
          <Text className="text-text-secondary font-inter text-xs mt-2">Toque para alterar a foto</Text>
        </View>
        <Text className="text-text-primary font-inter-bold text-2xl">Meu Perfil</Text>
        <Text className="text-text-secondary font-inter text-sm mt-1">Avalie seus atributos técnicos</Text>
      </View>

      <View className="px-6">
        {(Object.keys(ATTRIBUTE_LABELS) as AttributeKey[]).map((key) => (
          <AttributeSlider
            key={key}
            label={ATTRIBUTE_LABELS[key]}
            value={profile[key] ?? null}
            onChange={(v) => setProfile((p) => ({ ...p, [key]: v }))}
            source={profile[key] !== null ? (aiFields.has(key) ? 'ai' : 'manual') : null}
          />
        ))}

        <HandPicker
          value={profile.hand ?? null}
          onChange={(v) => setProfile((p) => ({ ...p, hand: v }))}
        />

        <StylePicker
          value={profile.style ?? null}
          onChange={(v) => setProfile((p) => ({ ...p, style: v }))}
        />

        <View className="mb-4">
          <Text className="text-text-secondary font-inter text-sm mb-2">Observações</Text>
          <TextInput
            className="bg-surface border border-border rounded-xl px-4 py-3 text-text-primary font-inter"
            value={profile.notes ?? ''}
            onChangeText={(v) => setProfile((p) => ({ ...p, notes: v }))}
            multiline
            numberOfLines={3}
            placeholder="Pontos fortes, fracos, observações..."
            placeholderTextColor="#9CA3AF"
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          className="bg-primary rounded-xl h-14 items-center justify-center mt-2"
        >
          {saving
            ? <ActivityIndicator color="#000" />
            : <Text className="text-black font-inter-bold text-base">Salvar perfil</Text>
          }
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
