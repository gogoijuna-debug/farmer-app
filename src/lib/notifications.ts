import { db } from './firebase';
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  getDocs,
  serverTimestamp,
  limit,
  Timestamp,
} from 'firebase/firestore';

export interface NotificationDoc {
  id: string;
  recipientType: 'farmer' | 'staff';
  recipientId: string;
  eventType: string;
  entityType: 'appointment' | 'inventory' | 'sale';
  entityId: string;
  /** Dedup key: eventType:entityId[:newState] */
  eventKey: string;
  title: string;
  body: string;
  deepLink: string;
  priority: 'critical' | 'normal';
  read: boolean;
  createdAt: Timestamp;
  readAt?: Timestamp;
}

type NewNotification = Omit<NotificationDoc, 'id' | 'createdAt' | 'read' | 'readAt'>;

/**
 * Writes a notification document only if one with the same eventKey does not
 * already exist. Returns the document id, or null on failure.
 */
export async function ensureNotification(data: NewNotification): Promise<string | null> {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('eventKey', '==', data.eventKey),
      limit(1),
    );
    const snap = await getDocs(q);
    if (!snap.empty) return snap.docs[0].id;

    const ref = await addDoc(collection(db, 'notifications'), {
      ...data,
      read: false,
      createdAt: serverTimestamp(),
    });
    return ref.id;
  } catch (e) {
    console.error('[notifications] ensureNotification error', e);
    return null;
  }
}

export async function markNotificationRead(id: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'notifications', id), {
      read: true,
      readAt: serverTimestamp(),
    });
  } catch (e) {
    console.error('[notifications] markNotificationRead error', e);
  }
}
