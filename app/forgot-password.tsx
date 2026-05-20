import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleReset() {
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo: 'next-point://reset-password' },
      );
      if (error) {
        setError(error.message);
      } else {
        setSent(true);
      }
    } catch (e: any) {
      setError(e?.message ?? 'Erro inesperado.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: '#0A0A0A' }}
    >
      <View style={{ flex: 1, paddingHorizontal: 28, paddingTop: 60 }}>
        {/* Back */}
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 32 }}>
          <Text style={{ color: '#F97316', fontFamily: 'Inter_400Regular', fontSize: 14 }}>← Voltar</Text>
        </TouchableOpacity>

        <Text style={{ color: '#FFFFFF', fontFamily: 'Inter_700Bold', fontSize: 26, marginBottom: 8 }}>
          Recuperar senha
        </Text>
        <Text style={{ color: '#9CA3AF', fontFamily: 'Inter_400Regular', fontSize: 14, marginBottom: 36, lineHeight: 20 }}>
          Informe seu e-mail e enviaremos um link para você criar uma nova senha.
        </Text>

        {sent ? (
          <View style={{
            backgroundColor: 'rgba(74,222,128,0.1)',
            borderWidth: 1,
            borderColor: '#4ade80',
            borderRadius: 16,
            padding: 20,
            alignItems: 'center',
            gap: 10,
          }}>
            <Text style={{ fontSize: 32 }}>📬</Text>
            <Text style={{ color: '#4ade80', fontFamily: 'Inter_600SemiBold', fontSize: 16, textAlign: 'center' }}>
              E-mail enviado!
            </Text>
            <Text style={{ color: '#9CA3AF', fontFamily: 'Inter_400Regular', fontSize: 13, textAlign: 'center', lineHeight: 18 }}>
              Verifique sua caixa de entrada (e spam) para o link de redefinição de senha.
            </Text>
            <TouchableOpacity
              onPress={() => router.back()}
              style={{
                backgroundColor: '#F97316',
                borderRadius: 12,
                paddingHorizontal: 24,
                paddingVertical: 12,
                marginTop: 6,
              }}
            >
              <Text style={{ color: '#000', fontFamily: 'Inter_700Bold', fontSize: 15 }}>Voltar ao login</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            <TextInput
              style={{
                backgroundColor: '#1A1A1A',
                color: '#FFFFFF',
                fontFamily: 'Inter_400Regular',
                borderRadius: 12,
                paddingHorizontal: 16,
                height: 54,
                borderWidth: 1,
                borderColor: '#374151',
                fontSize: 15,
              }}
              placeholder="seu@email.com"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
            />

            {error ? (
              <Text style={{ color: '#F87171', fontFamily: 'Inter_400Regular', fontSize: 13, textAlign: 'center' }}>
                {error}
              </Text>
            ) : null}

            <TouchableOpacity
              onPress={handleReset}
              disabled={loading}
              style={{
                backgroundColor: '#F97316',
                borderRadius: 12,
                height: 56,
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 8,
              }}
            >
              {loading
                ? <ActivityIndicator color="#000" />
                : <Text style={{ color: '#000', fontFamily: 'Inter_700Bold', fontSize: 16 }}>Enviar link</Text>
              }
            </TouchableOpacity>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
