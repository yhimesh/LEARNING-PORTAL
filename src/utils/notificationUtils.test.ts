import test from 'node:test';
import assert from 'node:assert';
import {
  filterNotifications,
  countUnreadNotifications,
  getDeterministicNotificationId,
  formatNotificationDate,
} from './notificationUtils';
import { AppNotification } from '../types';

test('filterNotifications separates all vs unread correctly', () => {
  const notifs: AppNotification[] = [
    {
      id: 'n1',
      recipientUid: 'u1',
      type: 'enrollment_success',
      title: 'Enrolled',
      message: 'You enrolled',
      isRead: false,
      createdAt: new Date(),
    },
    {
      id: 'n2',
      recipientUid: 'u1',
      type: 'assessment_result',
      title: 'Quiz Result',
      message: 'Score 90%',
      isRead: true,
      createdAt: new Date(),
    },
    {
      id: 'n3',
      recipientUid: 'u1',
      type: 'trainer_approved',
      title: 'Faculty Approved',
      message: 'Approved',
      isRead: false,
      createdAt: new Date(),
    },
  ];

  assert.strictEqual(filterNotifications(notifs, 'all').length, 3);
  const unread = filterNotifications(notifs, 'unread');
  assert.strictEqual(unread.length, 2);
  assert.strictEqual(unread[0].id, 'n1');
  assert.strictEqual(unread[1].id, 'n3');
});

test('countUnreadNotifications counts only unread notifications', () => {
  assert.strictEqual(countUnreadNotifications([]), 0);

  const notifs: AppNotification[] = [
    { id: '1', recipientUid: 'u1', type: 'system', title: 'T1', message: 'M1', isRead: false, createdAt: null },
    { id: '2', recipientUid: 'u1', type: 'system', title: 'T2', message: 'M2', isRead: true, createdAt: null },
    { id: '3', recipientUid: 'u1', type: 'system', title: 'T3', message: 'M3', isRead: false, createdAt: null },
  ];

  assert.strictEqual(countUnreadNotifications(notifs), 2);
});

test('getDeterministicNotificationId builds consistent, sanitized IDs', () => {
  const id1 = getDeterministicNotificationId('enrollment', 'trainee123', 'course456');
  const id2 = getDeterministicNotificationId('enrollment', 'trainee123', 'course456');
  assert.strictEqual(id1, id2);
  assert.strictEqual(id1, 'enrollment_trainee123_course456');

  const dirtyId = getDeterministicNotificationId('res', 'trainee@user.com', 'id#1');
  assert.strictEqual(dirtyId, 'res_traineeusercom_id1');
});

test('formatNotificationDate formats relative time stamps accurately', () => {
  const now = new Date('2026-10-28T12:00:00Z');

  // 10 seconds ago -> Just now
  assert.strictEqual(formatNotificationDate(new Date('2026-10-28T11:59:50Z'), now), 'Just now');

  // 5 minutes ago -> 5m ago
  assert.strictEqual(formatNotificationDate(new Date('2026-10-28T11:55:00Z'), now), '5m ago');

  // 3 hours ago -> 3h ago
  assert.strictEqual(formatNotificationDate(new Date('2026-10-28T09:00:00Z'), now), '3h ago');

  // 1 day ago -> Yesterday
  assert.strictEqual(formatNotificationDate(new Date('2026-10-27T10:00:00Z'), now), 'Yesterday');

  // Missing or null -> Just now
  assert.strictEqual(formatNotificationDate(null, now), 'Just now');
});
