import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { supabase } from '../lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  async function handleAuth() {
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setInfo('');
      setError('Preencha e-mail e senha.');
      return;
    }
    if (isSignUp && password.length < 6) {
      setInfo('');
      setError('A senha precisa ter ao menos 6 caracteres.');
      return;
    }
    setLoading(true);
    setError('');
    setInfo('');

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({ email: cleanEmail, password });
        if (error) {
          setError(error.message);
        } else if (!data.session) {
          setInfo('Conta criada! Verifique seu e-mail para confirmar o cadastro.');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (error) setError(error.message);
      }
    } catch (e: any) {
      setError(e?.message ?? 'Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-bg"
    >
      <View className="flex-1 justify-center px-6">
        {/* Logo */}
        <View className="items-center mb-12">
          <Text className="text-primary font-inter-bold text-5xl tracking-tight">NP</Text>
          <Text className="text-text-primary font-inter-bold text-2xl mt-2">Next Point</Text>
          <Text className="text-text-secondary font-inter text-sm mt-1">Tênis inteligente</Text>
        </View>

        {/* Form */}
        <View className="gap-3">
          <TextInput
            className="bg-surface text-text-primary font-inter rounded-xl px-4 h-14 border border-border"
            placeholder="E-mail"
            placeholderTextColor="#9CA3AF"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            className="bg-surface text-text-primary font-inter rounded-xl px-4 h-14 border border-border"
            placeholder="Senha"
            placeholderTextColor="#9CA3AF"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {error ? (
            <Text className="text-red-400 font-inter text-sm text-center">{error}</Text>
          ) : null}
          {info ? (
            <Text className="text-green-400 font-inter text-sm text-center">{info}</Text>
          ) : null}

          <TouchableOpacity
            onPress={handleAuth}
            disabled={loading}
            className="bg-primary rounded-xl h-14 items-center justify-center mt-2"
          >
            {loading
              ? <ActivityIndicator color="#000" />
              : <Text className="text-black font-inter-bold text-base">{isSignUp ? 'Criar conta' : 'Entrar'}</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Toggle */}
        <TouchableOpacity onPress={() => { setIsSignUp(!isSignUp); setError(''); }} className="mt-6 items-center">
          <Text className="text-text-secondary font-inter text-sm">
            {isSignUp ? 'Já tem conta? ' : 'Não tem conta? '}
            <Text className="text-primary font-inter-semibold">{isSignUp ? 'Entrar' : 'Cadastrar'}</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
