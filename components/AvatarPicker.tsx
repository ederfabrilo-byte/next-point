import { useState } from 'react';
import { View, Image, TouchableOpacity, ActivityIndicator, Alert, Text } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

interface Props {
  userId: string;
  avatarUrl: string | null;
  size?: number;
  onUpdate: (url: string) => void;
}

export default function AvatarPicker({ userId, avatarUrl, size = 80, onUpdate }: Props) {
  const [uploading, setUploading] = useState(false);

  async function handlePick() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Permita o acesso à galeria para enviar uma foto.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const ext = asset.uri.split('.').pop()?.toLowerCase() ?? 'jpg';
    const path = `avatars/${userId}.${ext}`;

    setUploading(true);
    try {
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, arrayBuffer, { contentType: `image/${ext}`, upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      const publicUrl = `${data.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', userId);

      if (updateError) throw updateError;

      onUpdate(publicUrl);
    } catch (e: any) {
      Alert.alert('Erro', e.message ?? 'Não foi possível enviar a foto.');
    } finally {
      setUploading(false);
    }
  }

  const borderRadius = size / 2;

  return (
    <TouchableOpacity onPress={handlePick} disabled={uploading} activeOpacity={0.8}>
      <View style={{ width: size, height: size, borderRadius, backgroundColor: '#1A1A1A', borderWidth: 2, borderColor: '#F97316', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
        {uploading ? (
          <ActivityIndicator color="#F97316" />
        ) : avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={{ width: size, height: size }} resizeMode="cover" />
        ) : (
          <Ionicons name="person" size={size * 0.45} color="#9CA3AF" />
        )}
      </View>
      <View style={{ position: 'absolute', bottom: 0, right: 0, backgroundColor: '#F97316', borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="camera" size={12} color="#000" />
      </View>
    </TouchableOpacity>
  );
}
