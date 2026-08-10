import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function icon(name: IconName, focused: boolean) {
  return <Ionicons name={focused ? name : (`${name}-outline` as IconName)} size={22} color={focused ? '#F97316' : '#9CA3AF'} />;
}

export default function AdminLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#1A1A1A', borderTopColor: '#333', height: 60, paddingBottom: 8 },
        tabBarActiveTintColor: '#F97316',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarLabelStyle: { fontFamily: 'Inter_500Medium', fontSize: 10 },
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: ({ focused }) => icon('home', focused) }} />
      <Tabs.Screen name="videos" options={{ title: 'Vídeos', tabBarIcon: ({ focused }) => icon('videocam', focused) }} />
      <Tabs.Screen name="agent" options={{ title: 'Agente', tabBarIcon: ({ focused }) => icon('sparkles', focused) }} />
      <Tabs.Screen name="video-review/[id]" options={{ href: null }} />
    </Tabs>
  );
}
