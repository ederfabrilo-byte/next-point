import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../lib/supabase';

export default function RegisterScreen() {
  const { role } = useLocalSearchParams<{ role?: string }>();
  const selectedRole = (role === 'teacher' ? 'teacher' : 'player') as 'player' | 'teacher';

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    instagram: '',
    cpf: '',
    address: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function set(field: keyof typeof form) {
    return (v: string) => setForm((f) => ({ ...f, [field]: v }));
  }

  function formatCPF(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }

  function formatPhone(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 10) {
      return digits.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    }
    return digits.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
  }

  async function handleRegister() {
    setError('');

    if (!form.name.trim()) { setError('Nome obrigatório.'); return; }
    if (!form.email.trim()) { setError('E-mail obrigatório.'); return; }
    if (!form.phone.trim()) { setError('Celular obrigatório.'); return; }
    if (!form.cpf.trim()) { setError('CPF obrigatório.'); return; }
    if (!form.address.trim()) { setError('Endereço obrigatório.'); return; }
    if (form.password.length < 6) { setError('Senha deve ter ao menos 6 caracteres.'); return; }
    if (form.password !== form.confirmPassword) { setError('As senhas não coincidem.'); return; }

    setLoading(true);
    try {
      // 1. Create auth user
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });

      if (signUpError) { setError(signUpError.message); return; }

      const userId = data.user?.id;
      if (!userId) {
        setError('Conta criada! Verifique seu e-mail para confirmar o cadastro.');
        return;
      }

      // 2. Save user profile in public.users
      const { error: upsertError } = await supabase.from('users').upsert({
        id: userId,
        email: form.email.trim().toLowerCase(),
        name: form.name.trim(),
        role: selectedRole,
        phone: form.phone.replace(/\D/g, ''),
        instagram: form.instagram.trim().replace(/^@/, '') || null,
        cpf: form.cpf.replace(/\D/g, ''),
        address: form.address.trim(),
      });

      if (upsertError) {
        console.warn('users upsert error:', upsertError.message);
        // Non-fatal — auth worked, role will be set on select-role fallback
      }

      // Auth state change in _layout.tsx will handle routing
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
        contentContainerStyle={{ paddingHorizontal: 28, paddingBottom: 60, paddingTop: 60 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back */}
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 28 }}>
          <Text style={{ color: '#F97316', fontFamily: 'Inter_400Regular', fontSize: 14 }}>← Voltar</Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={{ marginBottom: 32 }}>
          <Text style={{ color: '#FFFFFF', fontFamily: 'Inter_700Bold', fontSize: 26 }}>Criar conta</Text>
          <Text style={{ color: '#9CA3AF', fontFamily: 'Inter_400Regular', fontSize: 14, marginTop: 6 }}>
            Perfil: {selectedRole === 'teacher' ? 'Professor' : 'Jogador'}
          </Text>
        </View>

        {/* Fields */}
        <View style={{ gap: 12 }}>
          <Field label="Nome completo *" value={form.name} onChangeText={set('name')} placeholder="Seu nome" />

          <Field
            label="E-mail *"
            value={form.email}
            onChangeText={set('email')}
            placeholder="seu@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Field
            label="Celular *"
            value={form.phone}
            onChangeText={(v) => set('phone')(formatPhone(v))}
            placeholder="(44) 99999-9999"
            keyboardType="phone-pad"
          />

          <Field
            label="Instagram (opcional)"
            value={form.instagram}
            onChangeText={set('instagram')}
            placeholder="@seuperfil"
            autoCapitalize="none"
          />

          <Field
            label="CPF *"
            value={form.cpf}
            onChangeText={(v) => set('cpf')(formatCPF(v))}
            placeholder="000.000.000-00"
            keyboardType="numeric"
          />

          <Field
            label="Endereço *"
            value={form.address}
            onChangeText={set('address')}
            placeholder="Rua, número, bairro, cidade"
          />

          <Field
            label="Senha *"
            value={form.password}
            onChangeText={set('password')}
            placeholder="Mínimo 6 caracteres"
            secureTextEntry
          />

          <Field
            label="Confirmar senha *"
            value={form.confirmPassword}
            onChangeText={set('confirmPassword')}
            placeholder="Repita a senha"
            secureTextEntry
          />

          {error ? (
            <Text style={{ color: '#F87171', fontFamily: 'Inter_400Regular', fontSize: 13, textAlign: 'center', marginTop: 4 }}>
              {error}
            </Text>
          ) : null}

          <TouchableOpacity
            onPress={handleRegister}
            disabled={loading}
            style={{
              backgroundColor: '#F97316',
              borderRadius: 12,
              height: 56,
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 12,
            }}
          >
            {loading
              ? <ActivityIndicator color="#000" />
              : <Text style={{ color: '#000', fontFamily: 'Inter_700Bold', fontSize: 16 }}>Criar conta</Text>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label, value, onChangeText, placeholder,
  keyboardType, autoCapitalize, secureTextEntry,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: any;
  autoCapitalize?: any;
  secureTextEntry?: boolean;
}) {
  return (
    <View>
      <Text style={{ color: '#9CA3AF', fontFamily: 'Inter_400Regular', fontSize: 13, marginBottom: 6 }}>
        {label}
      </Text>
      <TextInput
        style={{
          backgroundColor: '#1A1A1A',
          color: '#FFFFFF',
          fontFamily: 'Inter_400Regular',
          borderRadius: 12,
          paddingHorizontal: 16,
          height: 52,
          borderWidth: 1,
          borderColor: '#374151',
          fontSize: 15,
        }}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize={autoCapitalize ?? 'words'}
        secureTextEntry={secureTextEntry}
        autoCorrect={false}
      />
    </View>
  );
}
