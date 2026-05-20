import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../lib/store';

export default function AddStudentScreen() {
  const { user } = useAuthStore();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleAdd() {
    if (!email.trim() || !user) return;
    setLoading(true);

    // Find user by email
    const { data: found, error: findError } = await supabase
      .from('users')
      .select('id, name, email, role')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();

    if (findError || !found) {
      setLoading(false);
      Alert.alert('Não encontrado', 'Nenhum usuário com esse e-mail. O jogador precisa criar uma conta primeiro.');
      return;
    }

    if (found.role !== 'player') {
      setLoading(false);
      Alert.alert('Perfil inválido', 'Esse usuário não está cadastrado como jogador.');
      return;
    }

    // Create student_teacher link (ignore conflict if already exists)
    const { error: linkError } = await supabase.from('student_teacher').upsert(
      { teacher_id: user.id, student_id: found.id },
      { onConflict: 'teacher_id,student_id' },
    );

    setLoading(false);

    if (linkError) {
      Alert.alert('Erro', linkError.message);
      return;
    }

    setSuccess(found.name ?? found.email);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-bg"
    >
      <View className="flex-1 px-6 pt-16">
        {/* Header */}
        <TouchableOpacity onPress={() => router.back()} className="mb-8">
          <Text className="text-primary font-inter text-sm">← Voltar</Text>
        </TouchableOpacity>

        <Text className="text-text-primary font-inter-bold text-2xl mb-1">Adicionar aluno</Text>
        <Text className="text-text-secondary font-inter text-sm mb-8 leading-5">
          Informe o e-mail do jogador. Ele precisa ter criado uma conta como Jogador no app.
        </Text>

        {success ? (
          <View
            style={{
              backgroundColor: 'rgba(74,222,128,0.1)',
              borderWidth: 1,
              borderColor: '#4ade80',
              borderRadius: 16,
              padding: 24,
              alignItems: 'center',
              gap: 10,
            }}
          >
            <Text style={{ fontSize: 36 }}>✅</Text>
            <Text style={{ color: '#4ade80', fontFamily: 'Inter_700Bold', fontSize: 17, textAlign: 'center' }}>
              {success} adicionado!
            </Text>
            <Text style={{ color: '#9CA3AF', fontFamily: 'Inter_400Regular', fontSize: 13, textAlign: 'center' }}>
              O aluno agora aparece na sua lista.
            </Text>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
              <TouchableOpacity
                onPress={() => { setEmail(''); setSuccess(null); }}
                style={{
                  backgroundColor: '#1A1A1A',
                  borderWidth: 1,
                  borderColor: '#374151',
                  borderRadius: 12,
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                }}
              >
                <Text style={{ color: '#9CA3AF', fontFamily: 'Inter_600SemiBold', fontSize: 14 }}>Adicionar outro</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.back()}
                style={{
                  backgroundColor: '#F97316',
                  borderRadius: 12,
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                }}
              >
                <Text style={{ color: '#000', fontFamily: 'Inter_700Bold', fontSize: 14 }}>Concluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View className="gap-3">
            <Text className="text-text-secondary font-inter text-sm">E-mail do jogador</Text>
            <TextInput
              className="bg-surface border border-border rounded-xl px-4 h-14 text-text-primary font-inter"
              placeholder="jogador@email.com"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
            />

            <TouchableOpacity
              onPress={handleAdd}
              disabled={loading || !email.trim()}
              className="bg-primary rounded-xl h-14 items-center justify-center mt-2"
            >
              {loading
                ? <ActivityIndicator color="#000" />
                : <Text className="text-black font-inter-bold text-base">Adicionar aluno</Text>
              }
            </TouchableOpacity>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
