import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../lib/store';

const SECTIONS = [
  { key: 'geral', label: 'Critérios gerais', icon: 'analytics-outline', placeholder: 'O que a IA deve priorizar na análise? Ex: consistência nos golpes, posicionamento na quadra, leitura de jogo...' },
  { key: 'forehand', label: 'Forehand', icon: 'tennisball-outline', placeholder: 'Como avaliar o forehand? Ex: empunhadura, ponto de contato, rotação do quadril, follow-through...' },
  { key: 'backhand', label: 'Backhand', icon: 'tennisball-outline', placeholder: 'Como avaliar o backhand? Ex: backhand a duas mãos ou uma mão, estabilidade, direção...' },
  { key: 'saque', label: 'Saque', icon: 'arrow-up-outline', placeholder: 'Como avaliar o saque? Ex: lançamento de bola, ritmo, variação de spin, primeiro x segundo saque...' },
  { key: 'voleio', label: 'Voleio', icon: 'swap-horizontal-outline', placeholder: 'Como avaliar o voleio? Ex: posição na rede, ação de punho, antecipação...' },
  { key: 'movimentacao', label: 'Movimentação', icon: 'footsteps-outline', placeholder: 'Como avaliar a movimentação? Ex: passo de ajuste, recuperação ao centro, split step...' },
  { key: 'mental', label: 'Aspecto mental', icon: 'bulb-outline', placeholder: 'O que observar no aspecto mental? Ex: linguagem corporal, tomada de decisão sob pressão, ritmo entre pontos...' },
] as const;

type SectionKey = typeof SECTIONS[number]['key'];
type Guidelines = Partial<Record<SectionKey, string>>;

export default function VideoGuidelinesScreen() {
  const { user } = useAuthStore();
  const [guidelines, setGuidelines] = useState<Guidelines>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<SectionKey | null>('geral');

  useEffect(() => {
    if (!user) return;
    supabase
      .from('video_analysis_config')
      .select('guidelines')
      .eq('teacher_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.guidelines) {
          try { setGuidelines(JSON.parse(data.guidelines)); } catch { setGuidelines({}); }
        }
        setLoading(false);
      });
  }, [user]);

  function update(key: SectionKey, value: string) {
    setGuidelines((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from('video_analysis_config')
      .upsert({ teacher_id: user.id, guidelines: JSON.stringify(guidelines), updated_at: new Date().toISOString() });
    setSaving(false);
    if (error) { Alert.alert('Erro', error.message); return; }
    Alert.alert('Salvo', 'Diretrizes atualizadas. A IA vai usá-las nas próximas análises de vídeo.');
  }

  function filledCount() {
    return SECTIONS.filter((s) => guidelines[s.key]?.trim()).length;
  }

  if (loading) {
    return <View className="flex-1 bg-bg items-center justify-center"><ActivityIndicator color="#F97316" /></View>;
  }

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ paddingBottom: 40 }}>
      <View className="px-6 pt-16 pb-4">
        <View className="flex-row items-center gap-2 mb-1">
          <Text className="text-text-primary font-inter-bold text-2xl">Diretrizes de Análise</Text>
          <View className="bg-ai-bg px-2 py-0.5 rounded-full">
            <Text className="text-ai-text font-inter text-xs">IA</Text>
          </View>
        </View>
        <Text className="text-text-secondary font-inter text-sm">
          Ensine a IA a analisar vídeos com a sua técnica · {filledCount()}/{SECTIONS.length} seções preenchidas
        </Text>
      </View>

      {/* Banner explicativo */}
      <View className="mx-6 mb-5 bg-ai-bg border border-green-800 rounded-2xl p-4 flex-row gap-3">
        <Ionicons name="information-circle" size={20} color="#4ade80" />
        <Text className="text-ai-text font-inter text-sm flex-1">
          Quanto mais detalhadas as diretrizes, mais precisa será a análise. A IA vai seguir sua metodologia ao avaliar cada vídeo enviado por um jogador.
        </Text>
      </View>

      <View className="px-6 gap-3">
        {SECTIONS.map((section) => {
          const isOpen = expanded === section.key;
          const filled = !!guidelines[section.key]?.trim();
          return (
            <View key={section.key} className="bg-surface border border-border rounded-2xl overflow-hidden">
              <TouchableOpacity
                onPress={() => setExpanded(isOpen ? null : section.key)}
                className="flex-row items-center justify-between p-4"
              >
                <View className="flex-row items-center gap-3">
                  <Ionicons name={section.icon as any} size={18} color={filled ? '#F97316' : '#9CA3AF'} />
                  <Text className={`font-inter-bold text-base ${filled ? 'text-text-primary' : 'text-text-secondary'}`}>
                    {section.label}
                  </Text>
                  {filled && (
                    <View className="bg-primary/20 rounded-full px-2 py-0.5">
                      <Text className="text-primary font-inter text-xs">✓ preenchido</Text>
                    </View>
                  )}
                </View>
                <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color="#9CA3AF" />
              </TouchableOpacity>

              {isOpen && (
                <View className="px-4 pb-4 border-t border-border">
                  <TextInput
                    className="bg-bg border border-border rounded-xl px-4 py-3 text-text-primary font-inter mt-3"
                    value={guidelines[section.key] ?? ''}
                    onChangeText={(v) => update(section.key, v)}
                    multiline
                    numberOfLines={5}
                    placeholder={section.placeholder}
                    placeholderTextColor="#9CA3AF"
                    textAlignVertical="top"
                    style={{ minHeight: 120 }}
                  />
                </View>
              )}
            </View>
          );
        })}

        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          className="bg-primary rounded-xl h-14 items-center justify-center mt-2"
        >
          {saving
            ? <ActivityIndicator color="#000" />
            : <Text className="text-black font-inter-bold text-base">Salvar diretrizes</Text>
          }
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
