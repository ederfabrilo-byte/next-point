import { ReactNode } from 'react';
import { ViewStyle } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface FadeInViewProps {
  children: ReactNode;
  index?: number;
  style?: ViewStyle;
}

export default function FadeInView({ children, index = 0, style }: FadeInViewProps) {
  return (
    <Animated.View
      entering={FadeInDown.duration(350).delay(Math.min(index, 8) * 70)}
      style={style}
    >
      {children}
    </Animated.View>
  );
}
