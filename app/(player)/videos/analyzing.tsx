import { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function AnalyzingScreen() {
  const dots = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/(player)/videos');
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View className="flex-1 bg-bg items-center justify-center px-6">
      <View className="bg-ai-bg rounded-full p-6 mb-6">
        <Ionicons name="analytics" size={48} color="#4ade80" />
      </View>

      <Text className="text-text-primary font-inter-bold text-2xl text-center mb-2">
        Analisando vídeo
      </Text>
      <Text className="text-text-secondary font-inter text-sm text-center mb-8">
        Nossa IA está extraindo seus atributos técnicos. Você receberá uma notificação quando estiver pronto.
      </Text>

      <View className="bg-surface border border-border rounded-2xl p-5 w-full mb-8">
        <View className="flex-row items-center gap-3 mb-3">
          <Ionicons name="checkmark-circle" size={18} color="#4ade80" />
          <Text className="text-text-primary font-inter text-sm">Vídeo enviado</Text>
        </View>
        <View className="flex-row items-center gap-3 mb-3">
          <Ionicons name="checkmark-circle" size={18} color="#4ade80" />
          <Text className="text-text-primary font-inter text-sm">Frames extraídos</Text>
        </View>
        <View className="flex-row items-center gap-3">
          <Ionicons name="time-outline" size={18} color="#F97316" />
          <Text className="text-primary font-inter text-sm">Análise em andamento...</Text>
        </View>
      </View>

      <TouchableOpacity onPress={() => router.replace('/(player)/videos')} className="mt-2">
        <Text className="text-text-secondary font-inter text-sm">Ver todos os vídeos</Text>
      </TouchableOpacity>
    </View>
  );
}
