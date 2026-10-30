import { useState, useEffect, useCallback } from 'react';
import {
  X,
  LifeBuoy,
  MessageSquare,
  Send,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Search,
  ChevronRight,
  User,
  ShieldCheck,
  Calendar,
  Filter,
} from 'lucide-react';
import { SupportTicket, SupportReply, SupportTicketStatus, SupportTicketCategory } from '../types';
import {
  getUserSupportTickets,
  getTicketReplies,
  addSupportReply,
  createSupportTicket,
} from '../services/ticketService';
import {
  formatTicketStatus,
  formatTicketCategory,
  formatTicketDate,
  filterTickets,
  SUPPORT_CATEGORIES,
} from '../utils/ticketUtils';

interface MyTicketsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: {
    uid: string;
    email: string | null;
    displayName: string | null;
  } | null;
  userProfile?: {
    fullName?: string;
    requestedRole?: string;
  } | null;
}

export function MyTicketsModal({
  isOpen,
  onClose,
  currentUser,
  userProfile,
}: MyTicketsModalProps) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<SupportTicketStatus | 'all'>('all');

  // Active viewing ticket & conversation
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replies, setReplies] = useState<SupportReply[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  // Create new ticket inline mode
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newCategory, setNewCategory] = useState<SupportTicketCategory>('general');
  const [newMessage, setNewMessage] = useState('');
  const [creatingTicket, setCreatingTicket] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  const loadTickets = useCallback(async (isManual = false) => {
    if (!currentUser) return;
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const data = await getUserSupportTickets(currentUser.uid);
      setTickets(data);
      // If a ticket is currently selected, refresh its object
      if (selectedTicket) {
        const updated = data.find((t) => t.id === selectedTicket.id);
        if (updated) setSelectedTicket(updated);
      }
    } catch (err: any) {
      console.error('Failed to load support tickets:', err);
      setError(err?.message || 'Could not load your support tickets.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser, selectedTicket]);

  useEffect(() => {
    if (isOpen && currentUser) {
      loadTickets();
    }
  }, [isOpen, currentUser, loadTickets]);

  // Load replies when selectedTicket changes
  const loadReplies = useCallback(async (ticketId: string) => {
    setLoadingReplies(true);
    setReplyError(null);
    try {
      const data = await getTicketReplies(ticketId);
      setReplies(data);
    } catch (err: any) {
      console.error('Failed to load replies:', err);
      setReplyError('Could not load conversation thread.');
    } finally {
      setLoadingReplies(false);
    }
  }, []);

  const handleSelectTicket = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setIsCreatingNew(false);
    setReplyText('');
    setReplyError(null);
    loadReplies(ticket.id);
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedTicket) return;
    const trimmed = replyText.trim();
    if (!trimmed) {
      setReplyError('Please enter a message before sending.');
      return;
    }

    setSubmittingReply(true);
    setReplyError(null);

    try {
      const newReply = await addSupportReply({
        ticketId: selectedTicket.id,
        authorUid: currentUser.uid,
        authorName: userProfile?.fullName || currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
        authorRole: 'user',
        message: trimmed,
        ticketSubject: selectedTicket.subject,
        ticketNumber: selectedTicket.ticketNumber,
      });

      setReplies((prev) => [...prev, newReply]);
      setReplyText('');
      // Refresh tickets to update updatedAt
      await loadTickets(true);
    } catch (err: any) {
      console.error('Failed to send reply:', err);
      setReplyError(err?.message || 'Failed to send your message.');
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setCreatingTicket(true);
    setCreateError(null);
    setCreateSuccess(null);

    try {
      const created = await createSupportTicket({
        userId: currentUser.uid,
        userName: userProfile?.fullName || currentUser.displayName || currentUser.email?.split('@')[0] || 'Learner',
        userEmail: currentUser.email || 'learner@capacityconnect.edu',
        subject: newSubject,
        category: newCategory,
        message: newMessage,
      });

      setCreateSuccess(`Ticket #${created.ticketNumber || created.requestId} created successfully!`);
      setNewSubject('');
      setNewMessage('');
      setNewCategory('general');
      await loadTickets(true);
      setTimeout(() => {
        setIsCreatingNew(false);
        handleSelectTicket(created);
      }, 800);
    } catch (err: any) {
      console.error('Failed to create ticket:', err);
      setCreateError(err?.message || 'Failed to submit ticket.');
    } finally {
      setCreatingTicket(false);
    }
  };

  if (!isOpen) return null;

  const filtered = filterTickets(tickets, {
    status: statusFilter,
    searchQuery,
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="my-tickets-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl h-[90vh] max-h-[820px] flex flex-col shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-950/80 border border-cyan-800/80 flex items-center justify-center text-cyan-400 shrink-0">
              <LifeBuoy className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="my-tickets-modal-title" className="text-base sm:text-lg font-bold text-white tracking-tight">
                  My Support Tickets
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-950 text-cyan-300 border border-cyan-800/60 font-mono">
                  {tickets.length} {tickets.length === 1 ? 'ticket' : 'tickets'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Track and converse with faculty support staff regarding platform inquiries
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadTickets(true)}
              disabled={refreshing}
              aria-label="Refresh tickets"
              className="p-2 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-xl border border-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              title="Refresh tickets"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close support tickets modal"
              className="p-2 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-xl border border-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body: Two columns on medium screens */}
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-800 bg-slate-950/40">
          {/* Column 1: Ticket List & Search (5 cols) */}
          <div className="md:col-span-5 flex flex-col h-full min-h-0 bg-slate-900/60">
            {/* Search and Action Bar */}
            <div className="p-3 sm:p-4 border-b border-slate-800 space-y-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by ticket #, subject..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs"
                    >
                      ×
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingNew(true);
                    setSelectedTicket(null);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-xl transition-colors flex items-center gap-1 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New</span>
                </button>
              </div>

              {/* Status Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin text-[11px]">
                {(['all', 'open', 'in_progress', 'waiting_for_user', 'resolved'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
                      statusFilter === st
                        ? 'bg-cyan-950 text-cyan-300 border border-cyan-800 font-semibold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent'
                    }`}
                  >
                    {st === 'all' ? 'All' : formatTicketStatus(st).label}
                  </button>
                ))}
              </div>
            </div>

            {/* Ticket Cards List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {loading ? (
                <div className="py-16 text-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin text-cyan-400 mx-auto mb-2" />
                  <p className="text-xs">Loading support tickets...</p>
                </div>
              ) : error ? (
                <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" />
                    <span>Failed to load tickets</span>
                  </div>
                  <p className="text-slate-300">{error}</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-12 px-4 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-500 mx-auto mb-3">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-semibold text-white">No support tickets found</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                    {searchQuery || statusFilter !== 'all'
                      ? 'No tickets match the selected filters. Try clearing your search.'
                      : 'You have not submitted any support tickets yet. Need help? Click New Ticket to contact us.'}
                  </p>
                  {!searchQuery && statusFilter === 'all' && (
                    <button
                      type="button"
                      onClick={() => setIsCreatingNew(true)}
                      className="mt-4 px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-xl transition-colors inline-flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create Your First Ticket</span>
                    </button>
                  )}
                </div>
              ) : (
                filtered.map((ticket) => {
                  const statusMeta = formatTicketStatus(ticket.status);
                  const isSelected = selectedTicket?.id === ticket.id;

                  return (
                    <div
                      key={ticket.id}
                      onClick={() => handleSelectTicket(ticket)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-left ${
                        isSelected
                          ? 'bg-slate-900 border-cyan-500/70 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-500/30'
                          : 'bg-slate-950/70 hover:bg-slate-900/80 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className="font-mono text-[10px] font-semibold text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded-md border border-cyan-800/60">
                          {ticket.ticketNumber || ticket.requestId.slice(0, 10)}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusMeta.badgeClass}`}>
                          {statusMeta.label}
                        </span>
                      </div>

                      <h5 className="text-xs font-bold text-white line-clamp-1 group-hover:text-cyan-300">
                        {ticket.subject}
                      </h5>

                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">
                        {ticket.message}
                      </p>

                      <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500">
                        <span className="truncate max-w-[140px] text-slate-400">
                          {formatTicketCategory(ticket.category)}
                        </span>
                        <span className="font-mono">
                          {formatTicketDate(ticket.updatedAt || ticket.createdAt)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Column 2: Ticket Detail View / Reply Thread OR Create Ticket Form (7 cols) */}
          <div className="md:col-span-7 flex flex-col h-full min-h-0 bg-slate-950/30">
            {isCreatingNew ? (
              /* Inline Ticket Creator */
              <div className="p-4 sm:p-6 overflow-y-auto flex-1">
                <div className="max-w-lg mx-auto space-y-4">
                  <div className="border-b border-slate-800 pb-3">
                    <h4 className="text-base font-bold text-white">Create New Support Ticket</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Submit an inquiry to our faculty admins. We will respond directly to your ticket.
                    </p>
                  </div>

                  {createSuccess && (
                    <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-xs text-emerald-300 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{createSuccess}</span>
                    </div>
                  )}

                  {createError && (
                    <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/60 text-xs text-rose-300 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>{createError}</span>
                    </div>
                  )}

                  <form onSubmit={handleCreateTicket} className="space-y-4">
                    {/* Category Selection */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                        Category <span className="text-rose-400">*</span>
                      </label>
                      <select
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value as SupportTicketCategory)}
                        className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
                      >
                        {SUPPORT_CATEGORIES.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.label} — {cat.description}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Subject */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                        Subject <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={newSubject}
                        onChange={(e) => setNewSubject(e.target.value)}
                        placeholder="e.g. Cannot open Lecture 3 resources in Cloud Database"
                        maxLength={150}
                        required
                        className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                      />
                    </div>

                    {/* Detailed Message */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                        Detailed Description <span className="text-rose-400">*</span>
                      </label>
                      <textarea
                        rows={6}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Describe the issue, steps to reproduce, or specific help needed..."
                        maxLength={2000}
                        required
                        className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                      />
                      <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                        <span>Min 10 characters</span>
                        <span>{newMessage.length} / 2000</span>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center gap-3">
                      <button
                        type="submit"
                        disabled={creatingTicket}
                        className="px-5 py-2.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-xl transition-colors shadow-md shadow-cyan-400/20 flex items-center gap-2 disabled:opacity-50"
                      >
                        {creatingTicket ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Submitting Ticket...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>Submit Support Ticket</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsCreatingNew(false)}
                        className="px-4 py-2.5 text-xs font-medium text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            ) : selectedTicket ? (
              /* Conversation & Ticket Detail View */
              <div className="flex flex-col h-full min-h-0">
                {/* Selected Ticket Top Banner */}
                <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900/40 shrink-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-semibold text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded-md border border-cyan-800/60">
                          {selectedTicket.ticketNumber || selectedTicket.requestId}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${formatTicketStatus(selectedTicket.status).badgeClass}`}>
                          {formatTicketStatus(selectedTicket.status).label}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                          • {formatTicketCategory(selectedTicket.category)}
                        </span>
                      </div>
                      <h4 className="text-sm sm:text-base font-bold text-white mt-1">
                        {selectedTicket.subject}
                      </h4>
                    </div>

                    <div className="text-right text-[11px] text-slate-400">
                      <span className="block text-slate-500 text-[10px]">Submitted on</span>
                      <span className="font-mono">{formatTicketDate(selectedTicket.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Messages Stream: Initial Message + Conversation Thread */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                  {/* Original Inquiry Card */}
                  <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-2 pb-2 border-b border-slate-800/60">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-cyan-950 flex items-center justify-center text-cyan-400 text-xs font-semibold">
                          You
                        </div>
                        <span className="font-semibold text-white">{selectedTicket.userName}</span>
                        <span className="text-[10px] text-slate-500 font-mono">({selectedTicket.userEmail})</span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-500">
                        {formatTicketDate(selectedTicket.createdAt)}
                      </span>
                    </div>
                    <div className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                      {selectedTicket.message}
                    </div>
                  </div>

                  {/* Replies List */}
                  {loadingReplies ? (
                    <div className="py-8 text-center text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin text-cyan-400 mx-auto mb-1" />
                      <span className="text-xs">Loading replies...</span>
                    </div>
                  ) : replies.length === 0 ? (
                    <div className="py-6 text-center text-slate-500 text-xs">
                      No admin replies yet. Our support faculty has received your ticket and will respond here.
                    </div>
                  ) : (
                    replies.map((reply) => {
                      const isAdmin = reply.authorRole === 'admin';
                      return (
                        <div
                          key={reply.id}
                          className={`p-4 rounded-2xl border text-xs leading-relaxed ${
                            isAdmin
                              ? 'bg-cyan-950/30 border-cyan-800/60 ml-3 sm:ml-6'
                              : 'bg-slate-900/80 border-slate-800 mr-3 sm:mr-6'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs mb-2 pb-1.5 border-b border-slate-800/40">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-semibold ${
                                  isAdmin
                                    ? 'bg-cyan-500 text-slate-950 font-bold'
                                    : 'bg-slate-800 text-slate-300'
                                }`}
                              >
                                {isAdmin ? <ShieldCheck className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                              </div>
                              <span className="font-semibold text-white">
                                {reply.authorName}
                              </span>
                              {isAdmin && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-cyan-950 text-cyan-300 border border-cyan-800/60">
                                  Faculty Admin
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] font-mono text-slate-500">
                              {formatTicketDate(reply.createdAt)}
                            </span>
                          </div>

                          <div className="text-slate-200 whitespace-pre-wrap">
                            {reply.message}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Reply Composer Box */}
                <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950/80 shrink-0">
                  {replyError && (
                    <div className="mb-2 p-2 rounded-lg bg-rose-950/50 border border-rose-800/50 text-[11px] text-rose-300 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{replyError}</span>
                    </div>
                  )}

                  <form onSubmit={handleSendReply} className="flex gap-2">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type a response or follow-up question..."
                      maxLength={1500}
                      disabled={submittingReply}
                      className="flex-1 px-3.5 py-2 text-xs bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                    />
                    <button
                      type="submit"
                      disabled={submittingReply || !replyText.trim()}
                      className="px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 rounded-xl transition-colors flex items-center gap-1.5 shrink-0"
                    >
                      {submittingReply ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>Send</span>
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              /* No Ticket Selected Empty State */
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                <div className="w-16 h-16 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-3 shadow-inner">
                  <LifeBuoy className="w-8 h-8 text-cyan-400/60" />
                </div>
                <h4 className="text-sm font-bold text-white">Select a Ticket to View</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  Click any ticket on the left to read responses from our support faculty, or click New to submit a ticket.
                </p>
                <button
                  type="button"
                  onClick={() => setIsCreatingNew(true)}
                  className="mt-4 px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-xl transition-colors inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Submit New Ticket</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
