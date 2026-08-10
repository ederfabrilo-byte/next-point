import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../lib/store';

interface AgentConfig {
  base_context: string;
  strategy_guidance: string;
  video_guidance: string;
}

const EMPTY: AgentConfig = { base_context: '', strategy_guidance: '', video_guidance: '' };

const SECTIONS: { key: keyof AgentConfig; label: string; icon: string; hint: string; placeholder: string }[] = [
  {
    key: 'base_context',
    label: 'Contexto & identidade',
    icon: 'sparkles-outline',
    hint: 'Aplicado a TUDO — estratégia e vídeo',
    placeholder: 'Quem é o agente, sua filosofia de coaching, tom, princípios técnicos que valem para qualquer análise. Ex: "Você é o assistente do Prof. Zeca Mota, especialista em tênis de base. Priorize fundamentos, seja direto e prático..."',
  },
  {
    key: 'strategy_guidance',
    label: 'Orientação — Estratégia',
    icon: 'bulb-outline',
    hint: 'Só na geração de estratégias de jogo',
    placeholder: 'Como montar estratégias contra adversários. Ex: padrões de jogo a recomendar, como explorar pontos fracos, como neutralizar pontos fortes, formato da resposta...',
  },
  {
    key: 'video_guidance',
    label: 'Orientação — Vídeo',
    icon: 'videocam-outline',
    hint: 'Só na análise técnica de vídeos',
    placeholder: 'Como a IA deve avaliar a técnica nos vídeos. Ex: o que observar em cada golpe, critérios de nota, empunhadura, ponto de contato, movimentação...',
  },
];

export default function AgentScreen() {
  const { user } = useAuthStore();
  const [config, setConfig] = useState<AgentConfig>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<keyof AgentConfig | null>('base_context');

  useEffect(() => {
    supabase
      .from('ai_agent_config')
      .select('base_context, strategy_guidance, video_guidance')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setConfig({
            base_context: data.base_context ?? '',
            strategy_guidance: data.strategy_guidance ?? '',
            video_guidance: data.video_guidance ?? '',
          });
        }
        setLoading(false);
      });
  }, []);

  function update(key: keyof AgentConfig, value: string) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('ai_agent_config').insert({
      base_context: config.base_context.trim() || null,
      strategy_guidance: config.strategy_guidance.trim() || null,
      video_guidance: config.video_guidance.trim() || null,
      updated_by: user.id,
    });
    setSaving(false);
    if (error) { Alert.alert('Erro', error.message); return; }
    Alert.alert('Salvo', 'Agente atualizado. As próximas estratégias e análises de vídeo vão seguir estas orientações.');
  }

  const filledCount = SECTIONS.filter((s) => config[s.key]?.trim()).length;

  if (loading) {
    return <View className="flex-1 bg-bg items-center justify-center"><ActivityIndicator color="#F97316" /></View>;
  }

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ paddingBottom: 40 }}>
      <View className="px-6 pt-16 pb-4">
        <View className="flex-row items-center gap-2 mb-1">
          <Text className="text-text-primary font-inter-bold text-2xl">Agente de IA</Text>
          <View className="bg-ai-bg px-2 py-0.5 rounded-full">
            <Text className="text-ai-text font-inter text-xs">IA</Text>
          </View>
        </View>
        <Text className="text-text-secondary font-inter text-sm">
          O cérebro que baliza estratégias e análises · {filledCount}/{SECTIONS.length} seções
        </Text>
      </View>

      {/* Banner */}
      <View className="mx-6 mb-5 bg-ai-bg border border-green-800 rounded-2xl p-4 flex-row gap-3">
        <Ionicons name="information-circle" size={20} color="#4ade80" />
        <Text className="text-ai-text font-inter text-sm flex-1">
          Tudo que você escrever aqui vira o contexto que a IA segue. O "Contexto & identidade" vale para tudo; as outras seções são específicas de cada análise.
        </Text>
      </View>

      <View className="px-6 gap-3">
        {SECTIONS.map((section) => {
          const isOpen = expanded === section.key;
          const filled = !!config[section.key]?.trim();
          return (
            <View key={section.key} className="bg-surface border border-border rounded-2xl overflow-hidden">
              <TouchableOpacity
                onPress={() => setExpanded(isOpen ? null : section.key)}
                className="flex-row items-center justify-between p-4"
              >
                <View className="flex-row items-center gap-3 flex-1">
                  <Ionicons name={section.icon as any} size={18} color={filled ? '#F97316' : '#9CA3AF'} />
                  <View className="flex-1">
                    <Text className={`font-inter-bold text-base ${filled ? 'text-text-primary' : 'text-text-secondary'}`}>
                      {section.label}
                    </Text>
                    <Text className="text-text-secondary font-inter text-xs">{section.hint}</Text>
                  </View>
                  {filled && (
                    <View className="bg-primary/20 rounded-full px-2 py-0.5">
                      <Text className="text-primary font-inter text-xs">✓</Text>
                    </View>
                  )}
                </View>
                <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color="#9CA3AF" />
              </TouchableOpacity>

              {isOpen && (
                <View className="px-4 pb-4 border-t border-border">
                  <TextInput
                    className="bg-bg border border-border rounded-xl px-4 py-3 text-text-primary font-inter mt-3"
                    value={config[section.key]}
                    onChangeText={(v) => update(section.key, v)}
                    multiline
                    placeholder={section.placeholder}
                    placeholderTextColor="#9CA3AF"
                    textAlignVertical="top"
                    style={{ minHeight: 160 }}
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
            : <Text className="text-black font-inter-bold text-base">Salvar Agente</Text>
          }
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
