import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  SupportTicket,
  SupportReply,
  SupportTicketStatus,
  SupportTicketCategory,
} from '../types';
import {
  validateSupportTicketInput,
  validateSupportReplyInput,
  sortTicketsByUpdated,
} from '../utils/ticketUtils';
import { createNotification } from './notificationService';

export interface CreateSupportTicketInput {
  userId: string;
  userName: string;
  userEmail: string;
  subject: string;
  category: SupportTicketCategory;
  message: string;
}

export async function createSupportTicket(input: CreateSupportTicketInput): Promise<SupportTicket> {
  const validation = validateSupportTicketInput(input);
  if (!validation.isValid) {
    const firstErr = Object.values(validation.errors)[0] || 'Invalid support ticket parameters.';
    throw new Error(firstErr);
  }

  const timestampNum = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 7);
  const ticketId = `req_${timestampNum}_${randomSuffix}`;
  const ticketNumber = `TICK-${Math.floor(1000 + Math.random() * 9000)}`;

  const ticketRef = doc(db, 'supportRequests', ticketId);

  const newTicketData = {
    id: ticketId,
    requestId: ticketId,
    userId: input.userId,
    userName: input.userName.trim(),
    userEmail: input.userEmail.trim().toLowerCase(),
    subject: input.subject.trim(),
    category: input.category,
    message: input.message.trim(),
    status: 'open' as SupportTicketStatus,
    ticketNumber,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(ticketRef, newTicketData);

  // In-app alert notification confirming ticket receipt
  try {
    await createNotification({
      id: `notif_${ticketId}_created`,
      recipientUid: input.userId,
      type: 'system',
      title: `Support Ticket Received: ${ticketNumber}`,
      message: `Your inquiry "${input.subject.trim()}" has been recorded. Our support faculty will review it promptly.`,
      relatedEntityId: ticketId,
      relatedEntityType: 'course',
    });
  } catch (notifErr) {
    console.warn('Notice: Non-critical in-app ticket receipt notification skipped:', notifErr);
  }

  return {
    ...newTicketData,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export async function getUserSupportTickets(userId: string): Promise<SupportTicket[]> {
  if (!userId) return [];
  try {
    const q = query(
      collection(db, 'supportRequests'),
      where('userId', '==', userId)
    );
    const snap = await getDocs(q);
    const tickets: SupportTicket[] = [];
    snap.forEach((d) => {
      tickets.push({ id: d.id, ...d.data() } as SupportTicket);
    });
    return sortTicketsByUpdated(tickets);
  } catch (err: any) {
    console.error('Failed to load user support tickets:', err);
    throw new Error(err?.message || 'Failed to load your support tickets.');
  }
}

export async function getAllSupportTickets(): Promise<SupportTicket[]> {
  try {
    const snap = await getDocs(collection(db, 'supportRequests'));
    const tickets: SupportTicket[] = [];
    snap.forEach((d) => {
      tickets.push({ id: d.id, ...d.data() } as SupportTicket);
    });
    return sortTicketsByUpdated(tickets);
  } catch (err: any) {
    console.error('Failed to load admin support tickets:', err);
    throw new Error(err?.message || 'Failed to load tickets. Ensure you have admin permissions.');
  }
}

export async function getTicketReplies(ticketId: string): Promise<SupportReply[]> {
  if (!ticketId) return [];
  try {
    const q = query(
      collection(db, 'supportReplies'),
      where('ticketId', '==', ticketId)
    );
    const snap = await getDocs(q);
    const replies: SupportReply[] = [];
    snap.forEach((d) => {
      replies.push({ id: d.id, ...d.data() } as SupportReply);
    });

    // Sort replies chronologically ascending
    return replies.sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
      return timeA - timeB;
    });
  } catch (err: any) {
    console.error(`Failed to load replies for ticket ${ticketId}:`, err);
    throw new Error(err?.message || 'Failed to retrieve conversation replies.');
  }
}

export interface AddSupportReplyInput {
  ticketId: string;
  authorUid: string;
  authorName: string;
  authorRole: 'admin' | 'user';
  message: string;
  targetUserUid?: string; // If admin is replying, used for notifying the recipient
  ticketSubject?: string;
  ticketNumber?: string;
  newStatus?: SupportTicketStatus;
}

export async function addSupportReply(input: AddSupportReplyInput): Promise<SupportReply> {
  const validation = validateSupportReplyInput(input);
  if (!validation.isValid) {
    throw new Error(validation.error || 'Invalid reply message.');
  }

  const timestampNum = Date.now();
  const replyId = `rep_${timestampNum}_${Math.random().toString(36).substring(2, 7)}`;
  const replyRef = doc(db, 'supportReplies', replyId);

  const replyData = {
    id: replyId,
    ticketId: input.ticketId,
    authorUid: input.authorUid,
    authorName: input.authorName.trim(),
    authorRole: input.authorRole,
    message: input.message.trim(),
    createdAt: serverTimestamp(),
  };

  // 1. Save reply document
  await setDoc(replyRef, replyData);

  // 2. Update parent support ticket metadata
  const ticketRef = doc(db, 'supportRequests', input.ticketId);

  // If admin responds, status becomes waiting_for_user or custom newStatus;
  // If user responds, status becomes in_progress or open.
  const updatedStatus: SupportTicketStatus =
    input.newStatus || (input.authorRole === 'admin' ? 'waiting_for_user' : 'in_progress');

  await updateDoc(ticketRef, {
    status: updatedStatus,
    lastResponseAt: serverTimestamp(),
    lastResponderRole: input.authorRole,
    lastResponderName: input.authorName.trim(),
    updatedAt: serverTimestamp(),
  });

  // 3. Notify the ticket owner if an admin has replied
  if (input.authorRole === 'admin' && input.targetUserUid) {
    try {
      await createNotification({
        id: `notif_${replyId}`,
        recipientUid: input.targetUserUid,
        type: 'system',
        title: `Response on Ticket #${input.ticketNumber || input.ticketId.slice(0, 8)}`,
        message: `Admin ${input.authorName} replied: "${input.message.slice(0, 100)}${input.message.length > 100 ? '...' : ''}"`,
        relatedEntityId: input.ticketId,
        relatedEntityType: 'course',
      });
    } catch (notifErr) {
      console.warn('Notice: Non-critical user notification on admin reply failed:', notifErr);
    }
  }

  return {
    ...replyData,
    createdAt: new Date(),
  };
}

export async function updateSupportTicketStatus(
  ticketId: string,
  status: SupportTicketStatus
): Promise<void> {
  if (!ticketId) throw new Error('Ticket ID is required.');
  const ticketRef = doc(db, 'supportRequests', ticketId);

  await updateDoc(ticketRef, {
    status,
    updatedAt: serverTimestamp(),
  });
}
