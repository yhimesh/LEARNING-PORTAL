import { AppNotification } from '../types';

/**
 * Filter notifications by read status
 */
export function filterNotifications(
  notifications: AppNotification[],
  filter: 'all' | 'unread'
): AppNotification[] {
  if (!Array.isArray(notifications)) return [];
  if (filter === 'unread') {
    return notifications.filter((n) => !n.isRead);
  }
  return [...notifications];
}

/**
 * Count total unread notifications
 */
export function countUnreadNotifications(notifications: AppNotification[]): number {
  if (!Array.isArray(notifications)) return 0;
  return notifications.filter((n) => !n.isRead).length;
}

/**
 * Constructs a deterministic, predictable notification document ID to guarantee idempotency
 * and prevent duplicate notifications when actions are retried.
 */
export function getDeterministicNotificationId(prefix: string, ...parts: string[]): string {
  const sanitizedPrefix = (prefix || 'notif').replace(/[^a-zA-Z0-9_-]/g, '');
  const sanitizedParts = parts.map((p) => String(p || '').replace(/[^a-zA-Z0-9_-]/g, ''));
  return `${sanitizedPrefix}_${sanitizedParts.join('_')}`.slice(0, 120);
}

/**
 * Formats a Firestore timestamp, ISO string, or Date into a human-friendly relative label
 */
export function formatNotificationDate(createdAt: any, now: Date = new Date()): string {
  if (!createdAt) return 'Just now';

  let date: Date;
  if (createdAt.toDate && typeof createdAt.toDate === 'function') {
    date = createdAt.toDate();
  } else if (createdAt instanceof Date) {
    date = createdAt;
  } else if (typeof createdAt === 'number' || typeof createdAt === 'string') {
    date = new Date(createdAt);
  } else {
    return 'Just now';
  }

  if (isNaN(date.getTime())) return 'Recently';

  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 45) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
