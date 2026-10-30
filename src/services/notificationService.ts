import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { AppNotification, NotificationType } from '../types';
import { getDeterministicNotificationId } from '../utils/notificationUtils';

export interface CreateNotificationInput {
  id?: string;
  recipientUid: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntityId?: string;
  relatedEntityType?: 'course' | 'assessment' | 'user' | 'resource' | 'attempt';
}

/**
 * Creates an in-app notification in Firestore.
 * Employs deterministic IDs to guarantee idempotency and avoid duplicate alerts.
 */
export async function createNotification(input: CreateNotificationInput): Promise<string> {
  if (!input.recipientUid) {
    throw new Error('Recipient UID is required to create a notification.');
  }
  if (!input.title || !input.message) {
    throw new Error('Notification title and message are required.');
  }

  const docId = input.id || getDeterministicNotificationId(
    input.type,
    input.recipientUid,
    input.relatedEntityId || String(Date.now())
  );

  const docRef = doc(db, 'notifications', docId);

  try {
    // Check if notification already exists to enforce idempotency
    const existingSnap = await getDoc(docRef);
    if (existingSnap.exists()) {
      return docId;
    }

    const payload = {
      id: docId,
      recipientUid: input.recipientUid,
      type: input.type,
      title: input.title.trim().slice(0, 120),
      message: input.message.trim().slice(0, 1000),
      ...(input.relatedEntityId ? { relatedEntityId: input.relatedEntityId } : {}),
      ...(input.relatedEntityType ? { relatedEntityType: input.relatedEntityType } : {}),
      isRead: false,
      createdAt: serverTimestamp(),
    };

    await setDoc(docRef, payload);
    return docId;
  } catch (error: any) {
    console.warn(`Notice: Failed to create notification (${input.type}) for ${input.recipientUid}:`, error?.message || error);
    return docId;
  }
}

/**
 * Subscribes in real-time to the current user's notifications collection.
 * Cleans up cleanly when the user logs out or the component unmounts.
 */
export function subscribeUserNotifications(
  recipientUid: string,
  onUpdate: (notifications: AppNotification[]) => void,
  onError?: (error: any) => void
): () => void {
  if (!recipientUid) {
    onUpdate([]);
    return () => {};
  }

  const notificationsRef = collection(db, 'notifications');
  const q = query(notificationsRef, where('recipientUid', '==', recipientUid));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const list: AppNotification[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          recipientUid: data.recipientUid,
          type: data.type as NotificationType,
          title: data.title || 'Notification',
          message: data.message || '',
          relatedEntityId: data.relatedEntityId,
          relatedEntityType: data.relatedEntityType,
          isRead: Boolean(data.isRead),
          createdAt: data.createdAt,
          readAt: data.readAt,
        };
      });

      // Sort descending by createdAt in memory
      list.sort((a, b) => {
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return timeB - timeA;
      });

      onUpdate(list);
    },
    (error) => {
      console.warn('Real-time notifications listener notice:', error?.message || error);
      if (onError) onError(error);
      else handleFirestoreError(error, OperationType.LIST, `notifications/${recipientUid}`);
    }
  );

  return unsubscribe;
}

/**
 * Marks an individual notification as read.
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  if (!notificationId) return;
  try {
    const docRef = doc(db, 'notifications', notificationId);
    await updateDoc(docRef, {
      isRead: true,
      readAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error: any) {
    console.warn(`Notice: Failed to mark notification ${notificationId} as read:`, error?.message || error);
  }
}

/**
 * Marks all given unread notifications as read.
 */
export async function markAllNotificationsAsRead(notifications: AppNotification[]): Promise<void> {
  const unreadList = notifications.filter((n) => !n.isRead);
  if (unreadList.length === 0) return;

  await Promise.allSettled(
    unreadList.map((n) => markNotificationAsRead(n.id))
  );
}

/**
 * Deletes an individual notification from Firestore.
 */
export async function deleteNotification(notificationId: string): Promise<void> {
  if (!notificationId) return;
  try {
    const docRef = doc(db, 'notifications', notificationId);
    await deleteDoc(docRef);
  } catch (error: any) {
    console.error(`Failed to delete notification ${notificationId}:`, error);
    handleFirestoreError(error, OperationType.DELETE, `notifications/${notificationId}`);
  }
}
