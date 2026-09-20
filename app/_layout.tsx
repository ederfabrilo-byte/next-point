import '../global.css';
import { useEffect, useRef } from 'react';
import { Stack, router, useSegments } from 'expo-router';
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
import { registerForPush, listenPushOpened } from '../lib/push';
import { installWebAlert } from '../lib/alert-web';

// Antes de qualquer tela montar: no web, Alert.alert é no-op sem isto.
installWebAlert();

export default function RootLayout() {
  const { session, role, isAdmin, isLoading, setSession, setRole, setIsAdmin, setProfile, setLoading } = useAuthStore();
  const segments = useSegments();
  // Toque numa push antes de o perfil carregar (cold start): guarda e navega depois.
  const pendingPushOpen = useRef(false);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    /** Carrega role/admin/identidade do usuário para o store. */
    async function loadProfile(userId: string) {
      const { data } = await supabase
        .from('users')
        .select('role, is_admin, name, username')
        .eq('id', userId)
        .maybeSingle();
      if (data?.role) setRole(data.role as Role);
      setIsAdmin(data?.is_admin ?? false);
      setProfile(data ? { name: data.name, username: data.username } : null);
      registerForPush(userId);
    }

    async function initSession() {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session?.user) await loadProfile(session.user.id);
      setLoading(false);
    }
    initSession();

    // NÃO usar await em chamadas ao supabase dentro deste callback: ele roda
    // com o lock de auth (navigator.locks) em mãos, e qualquer query espera
    // esse mesmo lock → deadlock, o app inteiro fica no spinner. É o caso
    // documentado pelo Supabase; a saída é adiar para o próximo tick.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        const userId = session.user.id;
        // isLoading segura o redirecionamento até o role chegar — senão a tela
        // pisca em /select-role entre o login e o carregamento do perfil.
        setLoading(true);
        setTimeout(() => { loadProfile(userId).finally(() => setLoading(false)); }, 0);
      }
    });

    const stopPushListener = listenPushOpened(() => {
      pendingPushOpen.current = true;
      openNotificationsTab();
    });

    return () => {
      subscription.unsubscribe();
      stopPushListener();
    };
  }, []);

  /** Leva para a aba Avisos do perfil atual. Se o perfil ainda não carregou, fica pendente. */
  function openNotificationsTab() {
    const { session, role, isAdmin } = useAuthStore.getState();
    if (!session) return;
    const group = isAdmin ? '(admin)' : role === 'player' ? '(player)' : role === 'teacher' ? '(teacher)' : null;
    if (!group) return;
    pendingPushOpen.current = false;
    router.push(`/${group}/notifications`);
  }

  // Guarda de área: manda para a Home certa só quando o usuário está FORA
  // da área dele (login, select-role, área de outro perfil). Se já está na
  // área certa, não mexe — preserva URL digitada / deep link / push.
  useEffect(() => {
    if (!fontsLoaded || isLoading) return;
    const current = segments[0] as string | undefined;
    const group = !session ? null : isAdmin ? '(admin)' : role === 'player' ? '(player)' : role === 'teacher' ? '(teacher)' : null;

    if (!session) {
      if (current !== undefined) router.replace('/');
    } else if (!group) {
      if (current !== 'select-role') router.replace('/select-role');
    } else if (current !== group) {
      router.replace(`/${group}/home`);
    }
    if (pendingPushOpen.current) openNotificationsTab();
  }, [session, role, isAdmin, isLoading, fontsLoaded, segments[0]]);

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
