import { useState, useEffect, useCallback } from 'react';
import {
  LifeBuoy,
  MessageSquare,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Search,
  User,
  ShieldCheck,
  Check,
  Filter,
  X,
  ExternalLink,
} from 'lucide-react';
import { SupportTicket, SupportReply, SupportTicketStatus, SupportTicketCategory } from '../types';
import {
  getAllSupportTickets,
  getTicketReplies,
  addSupportReply,
  updateSupportTicketStatus,
} from '../services/ticketService';
import {
  formatTicketStatus,
  formatTicketCategory,
  formatTicketDate,
  filterTickets,
} from '../utils/ticketUtils';
import { useAuth } from '../context/AuthContext';

export function AdminTicketsSection() {
  const { currentUser, userProfile } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<SupportTicketStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<SupportTicketCategory | 'all'>('all');

  // Selected Ticket & Conversation
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replies, setReplies] = useState<SupportReply[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyStatusSelect, setReplyStatusSelect] = useState<SupportTicketStatus>('waiting_for_user');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  // Status updating inline
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  const loadTickets = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const data = await getAllSupportTickets();
      setTickets(data);
      if (selectedTicket) {
        const found = data.find((t) => t.id === selectedTicket.id);
        if (found) setSelectedTicket(found);
      }
    } catch (err: any) {
      console.error('Failed to load tickets in admin desk:', err);
      setError(err?.message || 'Failed to aggregate support tickets.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedTicket]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const loadReplies = useCallback(async (ticketId: string) => {
    setLoadingReplies(true);
    setReplyError(null);
    try {
      const data = await getTicketReplies(ticketId);
      setReplies(data);
    } catch (err: any) {
      console.error('Failed to load ticket replies:', err);
      setReplyError('Could not load conversation replies.');
    } finally {
      setLoadingReplies(false);
    }
  }, []);

  const handleSelectTicket = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setReplyText('');
    setReplyError(null);
    setReplyStatusSelect(ticket.status === 'open' ? 'in_progress' : ticket.status);
    loadReplies(ticket.id);
  };

  const handleSendAdminReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedTicket) return;
    const trimmed = replyText.trim();
    if (!trimmed) {
      setReplyError('Please enter a response message.');
      return;
    }

    setSubmittingReply(true);
    setReplyError(null);

    try {
      const newReply = await addSupportReply({
        ticketId: selectedTicket.id,
        authorUid: currentUser.uid,
        authorName: userProfile?.fullName || currentUser.displayName || 'Faculty Admin Support',
        authorRole: 'admin',
        message: trimmed,
        targetUserUid: selectedTicket.userId,
        ticketSubject: selectedTicket.subject,
        ticketNumber: selectedTicket.ticketNumber,
        newStatus: replyStatusSelect,
      });

      setReplies((prev) => [...prev, newReply]);
      setReplyText('');
      // Refresh tickets to update parent state
      await loadTickets(true);
    } catch (err: any) {
      console.error('Failed to send admin reply:', err);
      setReplyError(err?.message || 'Failed to post admin response.');
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleUpdateStatus = async (ticketId: string, newStatus: SupportTicketStatus) => {
    setUpdatingStatusId(ticketId);
    try {
      await updateSupportTicketStatus(ticketId, newStatus);
      await loadTickets(true);
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
    } catch (err: any) {
      console.error('Failed to update ticket status:', err);
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const filtered = filterTickets(tickets, {
    status: statusFilter,
    category: categoryFilter,
    searchQuery,
  });

  const openCount = tickets.filter((t) => t.status === 'open').length;
  const inProgressCount = tickets.filter((t) => t.status === 'in_progress').length;
  const waitingCount = tickets.filter((t) => t.status === 'waiting_for_user').length;
  const resolvedCount = tickets.filter((t) => t.status === 'resolved').length;

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-950/80 border border-cyan-800/80 flex items-center justify-center text-cyan-400 shrink-0">
              <LifeBuoy className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Support Ticket Management
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-950 text-cyan-300 border border-cyan-800/80 font-mono">
                  {tickets.length} total
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Review inquiries, respond to trainees and trainers, and update ticket lifecycle states
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => loadTickets(true)}
            disabled={refreshing}
            className="px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-xl transition-all shadow-sm flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-cyan-400' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh Desk'}</span>
          </button>
        </div>

        {/* 4 Status KPI Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800">
          <div
            onClick={() => setStatusFilter(statusFilter === 'open' ? 'all' : 'open')}
            className={`p-3 rounded-2xl border transition-all cursor-pointer ${
              statusFilter === 'open'
                ? 'bg-cyan-950/50 border-cyan-500'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span>Open</span>
            </div>
            <div className="text-2xl font-extrabold text-white mt-1">{openCount}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Needs triage</div>
          </div>

          <div
            onClick={() => setStatusFilter(statusFilter === 'in_progress' ? 'all' : 'in_progress')}
            className={`p-3 rounded-2xl border transition-all cursor-pointer ${
              statusFilter === 'in_progress'
                ? 'bg-amber-950/50 border-amber-500'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>In Progress</span>
            </div>
            <div className="text-2xl font-extrabold text-white mt-1">{inProgressCount}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Under investigation</div>
          </div>

          <div
            onClick={() => setStatusFilter(statusFilter === 'waiting_for_user' ? 'all' : 'waiting_for_user')}
            className={`p-3 rounded-2xl border transition-all cursor-pointer ${
              statusFilter === 'waiting_for_user'
                ? 'bg-purple-950/50 border-purple-500'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="text-[11px] font-semibold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              <span>Waiting for User</span>
            </div>
            <div className="text-2xl font-extrabold text-white mt-1">{waitingCount}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Awaiting learner reply</div>
          </div>

          <div
            onClick={() => setStatusFilter(statusFilter === 'resolved' ? 'all' : 'resolved')}
            className={`p-3 rounded-2xl border transition-all cursor-pointer ${
              statusFilter === 'resolved'
                ? 'bg-emerald-950/50 border-emerald-500'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Resolved</span>
            </div>
            <div className="text-2xl font-extrabold text-white mt-1">{resolvedCount}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Successfully closed</div>
          </div>
        </div>
      </div>

      {/* Main Split Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Table / List (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by ticket #, user name, email, subject..."
                className="w-full pl-10 pr-4 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as any)}
                className="px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-400 w-full sm:w-auto"
              >
                <option value="all">All Categories</option>
                <option value="general">General</option>
                <option value="account">Account & Login</option>
                <option value="enrollment">Enrollment</option>
                <option value="course_content">Curriculum & Quiz</option>
                <option value="technical_issue">Technical Bug</option>
                <option value="billing_access">Access & Keys</option>
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-400 w-full sm:w-auto"
              >
                <option value="all">All Statuses</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="waiting_for_user">Waiting for User</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
          </div>

          {/* Tickets List */}
          <div className="space-y-2.5 max-h-[640px] overflow-y-auto pr-1">
            {loading ? (
              <div className="py-16 text-center text-slate-400">
                <Loader2 className="w-7 h-7 animate-spin text-cyan-400 mx-auto mb-2" />
                <p className="text-xs">Loading all support tickets...</p>
              </div>
            ) : error ? (
              <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  <span>Error Loading Tickets</span>
                </div>
                <p className="text-slate-300">{error}</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center text-slate-500">
                <MessageSquare className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-300">No support tickets match criteria</p>
                <p className="text-xs text-slate-500 mt-1">Try resetting the filters or clearing the search query</p>
              </div>
            ) : (
              filtered.map((ticket) => {
                const statusMeta = formatTicketStatus(ticket.status);
                const isSelected = selectedTicket?.id === ticket.id;

                return (
                  <div
                    key={ticket.id}
                    onClick={() => handleSelectTicket(ticket)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer text-left ${
                      isSelected
                        ? 'bg-slate-900 border-cyan-500/70 shadow-lg shadow-cyan-950/30 ring-1 ring-cyan-500/40'
                        : 'bg-slate-950/60 hover:bg-slate-900/80 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-semibold text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded-md border border-cyan-800/60">
                          {ticket.ticketNumber || ticket.requestId.slice(0, 10)}
                        </span>
                        <span className="text-xs font-semibold text-white">
                          {ticket.userName}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
                          ({ticket.userEmail})
                        </span>
                      </div>

                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusMeta.badgeClass}`}>
                        {statusMeta.label}
                      </span>
                    </div>

                    <h5 className="text-xs sm:text-sm font-bold text-white line-clamp-1">
                      {ticket.subject}
                    </h5>

                    <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                      {ticket.message}
                    </p>

                    <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 text-[10px]">
                          {formatTicketCategory(ticket.category)}
                        </span>
                        {ticket.lastResponderRole && (
                          <span className="text-[10px] text-cyan-400">
                            Last reply: {ticket.lastResponderRole === 'admin' ? 'Admin' : 'User'}
                          </span>
                        )}
                      </div>
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

        {/* Right Conversation & Response Desk (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col min-h-[580px]">
          {selectedTicket ? (
            <div className="flex flex-col h-full space-y-4">
              {/* Selected Ticket Top Bar */}
              <div className="pb-3 border-b border-slate-800 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-semibold text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800/60">
                      {selectedTicket.ticketNumber || selectedTicket.requestId}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${formatTicketStatus(selectedTicket.status).badgeClass}`}>
                      {formatTicketStatus(selectedTicket.status).label}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white line-clamp-2">
                    {selectedTicket.subject}
                  </h4>
                  <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                    <User className="w-3 h-3 text-cyan-400" />
                    <span className="font-medium text-white">{selectedTicket.userName}</span>
                    <span className="text-slate-500 font-mono">({selectedTicket.userEmail})</span>
                  </div>
                </div>

                {/* Status Quick Changer Dropdown */}
                <div className="shrink-0">
                  <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                    Update Status
                  </label>
                  <select
                    value={selectedTicket.status}
                    onChange={(e) => handleUpdateStatus(selectedTicket.id, e.target.value as SupportTicketStatus)}
                    disabled={updatingStatusId === selectedTicket.id}
                    className="px-2.5 py-1 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="waiting_for_user">Waiting for User</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
              </div>

              {/* Message Thread */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[360px]">
                {/* Original User Inquiry */}
                <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5 pb-1 border-b border-slate-800/60">
                    <span className="font-semibold text-white">{selectedTicket.userName} (Inquiry)</span>
                    <span className="font-mono text-slate-500">{formatTicketDate(selectedTicket.createdAt)}</span>
                  </div>
                  <p className="text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {selectedTicket.message}
                  </p>
                </div>

                {/* Replies Thread */}
                {loadingReplies ? (
                  <div className="py-6 text-center text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin text-cyan-400 mx-auto mb-1" />
                    <span className="text-xs">Loading replies...</span>
                  </div>
                ) : replies.length === 0 ? (
                  <div className="py-4 text-center text-xs text-slate-500">
                    No responses recorded yet. Write an official admin response below.
                  </div>
                ) : (
                  replies.map((reply) => {
                    const isAdmin = reply.authorRole === 'admin';
                    return (
                      <div
                        key={reply.id}
                        className={`p-3 rounded-2xl border text-xs ${
                          isAdmin
                            ? 'bg-cyan-950/30 border-cyan-800/60 ml-4'
                            : 'bg-slate-950/90 border-slate-800 mr-4'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] mb-1.5 pb-1 border-b border-slate-800/40">
                          <div className="flex items-center gap-1.5">
                            {isAdmin ? (
                              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                            ) : (
                              <User className="w-3.5 h-3.5 text-slate-400" />
                            )}
                            <span className="font-semibold text-white">{reply.authorName}</span>
                            {isAdmin && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-cyan-950 text-cyan-300 border border-cyan-800/60">
                                Admin
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-mono text-slate-500">
                            {formatTicketDate(reply.createdAt)}
                          </span>
                        </div>
                        <p className="text-slate-200 whitespace-pre-wrap leading-relaxed">
                          {reply.message}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Admin Response Composer */}
              <div className="pt-3 border-t border-slate-800 space-y-3">
                {replyError && (
                  <div className="p-2 rounded-lg bg-rose-950/50 border border-rose-800/50 text-[11px] text-rose-300 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{replyError}</span>
                  </div>
                )}

                <form onSubmit={handleSendAdminReply} className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-semibold text-white">Write Official Admin Response:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-500">Set Status to:</span>
                      <select
                        value={replyStatusSelect}
                        onChange={(e) => setReplyStatusSelect(e.target.value as SupportTicketStatus)}
                        className="px-2 py-0.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none"
                      >
                        <option value="waiting_for_user">Waiting for User</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    </div>
                  </div>

                  <textarea
                    rows={3}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Provide official troubleshooting instructions or status update..."
                    maxLength={1500}
                    disabled={submittingReply}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  />

                  <div className="flex items-center justify-between pt-1">
                    <div className="text-[10px] text-slate-500">
                      Recorded with Admin UID: <span className="font-mono text-cyan-400">{currentUser?.uid.slice(0, 8)}...</span>
                    </div>

                    <button
                      type="submit"
                      disabled={submittingReply || !replyText.trim()}
                      className="px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 rounded-xl transition-colors flex items-center gap-1.5"
                    >
                      {submittingReply ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Dispatching...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Send Response</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-500">
              <LifeBuoy className="w-12 h-12 text-slate-700 mb-2" />
              <h4 className="text-sm font-semibold text-white">No Ticket Selected</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Select any support inquiry from the list on the left to inspect requester credentials, view conversation thread, and post responses.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
