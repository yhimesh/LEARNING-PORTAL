import { SupportTicket, SupportTicketCategory, SupportTicketStatus, SupportReply } from '../types';

export const SUPPORT_CATEGORIES: { id: SupportTicketCategory; label: string; description: string }[] = [
  { id: 'general', label: 'General Inquiry', description: 'Platform overview, partnership, or general questions' },
  { id: 'account', label: 'Account & Login', description: 'Authentication, password reset, or profile verification' },
  { id: 'enrollment', label: 'Course Enrollment', description: 'Course access, progress sync, or syllabus queries' },
  { id: 'course_content', label: 'Curriculum & Resources', description: 'Lecture materials, assignments, or quiz checkpoints' },
  { id: 'technical_issue', label: 'Technical Bug & Performance', description: 'Page errors, loading glitches, or UI malfunctions' },
  { id: 'billing_access', label: 'Access & Institutional Keys', description: 'Faculty permissions, institution licenses, or tokens' },
];

export interface ValidateTicketInputResult {
  isValid: boolean;
  errors: {
    subject?: string;
    category?: string;
    message?: string;
    userId?: string;
    userEmail?: string;
    userName?: string;
  };
}

export function validateSupportTicketInput(input: {
  subject?: string;
  category?: string;
  message?: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
}): ValidateTicketInputResult {
  const errors: ValidateTicketInputResult['errors'] = {};

  const subject = input.subject ? input.subject.trim() : '';
  if (!subject) {
    errors.subject = 'Subject is required.';
  } else if (subject.length < 3) {
    errors.subject = 'Subject must be at least 3 characters long.';
  } else if (subject.length > 150) {
    errors.subject = 'Subject cannot exceed 150 characters.';
  }

  const validCategories: SupportTicketCategory[] = [
    'general',
    'account',
    'enrollment',
    'course_content',
    'technical_issue',
    'billing_access',
  ];

  if (!input.category || !validCategories.includes(input.category as SupportTicketCategory)) {
    errors.category = 'Please select a valid ticket category.';
  }

  const message = input.message ? input.message.trim() : '';
  if (!message) {
    errors.message = 'Inquiry message cannot be empty.';
  } else if (message.length < 10) {
    errors.message = 'Please provide more detail in your inquiry (at least 10 characters).';
  } else if (message.length > 2000) {
    errors.message = 'Inquiry message cannot exceed 2000 characters.';
  }

  if (!input.userId || input.userId.trim().length === 0) {
    errors.userId = 'User must be authenticated to submit a trackable support ticket.';
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!input.userEmail || !emailPattern.test(input.userEmail.trim())) {
    errors.userEmail = 'A valid contact email address is required.';
  }

  if (!input.userName || input.userName.trim().length < 2) {
    errors.userName = 'Full name is required (minimum 2 characters).';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export interface ValidateReplyInputResult {
  isValid: boolean;
  error?: string;
}

export function validateSupportReplyInput(input: {
  message?: string;
  authorUid?: string;
  authorRole?: string;
  ticketId?: string;
}): ValidateReplyInputResult {
  if (!input.authorUid || input.authorUid.trim().length === 0) {
    return { isValid: false, error: 'User must be signed in to post a reply.' };
  }

  if (input.authorRole !== 'admin' && input.authorRole !== 'user') {
    return { isValid: false, error: 'Invalid author role.' };
  }

  if (!input.ticketId || input.ticketId.trim().length === 0) {
    return { isValid: false, error: 'A valid ticket reference ID is required.' };
  }

  const message = input.message ? input.message.trim() : '';
  if (!message) {
    return { isValid: false, error: 'Reply message cannot be empty.' };
  }
  if (message.length < 2) {
    return { isValid: false, error: 'Reply message must be at least 2 characters.' };
  }
  if (message.length > 1500) {
    return { isValid: false, error: 'Reply message cannot exceed 1500 characters.' };
  }

  return { isValid: true };
}

export function formatTicketCategory(category: SupportTicketCategory | string): string {
  const found = SUPPORT_CATEGORIES.find((c) => c.id === category);
  if (found) return found.label;
  return category || 'General';
}

export interface StatusMeta {
  label: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  badgeClass: string;
}

export function formatTicketStatus(status: SupportTicketStatus | string): StatusMeta {
  switch (status) {
    case 'open':
      return {
        label: 'Open',
        colorClass: 'text-cyan-400',
        bgClass: 'bg-cyan-950/80',
        borderClass: 'border-cyan-800/80',
        badgeClass: 'bg-cyan-950/80 text-cyan-300 border border-cyan-800/80',
      };
    case 'in_progress':
      return {
        label: 'In Progress',
        colorClass: 'text-amber-400',
        bgClass: 'bg-amber-950/80',
        borderClass: 'border-amber-800/80',
        badgeClass: 'bg-amber-950/80 text-amber-300 border border-amber-800/80',
      };
    case 'waiting_for_user':
      return {
        label: 'Waiting for User',
        colorClass: 'text-purple-400',
        bgClass: 'bg-purple-950/80',
        borderClass: 'border-purple-800/80',
        badgeClass: 'bg-purple-950/80 text-purple-300 border border-purple-800/80',
      };
    case 'resolved':
      return {
        label: 'Resolved',
        colorClass: 'text-emerald-400',
        bgClass: 'bg-emerald-950/80',
        borderClass: 'border-emerald-800/80',
        badgeClass: 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/80',
      };
    default:
      return {
        label: status || 'Unknown',
        colorClass: 'text-slate-400',
        bgClass: 'bg-slate-900',
        borderClass: 'border-slate-800',
        badgeClass: 'bg-slate-900 text-slate-400 border border-slate-800',
      };
  }
}

export function filterTickets(
  tickets: SupportTicket[],
  filter: {
    status?: SupportTicketStatus | 'all';
    searchQuery?: string;
    category?: SupportTicketCategory | 'all';
  }
): SupportTicket[] {
  if (!Array.isArray(tickets)) return [];

  const query = filter.searchQuery ? filter.searchQuery.trim().toLowerCase() : '';
  const statusFilter = filter.status && filter.status !== 'all' ? filter.status : null;
  const categoryFilter = filter.category && filter.category !== 'all' ? filter.category : null;

  return tickets.filter((t) => {
    // 1. Status Filter
    if (statusFilter && t.status !== statusFilter) {
      return false;
    }

    // 2. Category Filter
    if (categoryFilter && t.category !== categoryFilter) {
      return false;
    }

    // 3. Search Query Filter
    if (query) {
      const matchId = (t.id && t.id.toLowerCase().includes(query)) ||
        (t.requestId && t.requestId.toLowerCase().includes(query)) ||
        (t.ticketNumber && t.ticketNumber.toLowerCase().includes(query));
      const matchSubject = t.subject && t.subject.toLowerCase().includes(query);
      const matchMessage = t.message && t.message.toLowerCase().includes(query);
      const matchUser = (t.userName && t.userName.toLowerCase().includes(query)) ||
        (t.userEmail && t.userEmail.toLowerCase().includes(query));
      const matchCategory = t.category && t.category.toLowerCase().includes(query);

      if (!matchId && !matchSubject && !matchMessage && !matchUser && !matchCategory) {
        return false;
      }
    }

    return true;
  });
}

export function sortTicketsByUpdated(tickets: SupportTicket[]): SupportTicket[] {
  return [...tickets].sort((a, b) => {
    const timeA = getTimeValue(a.updatedAt || a.createdAt);
    const timeB = getTimeValue(b.updatedAt || b.createdAt);
    return timeB - timeA;
  });
}

function getTimeValue(val: any): number {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  if (typeof val.toMillis === 'function') return val.toMillis();
  if (typeof val.toDate === 'function') return val.toDate().getTime();
  if (val instanceof Date) return val.getTime();
  const parsed = new Date(val).getTime();
  return isNaN(parsed) ? 0 : parsed;
}

export function formatTicketDate(timestamp: any): string {
  if (!timestamp) return 'Just now';
  let date: Date;

  if (typeof timestamp.toDate === 'function') {
    date = timestamp.toDate();
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else {
    date = new Date(timestamp);
  }

  if (isNaN(date.getTime())) return 'Recently';

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
