import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../lib/store';

const ZECA_EMAIL = 'zeca@nextpoint.app';

const DEFAULT_PROMPT = `Você é um coach de tênis especializado em análise estratégica de alto nível.
Com base nos atributos técnicos do jogador e do adversário, elabore uma estratégia detalhada em português brasileiro.
Seja objetivo e prático. Cubra: padrões de jogo recomendados, pontos fracos do adversário a explorar, como neutralizar os pontos fortes dele, e dicas táticas concretas para cada situação de jogo.
Responda em texto corrido, sem usar markdown.`;

export default function AIConfigScreen() {
  const { user } = useAuthStore();
  const [prompt, setPrompt] = useState('');
  const [configId, setConfigId] = useState<string | null>(null);
  const [version, setVersion] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const isZeca = user?.email === ZECA_EMAIL;

  useEffect(() => {
    supabase
      .from('coach_config')
      .select('*')
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setPrompt(data.system_prompt);
          setConfigId(data.id);
          setVersion(data.version);
        } else {
          setPrompt(DEFAULT_PROMPT);
        }
        setLoading(false);
      });
  }, []);

  async function handleSave() {
    if (!prompt.trim() || !user) return;
    setSaving(true);
    const { error } = await supabase.from('coach_config').insert({
      coach_id: user.id,
      system_prompt: prompt.trim(),
      version: version + 1,
    });
    setSaving(false);
    if (error) { Alert.alert('Erro', error.message); return; }
    setVersion((v) => v + 1);
    Alert.alert('Salvo', `System prompt atualizado. Versão ${version + 1} ativa.`);
  }

  async function handleReset() {
    Alert.alert('Restaurar padrão', 'Isso vai substituir o prompt atual pelo padrão do sistema.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Restaurar', style: 'destructive', onPress: () => setPrompt(DEFAULT_PROMPT) },
    ]);
  }

  if (loading) {
    return <View className="flex-1 bg-bg items-center justify-center"><ActivityIndicator color="#F97316" /></View>;
  }

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ paddingBottom: 40 }}>
      <View className="px-6 pt-16 pb-6">
        <View className="flex-row items-center gap-2 mb-1">
          <Text className="text-text-primary font-inter-bold text-2xl">Config de IA</Text>
          <View className="bg-ai-bg px-2 py-0.5 rounded-full">
            <Text className="text-ai-text font-inter text-xs">IA</Text>
          </View>
        </View>
        <Text className="text-text-secondary font-inter text-sm">
          System prompt usado na geração de estratégias · v{version}
        </Text>
      </View>

      <View className="px-6 gap-4">
        {!isZeca && (
          <View className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 flex-row items-center gap-3">
            <Ionicons name="lock-closed" size={18} color="#facc15" />
            <Text className="text-yellow-400 font-inter text-sm flex-1">
              Somente o Prof. Zeca Mota pode editar o system prompt.
            </Text>
          </View>
        )}

        <View>
          <Text className="text-text-secondary font-inter text-sm mb-2">System prompt</Text>
          <TextInput
            className="bg-surface border border-border rounded-xl px-4 py-4 text-text-primary font-inter"
            value={prompt}
            onChangeText={setPrompt}
            multiline
            editable={isZeca}
            placeholder="Descreva o comportamento do coach de IA..."
            placeholderTextColor="#9CA3AF"
            textAlignVertical="top"
            style={{ minHeight: 240, opacity: isZeca ? 1 : 0.6 }}
          />
        </View>

        {isZeca && (
          <View className="gap-3">
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              className="bg-primary rounded-xl h-14 items-center justify-center"
            >
              {saving
                ? <ActivityIndicator color="#000" />
                : <Text className="text-black font-inter-bold text-base">Salvar nova versão</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity onPress={handleReset} className="items-center py-2">
              <Text className="text-text-secondary font-inter text-sm">Restaurar prompt padrão</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
