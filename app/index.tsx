import { useState } from 'react';
import { View, Text, TouchableOpacity, ImageBackground, StyleSheet } from 'react-native';
import { router } from 'expo-router';

type SelectedRole = 'player' | 'teacher';

export default function SplashScreen() {
  const [role, setRole] = useState<SelectedRole>('player');

  function handlePlay() {
    router.push({ pathname: '/login', params: { role } });
  }

  return (
    <ImageBackground
      source={require('../assets/zeca-mota.jpg')}
      style={styles.bg}
      resizeMode="cover"
    >
      {/* Dark overlay */}
      <View style={styles.overlay} />

      <View style={styles.container}>
        {/* Branding */}
        <View style={styles.brand}>
          <Text style={styles.logo}>NP</Text>
          <Text style={styles.title}>Next Point</Text>
          <Text style={styles.subtitle}>Tênis inteligente com IA</Text>
        </View>

        {/* Role selector */}
        <View style={styles.roleSection}>
          <Text style={styles.roleLabel}>Você é:</Text>
          <View style={styles.roleRow}>
            <TouchableOpacity
              style={[styles.roleBtn, role === 'player' && styles.roleBtnActive]}
              onPress={() => setRole('player')}
              activeOpacity={0.8}
            >
              <Text style={styles.roleEmoji}>🎾</Text>
              <Text style={[styles.roleBtnText, role === 'player' && styles.roleBtnTextActive]}>
                Jogador
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.roleBtn, role === 'teacher' && styles.roleBtnActive]}
              onPress={() => setRole('teacher')}
              activeOpacity={0.8}
            >
              <Text style={styles.roleEmoji}>🏫</Text>
              <Text style={[styles.roleBtnText, role === 'teacher' && styles.roleBtnTextActive]}>
                Professor
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Play button */}
        <View style={styles.playSection}>
          <TouchableOpacity style={styles.playBtn} onPress={handlePlay} activeOpacity={0.85}>
            <Text style={styles.playText}>▶  PLAY</Text>
          </TouchableOpacity>
          <Text style={styles.playHint}>
            {role === 'player' ? 'Acesse como Jogador' : 'Acesse como Professor'}
          </Text>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,10,10,0.72)',
  },
  container: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 80,
    paddingBottom: 52,
    justifyContent: 'space-between',
  },
  brand: { alignItems: 'center' },
  logo: {
    color: '#F97316',
    fontSize: 52,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -2,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    marginTop: 4,
  },
  subtitle: {
    color: '#9CA3AF',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginTop: 4,
  },
  roleSection: { alignItems: 'center' },
  roleLabel: {
    color: '#9CA3AF',
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginBottom: 14,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 14,
  },
  roleBtn: {
    flex: 1,
    backgroundColor: 'rgba(26,26,26,0.85)',
    borderWidth: 1.5,
    borderColor: '#374151',
    borderRadius: 18,
    paddingVertical: 20,
    alignItems: 'center',
    gap: 8,
  },
  roleBtnActive: {
    borderColor: '#F97316',
    backgroundColor: 'rgba(249,115,22,0.12)',
  },
  roleEmoji: { fontSize: 30 },
  roleBtnText: {
    color: '#9CA3AF',
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  roleBtnTextActive: { color: '#F97316' },
  playSection: { alignItems: 'center', gap: 12 },
  playBtn: {
    backgroundColor: '#F97316',
    borderRadius: 16,
    height: 58,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playText: {
    color: '#000',
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 2,
  },
  playHint: {
    color: '#6B7280',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
});
