import '../global.css';
import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../lib/store';
import { Role } from '../lib/types';

export default function RootLayout() {
  const { session, role, isAdmin, setSession, setRole, setIsAdmin, setLoading } = useAuthStore();

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
          .select('role, is_admin')
          .eq('id', session.user.id)
          .maybeSingle();
        if (data?.role) setRole(data.role as Role);
        setIsAdmin(data?.is_admin ?? false);
      }
      setLoading(false);
    }
    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        const { data } = await supabase
          .from('users')
          .select('role, is_admin')
          .eq('id', session.user.id)
          .maybeSingle();
        if (data?.role) setRole(data.role as Role);
        setIsAdmin(data?.is_admin ?? false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!fontsLoaded) return;

    if (!session) {
      router.replace('/');
    } else if (isAdmin) {
      router.replace('/(admin)/home');
    } else if (!role) {
      router.replace('/select-role');
    } else if (role === 'player') {
      router.replace('/(player)/home');
    } else {
      router.replace('/(teacher)/home');
    }
  }, [session, role, isAdmin, fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <>
      <StatusBar style="light" backgroundColor="#0A0A0A" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0A0A0A' } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="select-role" />
        <Stack.Screen name="(player)" />
        <Stack.Screen name="(teacher)" />
        <Stack.Screen name="(admin)" />
      </Stack>
    </>
  );
}
