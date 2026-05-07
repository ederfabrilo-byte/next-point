import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function icon(name: IconName, focused: boolean) {
  return <Ionicons name={focused ? name : (`${name}-outline` as IconName)} size={22} color={focused ? '#F97316' : '#9CA3AF'} />;
}

export default function TeacherLayout() {
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
      <Tabs.Screen name="students" options={{ title: 'Alunos', tabBarIcon: ({ focused }) => icon('people', focused) }} />
      <Tabs.Screen name="video-guidelines" options={{ title: 'Diretrizes', tabBarIcon: ({ focused }) => icon('document-text', focused) }} />
      <Tabs.Screen name="ai-config" options={{ title: 'Config IA', tabBarIcon: ({ focused }) => icon('settings', focused) }} />
    </Tabs>
  );
}
