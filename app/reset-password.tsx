import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '../lib/supabase';
import { sessionFromResetUrl } from '../lib/auth';

/**
 * Destino do link "Esqueci minha senha". O link traz os tokens no fragmento
 * da URL; aqui a sessão é aberta a partir deles e o usuário define a nova
 * senha. Sem tokens válidos (link vencido, aberto duas vezes), avisa e volta.
 */
export default function ResetPasswordScreen() {
  const [checking, setChecking] = useState(true);
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      const url = Platform.OS === 'web' && typeof window !== 'undefined'
        ? window.location.href
        : await Linking.getInitialURL();
      let ok = await sessionFromResetUrl(url);
      // Já havia sessão (usuário logado abriu o link): também pode trocar.
      if (!ok) ok = !!(await supabase.auth.getSession()).data.session;
      setReady(ok);
      setChecking(false);
      // Tira os tokens da barra de endereço no web.
      if (ok && Platform.OS === 'web' && typeof window !== 'undefined' && window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    })();
  }, []);

  async function handleSave() {
    if (password.length < 6) { setError('A senha precisa ter ao menos 6 caracteres.'); return; }
    if (password !== confirm) { setError('As senhas não conferem.'); return; }
    setSaving(true);
    setError('');
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) { setError(error.message); return; }
    setDone(true);
    setTimeout(() => router.replace('/'), 1200);
  }

  if (checking) {
    return <View className="flex-1 bg-bg items-center justify-center"><ActivityIndicator color="#F97316" /></View>;
  }

  return (
    <View className="flex-1 bg-bg items-center">
      <View className="flex-1 w-full px-6 justify-center" style={{ maxWidth: 560 }}>
        <Text className="text-text-primary font-inter-bold text-2xl mb-1">Definir nova senha</Text>

        {!ready ? (
          <>
            <Text className="text-text-secondary font-inter text-sm mb-6">
              Este link não é mais válido. Peça um novo em "Esqueci minha senha".
            </Text>
            <TouchableOpacity onPress={() => router.replace('/')} className="bg-primary rounded-xl h-14 items-center justify-center">
              <Text className="text-black font-inter-bold text-base">Voltar ao login</Text>
            </TouchableOpacity>
          </>
        ) : done ? (
          <Text className="text-green-400 font-inter text-sm">Senha alterada. Entrando…</Text>
        ) : (
          <View className="gap-3">
            <Text className="text-text-secondary font-inter text-sm mb-2">Escolha uma senha com pelo menos 6 caracteres.</Text>
            <TextInput
              className="bg-surface text-text-primary font-inter rounded-xl px-4 h-14 border border-border"
              placeholder="Nova senha"
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoFocus
            />
            <TextInput
              className="bg-surface text-text-primary font-inter rounded-xl px-4 h-14 border border-border"
              placeholder="Confirmar nova senha"
              placeholderTextColor="#9CA3AF"
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
              onSubmitEditing={handleSave}
            />
            {error ? <Text className="text-red-400 font-inter text-sm text-center">{error}</Text> : null}
            <TouchableOpacity onPress={handleSave} disabled={saving} className="bg-primary rounded-xl h-14 items-center justify-center mt-2">
              {saving ? <ActivityIndicator color="#000" /> : <Text className="text-black font-inter-bold text-base">Salvar nova senha</Text>}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}
