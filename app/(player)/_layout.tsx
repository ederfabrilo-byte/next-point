import { Stack } from 'expo-router';

export default function PlayerLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0A0A0A' } }} />
  );
}
