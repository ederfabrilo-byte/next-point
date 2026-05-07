import { View, Text, TouchableOpacity } from 'react-native';
import { Hand, Style } from '../lib/types';

interface HandPickerProps {
  value: Hand | null;
  onChange?: (v: Hand) => void;
  readonly?: boolean;
}

export function HandPicker({ value, onChange, readonly }: HandPickerProps) {
  const options: { key: Hand; label: string }[] = [
    { key: 'right', label: 'Direita' },
    { key: 'left', label: 'Esquerda' },
  ];
  return (
    <View className="mb-4">
      <Text className="text-text-secondary font-inter text-sm mb-2">Mão dominante</Text>
      <View className="flex-row gap-3">
        {options.map((o) => (
          <TouchableOpacity
            key={o.key}
            onPress={() => !readonly && onChange?.(o.key)}
            className={`flex-1 h-10 rounded-xl items-center justify-center border ${
              value === o.key ? 'bg-primary border-primary' : 'bg-surface border-border'
            }`}
          >
            <Text className={`font-inter-semibold text-sm ${value === o.key ? 'text-black' : 'text-text-secondary'}`}>
              {o.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

interface StylePickerProps {
  value: Style | null;
  onChange?: (v: Style) => void;
  readonly?: boolean;
}

export function StylePicker({ value, onChange, readonly }: StylePickerProps) {
  const options: { key: Style; label: string }[] = [
    { key: 'aggressive', label: 'Agressivo' },
    { key: 'defensive', label: 'Defensivo' },
    { key: 'all-around', label: 'All-around' },
  ];
  return (
    <View className="mb-4">
      <Text className="text-text-secondary font-inter text-sm mb-2">Estilo de jogo</Text>
      <View className="flex-row gap-2">
        {options.map((o) => (
          <TouchableOpacity
            key={o.key}
            onPress={() => !readonly && onChange?.(o.key)}
            className={`flex-1 h-10 rounded-xl items-center justify-center border ${
              value === o.key ? 'bg-primary border-primary' : 'bg-surface border-border'
            }`}
          >
            <Text className={`font-inter-semibold text-xs ${value === o.key ? 'text-black' : 'text-text-secondary'}`}>
              {o.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
