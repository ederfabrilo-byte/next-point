import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../lib/store';
import { Opponent, AttributeKey, ATTRIBUTE_LABELS } from '../../../lib/types';
import AttributeSlider from '../../../components/AttributeSlider';
import { HandPicker, StylePicker } from '../../../components/HandStylePicker';

export default function NewOpponent() {
  const { user } = useAuthStore();
  const [form, setForm] = useState<Partial<Opponent>>({});
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!user) return;
    if (!form.name?.trim()) { Alert.alert('Nome obrigatório'); return; }
    setSaving(true);
    const { error } = await supabase.from('opponents').insert({ ...form, owner_id: user.id });
    setSaving(false);
    if (error) Alert.alert('Erro', error.message);
    else router.back();
  }

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ paddingBottom: 40 }}>
      <View className="px-6 pt-16 pb-6 flex-row items-center justify-between">
        <Text className="text-text-primary font-inter-bold text-2xl">Novo Adversário</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-text-secondary font-inter text-sm">Cancelar</Text>
        </TouchableOpacity>
      </View>

      <View className="px-6">
        <View className="mb-5">
          <Text className="text-text-secondary font-inter text-sm mb-2">Nome *</Text>
          <TextInput
            className="bg-surface border border-border rounded-xl px-4 h-14 text-text-primary font-inter"
            value={form.name ?? ''}
            onChangeText={(v) => setForm((p) => ({ ...p, name: v }))}
            placeholder="Nome do adversário"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {(Object.keys(ATTRIBUTE_LABELS) as AttributeKey[]).map((key) => (
          <AttributeSlider
            key={key}
            label={ATTRIBUTE_LABELS[key]}
            value={form[key] ?? null}
            onChange={(v) => setForm((p) => ({ ...p, [key]: v }))}
          />
        ))}

        <HandPicker value={form.hand ?? null} onChange={(v) => setForm((p) => ({ ...p, hand: v }))} />
        <StylePicker value={form.style ?? null} onChange={(v) => setForm((p) => ({ ...p, style: v }))} />

        <View className="mb-4">
          <Text className="text-text-secondary font-inter text-sm mb-2">Observações</Text>
          <TextInput
            className="bg-surface border border-border rounded-xl px-4 py-3 text-text-primary font-inter"
            value={form.notes ?? ''}
            onChangeText={(v) => setForm((p) => ({ ...p, notes: v }))}
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
            : <Text className="text-black font-inter-bold text-base">Salvar adversário</Text>
          }
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
