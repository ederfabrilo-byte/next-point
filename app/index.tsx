import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';

const poster = require('../assets/zeca-poster.jpg');
const ball = require('../assets/adaptive-icon.png');

/**
 * Abertura: o pôster do Zeca (material de marca dele, P&B com detalhes em
 * amarelo-limão) ocupa a tela inteira e escorre para o preto; o formulário
 * fica por cima da metade de baixo. O pôster já traz logo e assinatura, então
 * o app só assina discretamente no topo e faz a promessa antes do login.
 */
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
    <View className="flex-1 bg-bg items-center">
    {/* No web largo a tela inteira vira uma coluna de celular; no aparelho ocupa tudo */}
    <View className="flex-1 w-full" style={{ maxWidth: 560 }}>
      {/* Pôster fixo atrás de tudo, ancorado no rosto */}
      <ExpoImage
        source={poster}
        contentFit="cover"
        contentPosition="top"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <LinearGradient
        colors={['rgba(10,10,10,0)', 'rgba(10,10,10,0.35)', 'rgba(10,10,10,0.92)', '#0A0A0A']}
        locations={[0, 0.35, 0.62, 0.8]}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'space-between' }}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          {/* Assinatura do app, discreta — o pôster já tem a marca do Zeca */}
          <View className="flex-row items-center gap-2 px-6 pt-14">
            <Image source={ball} style={{ width: 22, height: 22 }} />
            <Text className="text-text-primary font-inter-semibold text-base tracking-tight">Next Point</Text>
          </View>

          <View>
            <View className="px-6 pt-10">
              <Text className="text-text-secondary font-inter-semibold text-xs uppercase tracking-widest mb-2">
                Tênis inteligente
              </Text>
              <Text className="text-text-primary font-inter-bold text-3xl leading-9">
                Treine com o método{'\n'}do Prof. Zeca Mota
              </Text>
              <Text className="text-text-secondary font-inter text-sm mt-2">
                Análise de vídeo, estratégia de jogo e acompanhamento do seu professor — com IA.
              </Text>
            </View>

            {/* Form */}
            <View className="px-6 pt-6 pb-10 gap-3">
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
            onSubmitEditing={handleAuth}
          />

          {error ? <Text className="text-red-400 font-inter text-sm text-center">{error}</Text> : null}
          {info ? <Text className="text-green-400 font-inter text-sm text-center">{info}</Text> : null}

          <TouchableOpacity
            onPress={handleAuth}
            disabled={loading}
            className="bg-primary rounded-xl h-14 items-center justify-center mt-2"
          >
            {loading
              ? <ActivityIndicator color="#000" />
              : <Text className="text-black font-inter-bold text-base">{isSignUp ? 'Criar conta' : 'Entrar'}</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => { setIsSignUp(!isSignUp); setError(''); }} className="mt-4 items-center">
            <Text className="text-text-secondary font-inter text-sm">
              {isSignUp ? 'Já tem conta? ' : 'Não tem conta? '}
              <Text className="text-primary font-inter-semibold">{isSignUp ? 'Entrar' : 'Cadastrar'}</Text>
            </Text>
          </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
    </View>
  );
}
