import { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { aiTouchedAttributes } from '../../../lib/analyses';
import { Opponent, Strategy, AttributeKey, ATTRIBUTE_LABELS } from '../../../lib/types';
import AttributeSlider from '../../../components/AttributeSlider';
import { HandPicker, StylePicker } from '../../../components/HandStylePicker';
import ScreenHeader, { goBack } from '../../../components/ScreenHeader';

export default function OpponentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [opponent, setOpponent] = useState<Opponent | null>(null);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [aiAttrs, setAiAttrs] = useState<Set<AttributeKey>>(new Set());
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Partial<Opponent>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [{ data: opp }, { data: strats }, touched] = await Promise.all([
      supabase.from('opponents').select('*').eq('id', id).single(),
      supabase.from('strategies').select('*').eq('opponent_id', id).order('created_at', { ascending: false }),
      aiTouchedAttributes({ opponentId: id }),
    ]);
    setOpponent(opp);
    setStrategies(strats ?? []);
    setAiAttrs(touched);
    setLoading(false);
  }, [id]);

  // Recarrega ao focar: a análise de vídeo reescreve os atributos do adversário
  // por fora desta tela.
  useFocusEffect(useCallback(() => { if (!editing) load(); }, [load, editing]));

  function startEdit() {
    if (!opponent) return;
    setDraft(opponent);
    setEditing(true);
  }

  async function handleSave() {
    if (!draft.name?.trim()) { Alert.alert('Nome obrigatório'); return; }
    setSaving(true);
    const { id: _id, owner_id: _owner, created_at: _created, ...patch } = draft as Opponent;
    const { error } = await supabase.from('opponents').update(patch).eq('id', id);
    setSaving(false);
    if (error) { Alert.alert('Erro', error.message); return; }
    setEditing(false);
    await load();
  }

  function handleDelete() {
    Alert.alert('Excluir adversário?', 'Todas as estratégias também serão removidas.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive',
        onPress: async () => {
          await supabase.from('opponents').delete().eq('id', id);
          goBack();
        },
      },
    ]);
  }

  if (loading) {
    return <View className="flex-1 bg-bg items-center justify-center"><ActivityIndicator color="#F97316" /></View>;
  }
  if (!opponent) {
    return <View className="flex-1 bg-bg items-center justify-center"><Text className="text-text-secondary">Adversário não encontrado.</Text></View>;
  }

  const attrs = Object.keys(ATTRIBUTE_LABELS) as AttributeKey[];

  // ── Modo edição ───────────────────────────────────────────────────────────
  if (editing) {
    return (
      <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="px-6 pt-16 pb-6 flex-row items-center justify-between">
          <Text className="text-text-primary font-inter-bold text-2xl">Editar</Text>
          <TouchableOpacity onPress={() => setEditing(false)}>
            <Text className="text-text-secondary font-inter text-sm">Cancelar</Text>
          </TouchableOpacity>
        </View>

        <View className="px-6">
          <View className="mb-5">
            <Text className="text-text-secondary font-inter text-sm mb-2">Nome *</Text>
            <TextInput
              className="bg-surface border border-border rounded-xl px-4 h-14 text-text-primary font-inter"
              value={draft.name ?? ''}
              onChangeText={(v) => setDraft((p) => ({ ...p, name: v }))}
              placeholder="Nome do adversário"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {attrs.map((key) => (
            <AttributeSlider
              key={key}
              label={ATTRIBUTE_LABELS[key]}
              value={draft[key] ?? null}
              source={aiAttrs.has(key) ? 'ai' : 'manual'}
              onChange={(v) => setDraft((p) => ({ ...p, [key]: v }))}
            />
          ))}

          <HandPicker value={draft.hand ?? null} onChange={(v) => setDraft((p) => ({ ...p, hand: v }))} />
          <StylePicker value={draft.style ?? null} onChange={(v) => setDraft((p) => ({ ...p, style: v }))} />

          <View className="mb-4">
            <Text className="text-text-secondary font-inter text-sm mb-2">Observações</Text>
            <TextInput
              className="bg-surface border border-border rounded-xl px-4 py-3 text-text-primary font-inter"
              value={draft.notes ?? ''}
              onChangeText={(v) => setDraft((p) => ({ ...p, notes: v }))}
              multiline
              numberOfLines={3}
              placeholder="Pontos fortes, fracos, padrões de jogo..."
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
              : <Text className="text-black font-inter-bold text-base">Salvar alterações</Text>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // ── Modo leitura ──────────────────────────────────────────────────────────
  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ paddingBottom: 40 }}>
      <ScreenHeader
        title="Adversário"
        right={
          <View className="flex-row gap-3 mr-1">
            <TouchableOpacity onPress={startEdit} hitSlop={8} className="h-11 justify-center">
              <Text className="text-primary font-inter-semibold text-sm">Editar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDelete} hitSlop={8} className="h-11 justify-center">
              <Text className="text-red-400 font-inter-semibold text-sm">Excluir</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <View className="px-6 pb-6">
        <Text className="text-text-primary font-inter-bold text-2xl">{opponent.name}</Text>
        <View className="flex-row gap-2 mt-2">
          {opponent.style && (
            <View className="bg-surface border border-border rounded-full px-3 py-1">
              <Text className="text-text-secondary font-inter text-xs capitalize">{opponent.style}</Text>
            </View>
          )}
          {opponent.hand && (
            <View className="bg-surface border border-border rounded-full px-3 py-1">
              <Text className="text-text-secondary font-inter text-xs">{opponent.hand === 'right' ? 'Direita' : 'Esquerda'}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Atributos */}
      <View className="px-6 mb-6">
        <Text className="text-text-secondary font-inter-semibold text-xs uppercase tracking-wider mb-4">Atributos</Text>
        {attrs.map((key) => (
          <AttributeSlider
            key={key}
            label={ATTRIBUTE_LABELS[key]}
            value={opponent[key] ?? null}
            source={aiAttrs.has(key) ? 'ai' : 'manual'}
            readonly
          />
        ))}
        {opponent.notes ? (
          <View className="bg-surface border border-border rounded-xl p-4 mt-2">
            <Text className="text-text-secondary font-inter text-sm">{opponent.notes}</Text>
          </View>
        ) : null}
      </View>

      {/* Gerar estratégia */}
      <View className="px-6 mb-6">
        <TouchableOpacity
          onPress={() => router.push({ pathname: '/(player)/strategy', params: { opponentId: id } })}
          className="bg-primary rounded-xl h-14 items-center justify-center"
        >
          <Text className="text-black font-inter-bold text-base">💡 Gerar estratégia</Text>
        </TouchableOpacity>
      </View>

      {/* Histórico de estratégias */}
      {strategies.length > 0 && (
        <View className="px-6">
          <Text className="text-text-secondary font-inter-semibold text-xs uppercase tracking-wider mb-4">Estratégias geradas</Text>
          {strategies.map((s) => (
            <TouchableOpacity
              key={s.id}
              onPress={() => router.push(`/(player)/strategy/${s.id}`)}
              className="bg-surface border border-border rounded-2xl p-4 mb-3 active:opacity-75"
            >
              <View className="flex-row items-center gap-2 mb-2">
                <View className="bg-ai-bg px-2 py-0.5 rounded-full">
                  <Text className="text-ai-text font-inter text-xs">IA</Text>
                </View>
                <Text className="text-text-secondary font-inter text-xs">
                  {new Date(s.created_at).toLocaleDateString('pt-BR')}
                </Text>
              </View>
              <Text className="text-text-primary font-inter text-sm" numberOfLines={2}>{s.content}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
