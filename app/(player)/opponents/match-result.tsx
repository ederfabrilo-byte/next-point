import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, ScrollView, Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../lib/store';

export default function MatchResultScreen() {
  const { opponentId, opponentName } = useLocalSearchParams<{ opponentId: string; opponentName?: string }>();
  const { user } = useAuthStore();

  const [playerSets, setPlayerSets] = useState(0);
  const [opponentSets, setOpponentSets] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  function formatDateDisplay(iso: string) {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  function parseDateInput(text: string) {
    // Accept DD/MM/YYYY and convert to YYYY-MM-DD
    const cleaned = text.replace(/\D/g, '').slice(0, 8);
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 4) return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    const d = cleaned.slice(0, 2);
    const m = cleaned.slice(2, 4);
    const y = cleaned.slice(4, 8);
    return `${d}/${m}/${y}`;
  }

  async function handleSave() {
    if (!user) return;
    if (!date || date.length < 10) { Alert.alert('Data inválida', 'Informe uma data válida.'); return; }

    // Convert DD/MM/YYYY → YYYY-MM-DD for storage
    let isoDate = date;
    if (date.includes('/')) {
      const [d, m, y] = date.split('/');
      isoDate = `${y}-${m}-${d}`;
    }

    setSaving(true);
    const { error } = await supabase.from('match_results').insert({
      player_id: user.id,
      opponent_id: opponentId,
      player_sets: playerSets,
      opponent_sets: opponentSets,
      date: isoDate,
      notes: notes.trim() || null,
    });
    setSaving(false);

    if (error) {
      Alert.alert('Erro', error.message);
      return;
    }
    router.back();
  }

  function Counter({
    label, value, onChange,
  }: { label: string; value: number; onChange: (v: number) => void }) {
    return (
      <View className="items-center flex-1">
        <Text className="text-text-secondary font-inter text-xs mb-3 uppercase tracking-wider">{label}</Text>
        <View className="flex-row items-center gap-5">
          <TouchableOpacity
            onPress={() => onChange(Math.max(0, value - 1))}
            className="bg-surface border border-border rounded-full w-10 h-10 items-center justify-center"
          >
            <Text className="text-text-primary font-inter-bold text-xl">−</Text>
          </TouchableOpacity>
          <Text className="text-text-primary font-inter-bold text-4xl w-10 text-center">{value}</Text>
          <TouchableOpacity
            onPress={() => onChange(value + 1)}
            className="bg-surface border border-border rounded-full w-10 h-10 items-center justify-center"
          >
            <Text className="text-text-primary font-inter-bold text-xl">+</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const result = playerSets > opponentSets ? '🏆 Vitória' : playerSets < opponentSets ? '😔 Derrota' : playerSets > 0 ? '🤝 Empate' : null;

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
      {/* Header */}
      <View className="px-6 pt-16 pb-4 flex-row items-center justify-between">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-primary font-inter text-sm">← Voltar</Text>
        </TouchableOpacity>
      </View>

      <View className="px-6 pb-6">
        <Text className="text-text-primary font-inter-bold text-2xl">Registrar partida</Text>
        {opponentName ? (
          <Text className="text-text-secondary font-inter text-sm mt-1">vs. {opponentName}</Text>
        ) : null}
      </View>

      {/* Sets counter */}
      <View className="mx-6 bg-surface border border-border rounded-2xl p-6 mb-6">
        <Text className="text-text-secondary font-inter-semibold text-xs uppercase tracking-wider text-center mb-6">
          Sets vencidos
        </Text>
        <View className="flex-row justify-around">
          <Counter label="Você" value={playerSets} onChange={setPlayerSets} />
          <View className="w-px bg-border" />
          <Counter label={opponentName ?? 'Adversário'} value={opponentSets} onChange={setOpponentSets} />
        </View>

        {result ? (
          <View className="mt-6 items-center">
            <Text className="text-text-primary font-inter-bold text-xl">{result}</Text>
          </View>
        ) : null}
      </View>

      {/* Date */}
      <View className="px-6 mb-4">
        <Text className="text-text-secondary font-inter text-sm mb-2">Data da partida</Text>
        <TextInput
          className="bg-surface border border-border rounded-xl px-4 h-12 text-text-primary font-inter"
          value={date.includes('-') ? formatDateDisplay(date) : date}
          onChangeText={(v) => {
            const formatted = parseDateInput(v);
            setDate(formatted);
          }}
          placeholder="DD/MM/AAAA"
          placeholderTextColor="#6B7280"
          keyboardType="numeric"
        />
      </View>

      {/* Notes */}
      <View className="px-6 mb-6">
        <Text className="text-text-secondary font-inter text-sm mb-2">Observações (opcional)</Text>
        <TextInput
          className="bg-surface border border-border rounded-xl px-4 py-3 text-text-primary font-inter"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          placeholder="Condições, pontos importantes..."
          placeholderTextColor="#6B7280"
          textAlignVertical="top"
          style={{ minHeight: 80 }}
        />
      </View>

      {/* Save */}
      <View className="px-6">
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          className="bg-primary rounded-xl h-14 items-center justify-center"
        >
          {saving
            ? <ActivityIndicator color="#000" />
            : <Text className="text-black font-inter-bold text-base">Salvar resultado</Text>
          }
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
