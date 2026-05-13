import '../global.css';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import * as Notifications from 'expo-notifications';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../lib/store';
import { Role } from '../lib/types';

// Configuração global de como as notificações aparecem quando o app está aberto
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerForPushNotifications(userId: string) {
  if (Platform.OS === 'web') return;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return;

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: '3e292258-d710-4cbe-8778-b18a3a4c5663',
    });

    const token = tokenData.data;

    // Salva token no banco (coluna push_token)
    await supabase
      .from('users')
      .update({ push_token: token })
      .eq('id', userId);
  } catch (e) {
    // Silencioso — notificações são opcionais
    console.warn('Push registration failed:', e);
  }
}

export default function RootLayout() {
  const { session, role, setSession, setRole, setLoading } = useAuthStore();
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    async function initSession() {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session?.user) {
        const { data } = await supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle();
        if (data?.role) setRole(data.role as Role);

        // Registra push notifications
        registerForPushNotifications(session.user.id);
      }
      setLoading(false);
    }
    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        const { data } = await supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle();
        if (data?.role) setRole(data.role as Role);
        registerForPushNotifications(session.user.id);
      }
    });

    // Listener: notificação recebida com app aberto
    notificationListener.current = Notifications.addNotificationReceivedListener(_notification => {
      // Poderia atualizar um badge ou estado global aqui
    });

    // Listener: usuário tocou na notificação
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as Record<string, string> | undefined;
      if (data?.screen) {
        router.push(data.screen as any);
      }
    });

    return () => {
      subscription.unsubscribe();
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  useEffect(() => {
    if (!fontsLoaded) return;

    if (!session) {
      router.replace('/');
    } else if (!role) {
      router.replace('/select-role');
    } else if (role === 'player') {
      router.replace('/(player)/home');
    } else {
      router.replace('/(teacher)/home');
    }
  }, [session, role, fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <>
      <StatusBar style="light" backgroundColor="#0A0A0A" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0A0A0A' } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="forgot-password" />
        <Stack.Screen name="select-role" />
        <Stack.Screen name="(player)" />
        <Stack.Screen name="(teacher)" />
      </Stack>
    </>
  );
}
