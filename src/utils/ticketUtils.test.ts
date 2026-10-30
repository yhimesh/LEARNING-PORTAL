import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateSupportTicketInput,
  validateSupportReplyInput,
  formatTicketStatus,
  formatTicketCategory,
  filterTickets,
  sortTicketsByUpdated,
} from './ticketUtils';
import { SupportTicket } from '../types';

test('validateSupportTicketInput approves complete and valid ticket submission', () => {
  const result = validateSupportTicketInput({
    subject: 'Cannot access Quiz 2 in AI Course',
    category: 'course_content',
    message: 'When I click on Quiz 2, the question list fails to render.',
    userId: 'user_123',
    userEmail: 'student@example.com',
    userName: 'John Doe',
  });

  assert.equal(result.isValid, true);
  assert.equal(Object.keys(result.errors).length, 0);
});

test('validateSupportTicketInput enforces minimum and maximum lengths', () => {
  const tooShort = validateSupportTicketInput({
    subject: 'Hi',
    category: 'general',
    message: 'Short',
    userId: 'user_123',
    userEmail: 'student@example.com',
    userName: 'John Doe',
  });

  assert.equal(tooShort.isValid, false);
  assert.ok(tooShort.errors.subject);
  assert.ok(tooShort.errors.message);

  const tooLong = validateSupportTicketInput({
    subject: 'A'.repeat(151),
    category: 'general',
    message: 'B'.repeat(2001),
    userId: 'user_123',
    userEmail: 'student@example.com',
    userName: 'John Doe',
  });

  assert.equal(tooLong.isValid, false);
  assert.ok(tooLong.errors.subject);
  assert.ok(tooLong.errors.message);
});

test('validateSupportTicketInput requires valid category and email', () => {
  const invalidCat = validateSupportTicketInput({
    subject: 'General feedback',
    category: 'invalid_category_name',
    message: 'This is a test message that has sufficient length.',
    userId: 'user_123',
    userEmail: 'notanemail',
    userName: 'John Doe',
  });

  assert.equal(invalidCat.isValid, false);
  assert.ok(invalidCat.errors.category);
  assert.ok(invalidCat.errors.userEmail);
});

test('validateSupportReplyInput validates author and message bounds', () => {
  const valid = validateSupportReplyInput({
    ticketId: 'tick_123',
    authorUid: 'admin_1',
    authorRole: 'admin',
    message: 'We have updated the permissions. Please try again.',
  });
  assert.equal(valid.isValid, true);

  const missingAuthor = validateSupportReplyInput({
    ticketId: 'tick_123',
    authorUid: '',
    authorRole: 'user',
    message: 'Hello',
  });
  assert.equal(missingAuthor.isValid, false);

  const emptyMsg = validateSupportReplyInput({
    ticketId: 'tick_123',
    authorUid: 'user_1',
    authorRole: 'user',
    message: '   ',
  });
  assert.equal(emptyMsg.isValid, false);

  const invalidRole = validateSupportReplyInput({
    ticketId: 'tick_123',
    authorUid: 'user_1',
    authorRole: 'super_admin' as any,
    message: 'Hello there',
  });
  assert.equal(invalidRole.isValid, false);
});

test('formatTicketStatus returns appropriate metadata and labels', () => {
  assert.equal(formatTicketStatus('open').label, 'Open');
  assert.equal(formatTicketStatus('in_progress').label, 'In Progress');
  assert.equal(formatTicketStatus('waiting_for_user').label, 'Waiting for User');
  assert.equal(formatTicketStatus('resolved').label, 'Resolved');
  assert.equal(formatTicketStatus('other').label, 'other');
});

test('formatTicketCategory returns friendly labels', () => {
  assert.equal(formatTicketCategory('account'), 'Account & Login');
  assert.equal(formatTicketCategory('enrollment'), 'Course Enrollment');
  assert.equal(formatTicketCategory('technical_issue'), 'Technical Bug & Performance');
});

test('filterTickets correctly filters by status, category, and search query', () => {
  const mockTickets: SupportTicket[] = [
    {
      id: 'tick_1',
      requestId: 'tick_1',
      ticketNumber: 'TICK-1001',
      userId: 'u1',
      userName: 'Aarav Sharma',
      userEmail: 'aarav@example.com',
      subject: 'Python environment error',
      category: 'technical_issue',
      message: 'Console throws module not found on page 3',
      status: 'open',
      createdAt: 1000,
      updatedAt: 1000,
    },
    {
      id: 'tick_2',
      requestId: 'tick_2',
      ticketNumber: 'TICK-1002',
      userId: 'u2',
      userName: 'Priya Patel',
      userEmail: 'priya@example.com',
      subject: 'Trainer approval requested',
      category: 'account',
      message: 'Uploaded university credentials for verification',
      status: 'in_progress',
      createdAt: 2000,
      updatedAt: 2500,
    },
    {
      id: 'tick_3',
      requestId: 'tick_3',
      ticketNumber: 'TICK-1003',
      userId: 'u1',
      userName: 'Aarav Sharma',
      userEmail: 'aarav@example.com',
      subject: 'Quiz graded successfully',
      category: 'course_content',
      message: 'Thank you for recalculating the passing percentage',
      status: 'resolved',
      createdAt: 3000,
      updatedAt: 4000,
    },
  ];

  // 1. Status filter
  const openOnly = filterTickets(mockTickets, { status: 'open' });
  assert.equal(openOnly.length, 1);
  assert.equal(openOnly[0].id, 'tick_1');

  // 2. Category filter
  const accountOnly = filterTickets(mockTickets, { category: 'account' });
  assert.equal(accountOnly.length, 1);
  assert.equal(accountOnly[0].id, 'tick_2');

  // 3. Search by ticket number
  const searchNum = filterTickets(mockTickets, { searchQuery: 'TICK-1002' });
  assert.equal(searchNum.length, 1);
  assert.equal(searchNum[0].id, 'tick_2');

  // 4. Search by subject / body
  const searchPython = filterTickets(mockTickets, { searchQuery: 'python' });
  assert.equal(searchPython.length, 1);
  assert.equal(searchPython[0].id, 'tick_1');

  // 5. Combined filter
  const combined = filterTickets(mockTickets, { status: 'resolved', searchQuery: 'Aarav' });
  assert.equal(combined.length, 1);
  assert.equal(combined[0].id, 'tick_3');
});

test('sortTicketsByUpdated places most recently updated ticket first', () => {
  const mockTickets: SupportTicket[] = [
    {
      id: 'tick_old',
      requestId: 'tick_old',
      userId: 'u1',
      userName: 'User',
      userEmail: 'u@test.com',
      subject: 'Old',
      category: 'general',
      message: 'old message',
      status: 'open',
      createdAt: 100,
      updatedAt: 150,
    },
    {
      id: 'tick_new',
      requestId: 'tick_new',
      userId: 'u1',
      userName: 'User',
      userEmail: 'u@test.com',
      subject: 'New',
      category: 'general',
      message: 'new message',
      status: 'open',
      createdAt: 200,
      updatedAt: 500,
    },
  ];

  const sorted = sortTicketsByUpdated(mockTickets);
  assert.equal(sorted[0].id, 'tick_new');
  assert.equal(sorted[1].id, 'tick_old');
});
