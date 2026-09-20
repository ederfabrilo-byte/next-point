import { ReactNode } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../lib/store';

/** Home do perfil atual — para onde "voltar" leva quando não há histórico. */
export function homeRoute(): string {
  const { isAdmin, role } = useAuthStore.getState();
  if (isAdmin) return '/(admin)/home';
  if (role === 'teacher') return '/(teacher)/home';
  return '/(player)/home';
}

/**
 * Volta uma tela; sem histórico (página aberta direto no web, deep link),
 * cai na Home do perfil em vez de não fazer nada.
 */
export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace(homeRoute());
}

interface Props {
  title: string;
  subtitle?: string | null;
  /** Ações à direita (Editar, Excluir…). O botão Home vem depois delas. */
  right?: ReactNode;
  /** Esconde o botão Home (padrão: mostra). */
  home?: boolean;
}

/**
 * Cabeçalho padrão das telas fora das abas: ← voltar, título e um atalho
 * para a Home. Alvos de toque de 44px — funciona com dedo e com mouse.
 */
export default function ScreenHeader({ title, subtitle, right, home = true }: Props) {
  return (
    <View className="px-4 pt-14 pb-4 flex-row items-center gap-2">
      <TouchableOpacity
        onPress={goBack}
        hitSlop={8}
        accessibilityLabel="Voltar"
        className="w-11 h-11 rounded-full items-center justify-center active:bg-surface"
      >
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>

      <View className="flex-1">
        <Text className="text-text-primary font-inter-bold text-2xl" numberOfLines={1}>{title}</Text>
        {subtitle ? (
          <Text className="text-text-secondary font-inter text-sm" numberOfLines={1}>{subtitle}</Text>
        ) : null}
      </View>

      {right}

      {home && (
        <TouchableOpacity
          onPress={() => router.replace(homeRoute())}
          hitSlop={8}
          accessibilityLabel="Início"
          className="w-11 h-11 rounded-full items-center justify-center active:bg-surface"
        >
          <Ionicons name="home-outline" size={22} color="#9CA3AF" />
        </TouchableOpacity>
      )}
    </View>
  );
}
