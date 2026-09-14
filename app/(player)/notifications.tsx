import { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../lib/store';
import {
  NotificationRow,
  NOTIFICATION_STYLE,
  fetchNotifications,
  markRead,
  markAllRead,
  deleteNotification,
} from '../../lib/notifications';

/**
 * Tela única de notificações, servida também em (teacher) e (admin) por
 * re-export — o conteúdo é o mesmo, só o destinatário muda.
 */
export default function NotificationsScreen() {
  const { user } = useAuthStore();
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems(await fetchNotifications());
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const unread = items.filter((n) => !n.read).length;

  async function handleOpen(item: NotificationRow) {
    if (item.read) return;
    setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)));
    await markRead(item.id);
  }

  async function handleMarkAll() {
    if (!user || unread === 0) return;
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    await markAllRead(user.id);
  }

  async function handleDelete(item: NotificationRow) {
    setItems((prev) => prev.filter((n) => n.id !== item.id));
    await deleteNotification(item.id);
  }

  if (loading) {
    return <View className="flex-1 bg-bg items-center justify-center"><ActivityIndicator color="#F97316" /></View>;
  }

  return (
    <View className="flex-1 bg-bg">
      <View className="px-6 pt-16 pb-4 flex-row items-start justify-between">
        <View>
          <Text className="text-text-primary font-inter-bold text-2xl">Notificações</Text>
          <Text className="text-text-secondary font-inter text-sm mt-1">
            {unread === 0 ? 'Tudo em dia' : `${unread} não lida${unread > 1 ? 's' : ''}`}
          </Text>
        </View>
        {unread > 0 && (
          <TouchableOpacity onPress={handleMarkAll} className="bg-surface border border-border rounded-xl px-3 py-2">
            <Text className="text-text-secondary font-inter text-sm">Marcar lidas</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32, flexGrow: 1 }}
        ItemSeparatorComponent={() => <View className="h-3" />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor="#F97316"
          />
        }
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center px-6">
            <Ionicons name="notifications-off-outline" size={48} color="#9CA3AF" />
            <Text className="text-text-primary font-inter-bold text-lg text-center mt-4">
              Nenhuma notificação
            </Text>
            <Text className="text-text-secondary font-inter text-sm text-center mt-2">
              Convites, análises concluídas e feedback do professor aparecem aqui.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const style = NOTIFICATION_STYLE[item.type] ?? { icon: 'ellipse-outline', color: '#9CA3AF' };
          return (
            <TouchableOpacity
              onPress={() => handleOpen(item)}
              onLongPress={() => handleDelete(item)}
              className={`rounded-2xl p-4 border flex-row gap-3 ${
                item.read ? 'bg-surface border-border' : 'bg-surface border-primary'
              }`}
            >
              <View
                style={{ backgroundColor: style.color + '22' }}
                className="w-10 h-10 rounded-full items-center justify-center"
              >
                <Ionicons name={style.icon as any} size={20} color={style.color} />
              </View>

              <View className="flex-1">
                <View className="flex-row items-center gap-2">
                  <Text className="text-text-primary font-inter-bold text-sm flex-1">{item.title}</Text>
                  {!item.read && <View className="w-2 h-2 rounded-full bg-primary" />}
                </View>
                {item.body ? (
                  <Text className="text-text-secondary font-inter text-sm mt-1 leading-5">{item.body}</Text>
                ) : null}
                <Text className="text-text-secondary font-inter text-xs mt-2">
                  {new Date(item.created_at).toLocaleString('pt-BR', {
                    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                  })}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}
