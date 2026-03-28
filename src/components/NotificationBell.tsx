import React, { useState } from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  Modal,
  FlatList,
  SafeAreaView,
} from 'react-native';
import { Bell, X, CheckCheck } from 'lucide-react-native';
import { useNotifications } from '../context/NotificationsContext';
import { useAppTheme } from '../context/ThemeContext';
import { Timestamp } from 'firebase/firestore';

function timeAgo(ts: Timestamp | null | undefined): string {
  if (!ts) return '';
  const diff = Math.floor((Date.now() - ts.toMillis()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationBell() {
  const { notifications, unreadCount, markRead } = useNotifications();
  const { theme } = useAppTheme();
  const [open, setOpen] = useState(false);

  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        style={styles.bellButton}
        activeOpacity={0.75}
        accessibilityLabel="Notifications"
      >
        <Bell size={22} color="#ffffff" strokeWidth={2} />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal
        visible={open}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setOpen(false)}
      >
        <SafeAreaView style={[styles.modal, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Notifications</Text>
            <TouchableOpacity onPress={() => setOpen(false)} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={22} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {notifications.length === 0 ? (
            <View style={styles.emptyState}>
              <CheckCheck size={40} color={theme.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>All caught up!</Text>
            </View>
          ) : (
            <FlatList
              data={notifications}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingVertical: 8 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => { if (!item.read) markRead(item.id); }}
                  activeOpacity={0.8}
                  style={[
                    styles.notifItem,
                    {
                      backgroundColor: item.read ? theme.background : theme.card,
                      borderBottomColor: theme.border,
                    },
                  ]}
                >
                  {!item.read && (
                    <View style={[styles.unreadDot, { backgroundColor: theme.tint }]} />
                  )}
                  <View style={styles.notifContent}>
                    <Text style={[styles.notifTitle, { color: theme.text }]}>{item.title}</Text>
                    <Text style={[styles.notifBody, { color: theme.textSecondary }]}>{item.body}</Text>
                    <Text style={[styles.notifTime, { color: theme.textSecondary }]}>
                      {timeAgo(item.createdAt)}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bellButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 12,
  },
  modal: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '500',
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
    flexShrink: 0,
  },
  notifContent: {
    flex: 1,
    gap: 3,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  notifBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  notifTime: {
    fontSize: 11,
    marginTop: 2,
  },
});
