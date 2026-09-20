import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUnreadCount } from '../../lib/notifications';
import { column } from '../../lib/layout';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function icon(name: IconName, focused: boolean) {
  return <Ionicons name={focused ? name : (`${name}-outline` as IconName)} size={22} color={focused ? '#F97316' : '#9CA3AF'} />;
}

export default function TeacherLayout() {
  const { count } = useUnreadCount();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // PC: conteúdo e barra de abas numa coluna centralizada; celular: tela cheia.
        sceneStyle: { backgroundColor: '#0A0A0A', ...column },
        tabBarStyle: { backgroundColor: '#1A1A1A', borderTopColor: '#333', height: 60, paddingBottom: 8, ...column },
        tabBarActiveTintColor: '#F97316',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarLabelStyle: { fontFamily: 'Inter_500Medium', fontSize: 10 },
        tabBarBadgeStyle: { backgroundColor: '#F97316', color: '#000', fontSize: 10, fontFamily: 'Inter_700Bold' },
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: ({ focused }) => icon('home', focused) }} />
      <Tabs.Screen name="students" options={{ title: 'Alunos', tabBarIcon: ({ focused }) => icon('people', focused) }} />
      <Tabs.Screen name="videos" options={{ title: 'Vídeos', tabBarIcon: ({ focused }) => icon('videocam', focused) }} />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Avisos',
          tabBarIcon: ({ focused }) => icon('notifications', focused),
          tabBarBadge: count > 0 ? (count > 99 ? '99+' : count) : undefined,
        }}
      />
      <Tabs.Screen name="student/[id]" options={{ href: null }} />
      <Tabs.Screen name="video-review/[id]" options={{ href: null }} />
    </Tabs>
  );
}
