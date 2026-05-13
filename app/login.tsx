import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../lib/supabase';

export default function LoginScreen() {
  const { role } = useLocalSearchParams<{ role?: string }>();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    if (!email.trim() || !password) return;
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) setError(error.message);
      // success: _layout.tsx onAuthStateChange handles routing
    } catch (e: any) {
      setError(e?.message ?? 'Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: '#0A0A0A' }}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 40 }}>
          {/* Back to splash */}
          <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 32 }}>
            <Text style={{ color: '#F97316', fontFamily: 'Inter_400Regular', fontSize: 14 }}>← Voltar</Text>
          </TouchableOpacity>

          {/* Header */}
          <View style={{ marginBottom: 36 }}>
            <Text style={{ color: '#FFFFFF', fontFamily: 'Inter_700Bold', fontSize: 28 }}>Entrar</Text>
            <Text style={{ color: '#9CA3AF', fontFamily: 'Inter_400Regular', fontSize: 14, marginTop: 6 }}>
              {role === 'teacher' ? 'Acesso de professor' : 'Acesso de jogador'}
            </Text>
          </View>

          {/* Form */}
          <View style={{ gap: 12 }}>
            <TextInput
              style={inputStyle}
              placeholder="E-mail"
              placeholderTextColor="#6B7280"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
            />
            <TextInput
              style={inputStyle}
              placeholder="Senha"
              placeholderTextColor="#6B7280"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            {error ? (
              <Text style={{ color: '#F87171', fontFamily: 'Inter_400Regular', fontSize: 13, textAlign: 'center' }}>
                {error}
              </Text>
            ) : null}

            {/* Forgot password */}
            <TouchableOpacity
              onPress={() => router.push('/forgot-password')}
              style={{ alignSelf: 'flex-end', marginTop: -4 }}
            >
              <Text style={{ color: '#9CA3AF', fontFamily: 'Inter_400Regular', fontSize: 13 }}>
                Esqueci minha senha
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              style={{
                backgroundColor: '#F97316',
                borderRadius: 14,
                height: 56,
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 8,
              }}
            >
              {loading
                ? <ActivityIndicator color="#000" />
                : <Text style={{ color: '#000', fontFamily: 'Inter_700Bold', fontSize: 16 }}>Entrar</Text>
              }
            </TouchableOpacity>
          </View>

          {/* Create account */}
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/register', params: { role: role ?? 'player' } })}
            style={{ marginTop: 28, alignItems: 'center' }}
          >
            <Text style={{ color: '#9CA3AF', fontFamily: 'Inter_400Regular', fontSize: 14 }}>
              Não tem conta?{' '}
              <Text style={{ color: '#F97316', fontFamily: 'Inter_600SemiBold' }}>Criar conta</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const inputStyle = {
  backgroundColor: '#1A1A1A',
  color: '#FFFFFF',
  fontFamily: 'Inter_400Regular' as const,
  borderRadius: 12,
  paddingHorizontal: 16,
  height: 54,
  borderWidth: 1,
  borderColor: '#374151',
  fontSize: 15,
};
