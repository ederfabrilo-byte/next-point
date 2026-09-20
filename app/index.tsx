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
  useWindowDimensions,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';

const hero = require('../assets/zeca-hero.jpg');
const avatar = require('../assets/zeca-avatar.jpg');
const ball = require('../assets/adaptive-icon.png');

/**
 * Abertura: a foto do Zeca ocupa o topo e escorre para o preto; o formulário
 * fica na metade de baixo. É a primeira coisa que o jogador vê — a promessa
 * do app é o método do professor, então ele aparece antes de qualquer campo.
 */
export default function LoginScreen() {
  const { height } = useWindowDimensions();
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

  // A foto ocupa ~55% da altura; em telas baixas (web redimensionado) não deixa
  // o formulário sem espaço.
  const heroHeight = Math.max(320, Math.min(height * 0.55, 520));

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-bg">
      <ScrollView
        className="flex-1 bg-bg"
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        {/* Hero — no web largo a coluna inteira tem 560px; no celular ocupa tudo */}
        <View style={{ height: heroHeight, width: '100%', maxWidth: 560, alignSelf: 'center' }}>
          {/* expo-image: ancora o rosto no topo em qualquer proporção de tela */}
          <ExpoImage
            source={hero}
            contentFit="cover"
            contentPosition="top"
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
          <LinearGradient
            colors={['rgba(10,10,10,0.15)', 'rgba(10,10,10,0.55)', '#0A0A0A']}
            locations={[0, 0.6, 1]}
            style={{ flex: 1, justifyContent: 'flex-end', paddingHorizontal: 24, paddingBottom: 8 }}
          >
           <View style={{ width: '100%', maxWidth: 520, alignSelf: 'center' }}>
            <View className="flex-row items-center gap-2 mb-3">
              <Image source={ball} style={{ width: 28, height: 28 }} />
              <Text className="text-text-primary font-inter-bold text-2xl tracking-tight">Next Point</Text>
            </View>
            <Text className="text-text-primary font-inter-bold text-3xl leading-9">
              Treine com o método{'\n'}do Prof. Zeca Mota
            </Text>
            <View className="flex-row items-center gap-3 mt-4">
              <Image source={avatar} style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: '#F97316' }} />
              <View className="flex-1">
                <Text className="text-text-primary font-inter-semibold text-sm">Zeca Mota</Text>
                <Text className="text-text-secondary font-inter text-xs">
                  Tennis coach · análise de vídeo, estratégia e acompanhamento com IA
                </Text>
              </View>
            </View>
           </View>
          </LinearGradient>
        </View>

        {/* Form — no web em tela larga não estica de ponta a ponta */}
        <View className="px-6 pt-6 pb-10 gap-3" style={{ width: '100%', maxWidth: 520, alignSelf: 'center' }}>
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
