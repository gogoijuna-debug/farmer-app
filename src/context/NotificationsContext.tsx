import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  limit,
} from 'firebase/firestore';
import { useFarmerProfile } from './FarmerProfileContext';
import { markNotificationRead, NotificationDoc } from '../lib/notifications';

interface NotificationsContextType {
  notifications: NotificationDoc[];
  unreadCount: number;
  markRead: (id: string) => void;
}

const NotificationsContext = createContext<NotificationsContextType>({
  notifications: [],
  unreadCount: 0,
  markRead: () => {},
});

export const NotificationsProvider = ({ children }: { children: React.ReactNode }) => {
  const { profile } = useFarmerProfile();
  const [notifications, setNotifications] = useState<NotificationDoc[]>([]);

  useEffect(() => {
    if (!profile?.deviceId) return;

    const q = query(
      collection(db, 'notifications'),
      where('recipientType', '==', 'farmer'),
      where('recipientId', '==', profile.deviceId),
      limit(30),
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as NotificationDoc));
        docs.sort((a, b) => {
          const aMs = a.createdAt?.toMillis?.() || 0;
          const bMs = b.createdAt?.toMillis?.() || 0;
          return bMs - aMs;
        });
        setNotifications(docs);
      },
      (err) => {
        console.warn('[notifications] snapshot error', err);
      },
    );

    return () => unsub();
  }, [profile?.deviceId]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    markNotificationRead(id);
  };

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, markRead }}>
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationsContext);
