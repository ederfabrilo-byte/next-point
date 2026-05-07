import { View, Text } from 'react-native';
import Slider from '@react-native-community/slider';

interface Props {
  label: string;
  value: number | null;
  onChange?: (v: number) => void;
  readonly?: boolean;
  source?: 'ai' | 'manual' | null;
}

export default function AttributeSlider({ label, value, onChange, readonly = false, source }: Props) {
  const displayValue = value ?? 0;

  return (
    <View className="mb-4">
      <View className="flex-row items-center justify-between mb-1">
        <View className="flex-row items-center gap-2">
          <Text className="text-text-secondary font-inter text-sm">{label}</Text>
          {source === 'ai' && (
            <Text className="text-xs">📹</Text>
          )}
          {source === 'manual' && value !== null && (
            <Text className="text-text-secondary text-xs">✎</Text>
          )}
        </View>
        <Text className="text-text-primary font-inter-bold text-sm">
          {value !== null ? displayValue.toFixed(1) : '—'}
        </Text>
      </View>
      <Slider
        minimumValue={1}
        maximumValue={5}
        step={0.5}
        value={displayValue === 0 ? 1 : displayValue}
        onValueChange={readonly ? undefined : onChange}
        disabled={readonly}
        minimumTrackTintColor="#F97316"
        maximumTrackTintColor="#333333"
        thumbTintColor={readonly ? '#9CA3AF' : '#F97316'}
        style={{ height: 32 }}
      />
      <View className="flex-row justify-between">
        <Text className="text-text-secondary font-inter text-xs">1.0</Text>
        <Text className="text-text-secondary font-inter text-xs">5.0</Text>
      </View>
    </View>
  );
}
