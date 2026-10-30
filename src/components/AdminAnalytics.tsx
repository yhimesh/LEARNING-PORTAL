import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ShieldCheck,
  Users,
  GraduationCap,
  Briefcase,
  Clock,
  CheckCircle2,
  BookOpen,
  FileCheck2,
  Award,
  RefreshCw,
  Search,
  Filter,
  Check,
  Loader2,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  ExternalLink,
  SlidersHorizontal,
  ChevronRight,
  Calendar,
  X,
  Mail,
  Send,
  Eye,
  LifeBuoy,
  BarChart3,
} from 'lucide-react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile, Course, CourseEnrollmentStat, AdminPlatformAnalyticsSummary } from '../types';
import { fetchAdminPlatformAnalytics } from '../services/adminAnalyticsService';
import { createNotification } from '../services/notificationService';
import { sendEmailNotification } from '../services/emailService';
import { AdminTicketsSection } from './AdminTicketsSection';

interface AdminAnalyticsProps {
  onViewCourseDetails?: (courseId: string) => void;
  onExploreCourses?: () => void;
  onOpenCreateCourse?: () => void;
}

export function AdminAnalytics({
  onViewCourseDetails,
  onExploreCourses,
  onOpenCreateCourse,
}: AdminAnalyticsProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<AdminPlatformAnalyticsSummary | null>(null);
  const [rawUsers, setRawUsers] = useState<UserProfile[]>([]);
  const [rawCourses, setRawCourses] = useState<Course[]>([]);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // User management / filter state
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'Trainee' | 'Trainer-approved' | 'Trainer-pending'>('all');
  const [approvingUid, setApprovingUid] = useState<string | null>(null);
  const [rejectingUid, setRejectingUid] = useState<string | null>(null);

  // Course filter state
  const [courseSearchQuery, setCourseSearchQuery] = useState('');
  const [courseStatusFilter, setCourseStatusFilter] = useState<'all' | 'published' | 'draft' | 'archived'>('all');

  // Navigation tab state
  const [activeAdminTab, setActiveAdminTab] = useState<'analytics' | 'tickets' | 'email'>('analytics');

  const loadData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const data = await fetchAdminPlatformAnalytics();
      setSummary(data.summary);
      setRawUsers(data.users);
      setRawCourses(data.courses);
      setLastRefreshed(new Date());
    } catch (err: any) {
      console.error('Failed to load admin analytics:', err);
      setError(err?.message || 'Failed to aggregate platform analytics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Transactional Email Monitor State
  const [emailStatus, setEmailStatus] = useState<{
    configured: boolean;
    provider: string;
    apiKeyMasked: string | null;
    fromAddress: string;
    totalDispatched: number;
    logs: any[];
  } | null>(null);
  const [loadingEmailLogs, setLoadingEmailLogs] = useState(false);
  const [testSendingEvent, setTestSendingEvent] = useState<string | null>(null);
  const [testRecipientEmail, setTestRecipientEmail] = useState('yhimeshc@gmail.com');
  const [testResultFeedback, setTestResultFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [previewHtmlModal, setPreviewHtmlModal] = useState<{ subject: string; html: string } | null>(null);

  const loadEmailLogs = useCallback(async () => {
    setLoadingEmailLogs(true);
    try {
      const res = await fetch('/api/email-logs', {
        headers: {
          'x-admin-email': auth.currentUser?.email || '',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setEmailStatus(data);
      }
    } catch (e) {
      console.warn('Failed to fetch email logs:', e);
    } finally {
      setLoadingEmailLogs(false);
    }
  }, []);

  const handleSendTestEmail = async (eventType: string) => {
    setTestSendingEvent(eventType);
    setTestResultFeedback(null);
    try {
      const res = await fetch('/api/send-test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-email': auth.currentUser?.email || '',
        },
        body: JSON.stringify({
          eventType,
          recipientEmail: testRecipientEmail || 'yhimeshc@gmail.com',
          recipientName: 'Faculty Administrator',
          adminEmail: auth.currentUser?.email || '',
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestResultFeedback({
          type: 'success',
          message: data.message || 'Test email dispatched successfully via Resend!',
        });
        await loadEmailLogs();
      } else {
        setTestResultFeedback({
          type: 'error',
          message: data.error || 'Failed to dispatch test email.',
        });
      }
    } catch (err: any) {
      setTestResultFeedback({
        type: 'error',
        message: err?.message || 'Network error while triggering test email.',
      });
    } finally {
      setTestSendingEvent(null);
    }
  };

  useEffect(() => {
    loadData();
    loadEmailLogs();
  }, [loadData, loadEmailLogs]);

  // Handle immediate admin approval of a pending trainer
  const handleApproveTrainer = async (uid: string) => {
    setApprovingUid(uid);
    try {
      const userRef = doc(db, 'users', uid);
      const targetUser = rawUsers.find((u) => u.uid === uid);

      await updateDoc(userRef, {
        accountStatus: 'active',
        updatedAt: serverTimestamp(),
      });

      try {
        await createNotification({
          id: `appr_${uid}`,
          recipientUid: uid,
          type: 'trainer_approved',
          title: 'Faculty Privileges Approved',
          message: 'Your faculty trainer application has been approved by an administrator. You now have full course creation and curriculum authoring permissions.',
          relatedEntityId: uid,
          relatedEntityType: 'user',
        });

        if (targetUser?.email) {
          sendEmailNotification({
            eventType: 'trainer_approved',
            recipientEmail: targetUser.email,
            recipientName: targetUser.fullName || targetUser.email.split('@')[0],
            data: {},
            idempotencyKey: `email_appr_${uid}`,
          }).catch((emailErr) => console.warn('Notice: Non-critical email dispatch notice:', emailErr));
        }
      } catch (notifErr) {
        console.warn('Notice: Non-critical alert generation warning:', notifErr);
      }

      // Refresh analytics data
      await loadData(true);
    } catch (err: any) {
      console.error('Failed to approve trainer account:', err);
    } finally {
      setApprovingUid(null);
    }
  };

  // Handle immediate admin rejection of a pending trainer
  const handleRejectTrainer = async (uid: string, customReason?: string) => {
    setRejectingUid(uid);
    try {
      const userRef = doc(db, 'users', uid);
      const targetUser = rawUsers.find((u) => u.uid === uid);
      const reason = customReason || 'Verification credentials did not meet faculty criteria.';

      await updateDoc(userRef, {
        accountStatus: 'disabled',
        updatedAt: serverTimestamp(),
      });

      try {
        await createNotification({
          id: `rej_${uid}`,
          recipientUid: uid,
          type: 'trainer_rejected',
          title: 'Faculty Application Update',
          message: `Your faculty trainer application could not be approved at this time: ${reason}`,
          relatedEntityId: uid,
          relatedEntityType: 'user',
        });

        if (targetUser?.email) {
          sendEmailNotification({
            eventType: 'trainer_rejected',
            recipientEmail: targetUser.email,
            recipientName: targetUser.fullName || targetUser.email.split('@')[0],
            data: { reason },
            idempotencyKey: `email_rej_${uid}`,
          }).catch((emailErr) => console.warn('Notice: Non-critical email dispatch notice:', emailErr));
        }
      } catch (notifErr) {
        console.warn('Notice: Non-critical alert generation warning:', notifErr);
      }

      // Refresh analytics data
      await loadData(true);
    } catch (err: any) {
      console.error('Failed to reject trainer account:', err);
    } finally {
      setRejectingUid(null);
    }
  };

  // Filtered users
  const filteredUsers = useMemo(() => {
    return rawUsers.filter((u) => {
      const matchesSearch =
        u.fullName.toLowerCase().includes(userSearchQuery.toLowerCase().trim()) ||
        u.email.toLowerCase().includes(userSearchQuery.toLowerCase().trim()) ||
        u.uid.toLowerCase().includes(userSearchQuery.toLowerCase().trim());

      let matchesFilter = true;
      if (userRoleFilter === 'Trainee') {
        matchesFilter = u.requestedRole === 'Trainee';
      } else if (userRoleFilter === 'Trainer-approved') {
        matchesFilter = u.requestedRole === 'Trainer' && u.accountStatus === 'active';
      } else if (userRoleFilter === 'Trainer-pending') {
        matchesFilter = u.requestedRole === 'Trainer' && u.accountStatus === 'pending';
      }

      return matchesSearch && matchesFilter;
    });
  }, [rawUsers, userSearchQuery, userRoleFilter]);

  // Filtered courses
  const filteredCourses = useMemo(() => {
    if (!summary) return [];
    return summary.courseEnrollmentStats.filter((c) => {
      const matchesSearch =
        c.courseTitle.toLowerCase().includes(courseSearchQuery.toLowerCase().trim()) ||
        c.category.toLowerCase().includes(courseSearchQuery.toLowerCase().trim()) ||
        c.trainerName.toLowerCase().includes(courseSearchQuery.toLowerCase().trim());

      const matchesStatus =
        courseStatusFilter === 'all' ? true : c.status === courseStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [summary, courseSearchQuery, courseStatusFilter]);

  // Max enrollment count for relative progress bars
  const maxEnrollmentCount = useMemo(() => {
    if (!summary || summary.topEnrolledCourses.length === 0) return 1;
    const max = Math.max(...summary.topEnrolledCourses.map((c) => c.enrollmentCount));
    return max > 0 ? max : 1;
  }, [summary]);

  if (loading && !summary) {
    return (
      <div className="mt-10 border-t border-slate-800/80 pt-10">
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white">Loading Platform Analytics...</h3>
          <p className="text-sm text-slate-400 mt-1">
            Querying Firestore collections for users, courses, enrollments, and assessment results.
          </p>
        </div>
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div className="mt-10 border-t border-slate-800/80 pt-10">
        <div className="bg-rose-950/30 border border-rose-800/50 rounded-3xl p-8 text-center">
          <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white">Platform Analytics Unavailable</h3>
          <p className="text-sm text-rose-300/90 mt-1 max-w-md mx-auto">{error}</p>
          <button
            type="button"
            onClick={() => loadData(true)}
            className="mt-5 px-4 py-2 text-xs font-semibold text-slate-950 bg-rose-400 hover:bg-rose-300 rounded-xl transition-colors inline-flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Connection</span>
          </button>
        </div>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="mt-10 border-t border-slate-800/80 pt-10">
      {/* Header Lockup */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-950/90 text-indigo-300 border border-indigo-700/60 font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>PLATFORM ANALYTICS</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-950/70 text-emerald-400 border border-emerald-800/50">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live Firestore DB</span>
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Administrator Platform Analytics
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            Centralized platform health metrics, user onboarding demographics, course distribution, enrollment tracking, and assessment outcomes across CAPACITY CONNECT.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div className="text-right hidden sm:block">
            <span className="text-[11px] text-slate-500 block">Last Synced</span>
            <span className="text-xs text-slate-300 font-mono">
              {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-xl transition-all shadow-sm flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            title="Refresh analytics data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-cyan-400' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Admin Module Tabs: Analytics, Support Tickets, Email Delivery */}
      <div className="flex items-center gap-2 mb-8 p-1.5 rounded-2xl bg-slate-900 border border-slate-800 w-fit overflow-x-auto max-w-full shadow-lg">
        <button
          type="button"
          onClick={() => setActiveAdminTab('analytics')}
          className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
            activeAdminTab === 'analytics'
              ? 'bg-cyan-400 text-slate-950 shadow-md shadow-cyan-400/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Platform Analytics & KPIs</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveAdminTab('tickets')}
          className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
            activeAdminTab === 'tickets'
              ? 'bg-cyan-400 text-slate-950 shadow-md shadow-cyan-400/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <LifeBuoy className="w-4 h-4" />
          <span>Support Ticket Desk</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveAdminTab('email')}
          className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
            activeAdminTab === 'email'
              ? 'bg-cyan-400 text-slate-950 shadow-md shadow-cyan-400/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>Email Delivery Monitor</span>
        </button>
      </div>

      {/* Tab View 1: Support Ticket Desk (Stage 9.2) */}
      {activeAdminTab === 'tickets' && (
        <AdminTicketsSection />
      )}

      {/* Tab View 2: Platform Analytics & KPIs */}
      {activeAdminTab === 'analytics' && (
        <>
          {/* 1. Summary Cards Overview Grid (9 KPIs) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Total Users */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-950/90 border border-slate-800 relative overflow-hidden group hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold uppercase tracking-wider text-slate-300">Total Users</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center text-cyan-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight">{summary.totalUsers}</div>
          <div className="text-xs text-slate-400 mt-2 flex items-center gap-1.5">
            <span className="text-cyan-400 font-semibold">{summary.traineesCount}</span> trainees
            <span className="text-slate-600">•</span>
            <span className="text-indigo-400 font-semibold">{summary.totalTrainersCount}</span> trainers
          </div>
        </div>

        {/* Active Trainees */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-950/90 border border-slate-800 relative overflow-hidden group hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold uppercase tracking-wider text-slate-300">Active Trainees</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center text-cyan-400">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight">{summary.activeTraineesCount}</div>
          <div className="text-xs text-slate-400 mt-2 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Eligible for enrollment</span>
          </div>
        </div>

        {/* Total & Approved Trainers */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-950/90 border border-slate-800 relative overflow-hidden group hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold uppercase tracking-wider text-slate-300">Approved Faculty</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight">{summary.approvedTrainersCount}</div>
          <div className="text-xs text-slate-400 mt-2 flex items-center gap-1.5">
            <span>of {summary.totalTrainersCount} registered trainers</span>
          </div>
        </div>

        {/* Pending Trainer Approvals */}
        <div className={`p-5 rounded-2xl bg-gradient-to-br border transition-colors ${
          summary.pendingTrainersCount > 0
            ? 'from-amber-950/30 to-slate-950 border-amber-800/60'
            : 'from-slate-900/90 to-slate-950/90 border-slate-800'
        }`}>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold uppercase tracking-wider text-slate-300">Pending Approvals</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              summary.pendingTrainersCount > 0
                ? 'bg-amber-950/80 border border-amber-700/60 text-amber-300'
                : 'bg-slate-900 border border-slate-800 text-slate-500'
            }`}>
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight">{summary.pendingTrainersCount}</div>
          <div className="text-xs text-slate-400 mt-2 flex items-center gap-1.5">
            {summary.pendingTrainersCount > 0 ? (
              <span className="text-amber-300 font-medium">Awaiting administrator verification</span>
            ) : (
              <span className="text-slate-500">All trainer requests processed</span>
            )}
          </div>
        </div>

        {/* Total Courses */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-950/90 border border-slate-800 relative overflow-hidden group hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold uppercase tracking-wider text-slate-300">Total Courses</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-950/80 border border-indigo-800/60 flex items-center justify-center text-indigo-400">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight">{summary.totalCourses}</div>
          <div className="text-xs text-slate-400 mt-2 flex items-center gap-1.5">
            <span className="text-emerald-400 font-semibold">{summary.publishedCoursesCount}</span> published
            <span className="text-slate-600">•</span>
            <span className="text-amber-300 font-semibold">{summary.draftCoursesCount}</span> draft
          </div>
        </div>

        {/* Published Courses */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-950/90 border border-slate-800 relative overflow-hidden group hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold uppercase tracking-wider text-slate-300">Published Courses</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight">{summary.publishedCoursesCount}</div>
          <div className="text-xs text-slate-400 mt-2 flex items-center gap-1.5">
            <span>
              {summary.totalCourses > 0
                ? `${Math.round((summary.publishedCoursesCount / summary.totalCourses) * 100)}% of curriculum live`
                : 'No courses registered'}
            </span>
          </div>
        </div>

        {/* Total Enrollments */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-950/90 border border-slate-800 relative overflow-hidden group hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold uppercase tracking-wider text-slate-300">Total Enrollments</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center text-cyan-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight">{summary.totalEnrollments}</div>
          <div className="text-xs text-slate-400 mt-2 flex items-center gap-1.5">
            <span className="text-cyan-300 font-semibold">{summary.uniqueEnrolledTraineesCount}</span> unique learners
          </div>
        </div>

        {/* Assessment Submissions & Outcomes */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-950/90 border border-slate-800 relative overflow-hidden group hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold uppercase tracking-wider text-slate-300">Quiz Submissions</span>
            <div className="w-8 h-8 rounded-lg bg-purple-950/80 border border-purple-800/60 flex items-center justify-center text-purple-400">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight">{summary.totalSubmissions}</div>
          <div className="text-xs text-slate-400 mt-2 flex items-center gap-1.5">
            {summary.averageScore !== null ? (
              <>
                <span className="text-purple-300 font-semibold">{summary.averageScore}%</span> avg score
                <span className="text-slate-600">•</span>
                <span className="text-emerald-400 font-semibold">{summary.overallPassRate}%</span> pass rate
              </>
            ) : (
              <span className="text-slate-500">No graded results yet</span>
            )}
          </div>
        </div>
      </div>

      {/* 2. Visualizations Section (2x2 Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* User Distribution Chart */}
        <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">User Demographics by Role & Status</h3>
              <p className="text-xs text-slate-400 mt-0.5">Distribution of accounts across trainees and faculty</p>
            </div>
            <Users className="w-5 h-5 text-cyan-400" />
          </div>

          {summary.totalUsers === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500">No users found in database</div>
          ) : (
            <div>
              {/* Proportional Multi-segment Bar */}
              <div className="w-full h-3.5 bg-slate-950 rounded-full overflow-hidden flex mb-4 border border-slate-800">
                <div
                  className="bg-cyan-400 h-full transition-all"
                  style={{ width: `${(summary.traineesCount / summary.totalUsers) * 100}%` }}
                  title={`Trainees: ${summary.traineesCount}`}
                />
                <div
                  className="bg-emerald-400 h-full transition-all"
                  style={{ width: `${(summary.approvedTrainersCount / summary.totalUsers) * 100}%` }}
                  title={`Approved Faculty: ${summary.approvedTrainersCount}`}
                />
                <div
                  className="bg-amber-400 h-full transition-all"
                  style={{ width: `${(summary.pendingTrainersCount / summary.totalUsers) * 100}%` }}
                  title={`Pending Faculty: ${summary.pendingTrainersCount}`}
                />
              </div>

              {/* Legend & Count Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shrink-0" />
                    <span className="text-xs text-slate-400 font-medium">Trainees</span>
                  </div>
                  <div className="text-lg font-bold text-white">{summary.traineesCount}</div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    {Math.round((summary.traineesCount / summary.totalUsers) * 100)}%
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
                    <span className="text-xs text-slate-400 font-medium">Approved Faculty</span>
                  </div>
                  <div className="text-lg font-bold text-white">{summary.approvedTrainersCount}</div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    {Math.round((summary.approvedTrainersCount / summary.totalUsers) * 100)}%
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
                    <span className="text-xs text-slate-400 font-medium">Pending Approvals</span>
                  </div>
                  <div className="text-lg font-bold text-white">{summary.pendingTrainersCount}</div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    {Math.round((summary.pendingTrainersCount / summary.totalUsers) * 100)}%
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Course Publication Breakdown */}
        <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Courses by Publication Status</h3>
              <p className="text-xs text-slate-400 mt-0.5">Curriculum lifecycle and catalog readiness</p>
            </div>
            <BookOpen className="w-5 h-5 text-indigo-400" />
          </div>

          {summary.totalCourses === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500">No courses in database</div>
          ) : (
            <div>
              {/* Proportional Multi-segment Bar */}
              <div className="w-full h-3.5 bg-slate-950 rounded-full overflow-hidden flex mb-4 border border-slate-800">
                <div
                  className="bg-emerald-400 h-full transition-all"
                  style={{ width: `${(summary.publishedCoursesCount / summary.totalCourses) * 100}%` }}
                  title={`Published: ${summary.publishedCoursesCount}`}
                />
                <div
                  className="bg-amber-400 h-full transition-all"
                  style={{ width: `${(summary.draftCoursesCount / summary.totalCourses) * 100}%` }}
                  title={`Draft: ${summary.draftCoursesCount}`}
                />
                <div
                  className="bg-slate-600 h-full transition-all"
                  style={{ width: `${(summary.archivedCoursesCount / summary.totalCourses) * 100}%` }}
                  title={`Archived: ${summary.archivedCoursesCount}`}
                />
              </div>

              {/* Legend & Count Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
                    <span className="text-xs text-slate-400 font-medium">Published</span>
                  </div>
                  <div className="text-lg font-bold text-white">{summary.publishedCoursesCount}</div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    {Math.round((summary.publishedCoursesCount / summary.totalCourses) * 100)}%
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
                    <span className="text-xs text-slate-400 font-medium">Draft</span>
                  </div>
                  <div className="text-lg font-bold text-white">{summary.draftCoursesCount}</div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    {Math.round((summary.draftCoursesCount / summary.totalCourses) * 100)}%
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-600 shrink-0" />
                    <span className="text-xs text-slate-400 font-medium">Archived</span>
                  </div>
                  <div className="text-lg font-bold text-white">{summary.archivedCoursesCount}</div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    {Math.round((summary.archivedCoursesCount / summary.totalCourses) * 100)}%
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Highest Enrollment Courses Chart */}
        <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Top Enrolled Courses</h3>
              <p className="text-xs text-slate-400 mt-0.5">Top performing courses ranked by student registration</p>
            </div>
            <TrendingUp className="w-5 h-5 text-cyan-400" />
          </div>

          {summary.topEnrolledCourses.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500">No course enrollments recorded</div>
          ) : (
            <div className="space-y-3">
              {summary.topEnrolledCourses.slice(0, 5).map((course, idx) => {
                const percent = Math.round((course.enrollmentCount / maxEnrollmentCount) * 100);
                return (
                  <div key={course.courseId} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 truncate pr-2">
                        <span className="w-5 h-5 rounded bg-slate-800 text-slate-400 font-mono text-[10px] flex items-center justify-center shrink-0">
                          #{idx + 1}
                        </span>
                        <span className="text-white font-medium truncate">{course.courseTitle}</span>
                        <span className="text-[11px] text-slate-500 hidden sm:inline truncate">
                          ({course.category})
                        </span>
                      </div>
                      <span className="text-cyan-400 font-semibold font-mono whitespace-nowrap">
                        {course.enrollmentCount} {course.enrollmentCount === 1 ? 'learner' : 'learners'}
                      </span>
                    </div>

                    <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Assessment Outcomes & Score Distribution */}
        <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Assessment Outcomes & Distribution</h3>
              <p className="text-xs text-slate-400 mt-0.5">Trainee performance across all graded assessments</p>
            </div>
            <Award className="w-5 h-5 text-purple-400" />
          </div>

          {summary.gradedAttemptsCount === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500">
              No graded assessments have been submitted yet.
            </div>
          ) : (
            <div>
              {/* Pass / Fail Proportion Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Passed: {summary.passedCount} ({summary.overallPassRate}%)</span>
                  </span>
                  <span className="text-rose-400 font-semibold">
                    Failed: {summary.failedCount} ({100 - (summary.overallPassRate || 0)}%)
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
                  <div
                    className="bg-emerald-400 h-full transition-all"
                    style={{ width: `${summary.overallPassRate || 0}%` }}
                  />
                  <div
                    className="bg-rose-400 h-full transition-all"
                    style={{ width: `${100 - (summary.overallPassRate || 0)}%` }}
                  />
                </div>
              </div>

              {/* Score Buckets */}
              <div className="grid grid-cols-4 gap-2 pt-2">
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
                  <div className="text-[10px] text-rose-400 uppercase font-semibold">&lt; 50%</div>
                  <div className="text-base font-bold text-white mt-0.5">{summary.scoreDistribution.under50}</div>
                  <div className="text-[10px] text-slate-500">Submissions</div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
                  <div className="text-[10px] text-amber-300 uppercase font-semibold">50 - 69%</div>
                  <div className="text-base font-bold text-white mt-0.5">{summary.scoreDistribution.range50to69}</div>
                  <div className="text-[10px] text-slate-500">Submissions</div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
                  <div className="text-[10px] text-cyan-300 uppercase font-semibold">70 - 84%</div>
                  <div className="text-base font-bold text-white mt-0.5">{summary.scoreDistribution.range70to84}</div>
                  <div className="text-[10px] text-slate-500">Submissions</div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
                  <div className="text-[10px] text-emerald-300 uppercase font-semibold">85 - 100%</div>
                  <div className="text-base font-bold text-white mt-0.5">{summary.scoreDistribution.range85to100}</div>
                  <div className="text-[10px] text-slate-500">Submissions</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. User Directory & Onboarding Management */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 sm:p-8 mb-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-400" />
              <span>User Directory & Status Management</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Registered learner and faculty accounts with real-time approval states.
            </p>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                placeholder="Search name, email, UID..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
              {userSearchQuery && (
                <button
                  type="button"
                  onClick={() => setUserSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setUserRoleFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  userRoleFilter === 'all' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                All ({rawUsers.length})
              </button>
              <button
                type="button"
                onClick={() => setUserRoleFilter('Trainee')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  userRoleFilter === 'Trainee' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Trainees ({summary.traineesCount})
              </button>
              <button
                type="button"
                onClick={() => setUserRoleFilter('Trainer-approved')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  userRoleFilter === 'Trainer-approved' ? 'bg-emerald-500/20 text-emerald-300 font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Faculty ({summary.approvedTrainersCount})
              </button>
              <button
                type="button"
                onClick={() => setUserRoleFilter('Trainer-pending')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  userRoleFilter === 'Trainer-pending' ? 'bg-amber-500/20 text-amber-300 font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Pending ({summary.pendingTrainersCount})
              </button>
            </div>
          </div>
        </div>

        {/* User Table */}
        <div className="overflow-x-auto">
          {filteredUsers.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-400">No users match your search criteria</p>
            </div>
          ) : (
            <table aria-label="User directory and onboarding status" className="w-full text-left text-xs min-w-[640px]">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th scope="col" className="pb-3 font-semibold">User Details</th>
                  <th scope="col" className="pb-3 font-semibold">Role</th>
                  <th scope="col" className="pb-3 font-semibold">Account Status</th>
                  <th scope="col" className="pb-3 font-semibold">Registered</th>
                  <th scope="col" className="pb-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredUsers.map((user) => (
                  <tr key={user.uid} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 pr-4">
                      <div className="font-semibold text-white">{user.fullName}</div>
                      <div className="text-[11px] text-slate-400 truncate">{user.email}</div>
                      <div className="text-[10px] text-cyan-400/80 font-mono mt-0.5">
                        UID: {user.uid.slice(0, 10)}...
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      {user.requestedRole === 'Trainer' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-950/80 text-indigo-300 border border-indigo-700/60">
                          <Briefcase className="w-3 h-3" />
                          <span>Trainer</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
                          <GraduationCap className="w-3 h-3" />
                          <span>Trainee</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      {user.accountStatus === 'active' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-800/50">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-950/80 text-amber-300 border border-amber-800/50">
                          <Clock className="w-3 h-3" />
                          <span>Pending Approval</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-slate-400">
                      {user.createdAt?.toDate ? (
                        user.createdAt.toDate().toLocaleDateString()
                      ) : (
                        <span className="text-slate-500">Recent</span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      {user.requestedRole === 'Trainer' && user.accountStatus === 'pending' && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleApproveTrainer(user.uid)}
                            disabled={approvingUid === user.uid || rejectingUid === user.uid}
                            className="px-2.5 py-1 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors inline-flex items-center gap-1 shadow-sm"
                          >
                            {approvingUid === user.uid ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>Approving...</span>
                              </>
                            ) : (
                              <>
                                <Check className="w-3 h-3" />
                                <span>Approve</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const reason = window.prompt(
                                'Provide an optional reason for rejecting this application:',
                                'Credentials could not be verified according to current faculty guidelines.'
                              );
                              if (reason !== null) {
                                handleRejectTrainer(user.uid, reason.trim() || undefined);
                              }
                            }}
                            disabled={approvingUid === user.uid || rejectingUid === user.uid}
                            className="px-2.5 py-1 text-xs font-semibold text-rose-300 bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800/60 rounded-lg transition-colors inline-flex items-center gap-1 shadow-sm"
                          >
                            {rejectingUid === user.uid ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>Rejecting...</span>
                              </>
                            ) : (
                              <>
                                <X className="w-3 h-3" />
                                <span>Reject</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 4. Course Curriculum & Platform Enrollment Table */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-400" />
              <span>Platform Course Performance & Enrollments</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Active curriculum catalog with enrollment scaling, quiz submissions, and outcomes.
            </p>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={courseSearchQuery}
                onChange={(e) => setCourseSearchQuery(e.target.value)}
                placeholder="Search title, category, trainer..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
              {courseSearchQuery && (
                <button
                  type="button"
                  onClick={() => setCourseSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setCourseStatusFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  courseStatusFilter === 'all' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                All ({summary.courseEnrollmentStats.length})
              </button>
              <button
                type="button"
                onClick={() => setCourseStatusFilter('published')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  courseStatusFilter === 'published' ? 'bg-emerald-500/20 text-emerald-300 font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Published ({summary.publishedCoursesCount})
              </button>
              <button
                type="button"
                onClick={() => setCourseStatusFilter('draft')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  courseStatusFilter === 'draft' ? 'bg-amber-500/20 text-amber-300 font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Draft ({summary.draftCoursesCount})
              </button>
            </div>
          </div>
        </div>

        {/* Course Table */}
        <div className="overflow-x-auto">
          {filteredCourses.length === 0 ? (
            <div className="py-12 text-center">
              <BookOpen className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-400">No courses match your filter criteria</p>
            </div>
          ) : (
            <table aria-label="Course catalog performance and enrollment metrics" className="w-full text-left text-xs min-w-[640px]">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th scope="col" className="pb-3 font-semibold">Course Title & Category</th>
                  <th scope="col" className="pb-3 font-semibold">Instructor</th>
                  <th scope="col" className="pb-3 font-semibold">Status</th>
                  <th scope="col" className="pb-3 font-semibold">Enrollments</th>
                  <th scope="col" className="pb-3 font-semibold">Submissions</th>
                  <th scope="col" className="pb-3 font-semibold">Avg Score</th>
                  <th scope="col" className="pb-3 font-semibold text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredCourses.map((c) => (
                  <tr key={c.courseId} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 pr-4">
                      <div className="font-semibold text-white">{c.courseTitle}</div>
                      <div className="text-[11px] text-cyan-400 font-mono mt-0.5">{c.category}</div>
                    </td>
                    <td className="py-3 pr-4 text-slate-300 font-medium">{c.trainerName}</td>
                    <td className="py-3 pr-4">
                      {c.status === 'published' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-800/50">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Published</span>
                        </span>
                      ) : c.status === 'draft' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-950/80 text-amber-300 border border-amber-800/50">
                          <Clock className="w-3 h-3" />
                          <span>Draft</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-900 text-slate-400 border border-slate-700/50">
                          <span>Archived</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="font-semibold text-white font-mono">{c.enrollmentCount}</div>
                      <div className="w-20 h-1.5 bg-slate-950 rounded-full overflow-hidden mt-1 border border-slate-800">
                        <div
                          className="h-full bg-cyan-400 rounded-full"
                          style={{ width: `${Math.min(100, Math.round((c.enrollmentCount / maxEnrollmentCount) * 100))}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-slate-300 font-mono">
                      {c.submissionCount}
                    </td>
                    <td className="py-3 pr-4">
                      {c.averageScore !== null ? (
                        <span className={`font-semibold font-mono ${
                          c.averageScore >= 70 ? 'text-emerald-400' : 'text-amber-300'
                        }`}>
                          {c.averageScore}%
                        </span>
                      ) : (
                        <span className="text-slate-600 font-mono">—</span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      {onViewCourseDetails && (
                        <button
                          type="button"
                          onClick={() => onViewCourseDetails(c.courseId)}
                          className="px-2.5 py-1 text-slate-400 hover:text-cyan-300 hover:bg-slate-800/60 rounded-lg transition-colors inline-flex items-center gap-1"
                        >
                          <span>View</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )}

      {/* 5. Transactional Email Notifications & Resend Integration Center (Stage 7.2) */}
      {activeAdminTab === 'email' && (
        <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-950/90 text-cyan-300 border border-cyan-700/60 font-mono">
                <Mail className="w-3.5 h-3.5 text-cyan-400" />
                <span>RESEND EMAIL DISPATCH</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-950/70 text-emerald-400 border border-emerald-800/50">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Resend Active</span>
              </span>
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              Transactional Email Delivery & Resend Monitor
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Server-side transactional email pipeline delivering branded HTML notifications for faculty onboarding, course enrollments, learning resources, and assessment results.
            </p>
          </div>

          <button
            type="button"
            onClick={loadEmailLogs}
            disabled={loadingEmailLogs}
            className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl transition-all shadow-sm flex items-center gap-1.5 self-start md:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingEmailLogs ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Sync Email Logs</span>
          </button>
        </div>

        {/* Resend Provider Status Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800/80">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Provider Engine</span>
            <div className="text-base font-bold text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Resend API</span>
            </div>
            <span className="text-[11px] text-emerald-400/90 font-mono mt-1 block">Live / Sandbox Ready</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800/80">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">API Key Configured</span>
            <div className="text-sm font-mono font-bold text-cyan-300 truncate">
              {emailStatus?.apiKeyMasked || 're_sih26075...'}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">Server Environment Secret</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800/80">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Sender Address (From)</span>
            <div className="text-xs font-mono font-semibold text-slate-200 truncate">
              {emailStatus?.fromAddress || 'notifications@capacityconnect.edu'}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">Standard Resend Domain</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800/80">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Dispatched (Session)</span>
            <div className="text-xl font-extrabold text-white">
              {emailStatus?.totalDispatched ?? 0} emails
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">Deduplicated & Logged</span>
          </div>
        </div>

        {/* Live Test Dispatch Control Panel */}
        <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-cyan-400" />
                <span>Test Email Dispatch via Resend</span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Trigger any of the 6 transactional templates through the Resend pipeline to verify live rendering.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="test-recipient-input" className="text-xs text-slate-400 whitespace-nowrap">Recipient:</label>
              <input
                id="test-recipient-input"
                type="email"
                value={testRecipientEmail}
                onChange={(e) => setTestRecipientEmail(e.target.value)}
                placeholder="target@example.com"
                className="px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 min-w-[200px]"
              />
            </div>
          </div>

          {testResultFeedback && (
            <div
              className={`mb-4 p-3 rounded-xl text-xs flex items-center justify-between ${
                testResultFeedback.type === 'success'
                  ? 'bg-emerald-950/60 border border-emerald-800/80 text-emerald-300'
                  : 'bg-rose-950/60 border border-rose-800/80 text-rose-300'
              }`}
            >
              <span>{testResultFeedback.message}</span>
              <button
                type="button"
                onClick={() => setTestResultFeedback(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            <button
              type="button"
              onClick={() => handleSendTestEmail('course_enrolled')}
              disabled={Boolean(testSendingEvent)}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 text-left transition-all"
            >
              <div className="text-[11px] font-semibold text-white">Course Enrolled</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Trainee Confirmation</div>
              {testSendingEvent === 'course_enrolled' && (
                <Loader2 className="w-3 h-3 text-cyan-400 animate-spin mt-1" />
              )}
            </button>

            <button
              type="button"
              onClick={() => handleSendTestEmail('trainer_approved')}
              disabled={Boolean(testSendingEvent)}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 text-left transition-all"
            >
              <div className="text-[11px] font-semibold text-white">Faculty Approved</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Trainer Onboarding</div>
              {testSendingEvent === 'trainer_approved' && (
                <Loader2 className="w-3 h-3 text-emerald-400 animate-spin mt-1" />
              )}
            </button>

            <button
              type="button"
              onClick={() => handleSendTestEmail('trainer_rejected')}
              disabled={Boolean(testSendingEvent)}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-rose-500/50 text-left transition-all"
            >
              <div className="text-[11px] font-semibold text-white">Faculty Rejected</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Application Notice</div>
              {testSendingEvent === 'trainer_rejected' && (
                <Loader2 className="w-3 h-3 text-rose-400 animate-spin mt-1" />
              )}
            </button>

            <button
              type="button"
              onClick={() => handleSendTestEmail('new_resource')}
              disabled={Boolean(testSendingEvent)}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-purple-500/50 text-left transition-all"
            >
              <div className="text-[11px] font-semibold text-white">New Resource</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Enrolled Learners</div>
              {testSendingEvent === 'new_resource' && (
                <Loader2 className="w-3 h-3 text-purple-400 animate-spin mt-1" />
              )}
            </button>

            <button
              type="button"
              onClick={() => handleSendTestEmail('assessment_result')}
              disabled={Boolean(testSendingEvent)}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 text-left transition-all"
            >
              <div className="text-[11px] font-semibold text-white">Quiz Graded</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Result & Score</div>
              {testSendingEvent === 'assessment_result' && (
                <Loader2 className="w-3 h-3 text-amber-400 animate-spin mt-1" />
              )}
            </button>

            <button
              type="button"
              onClick={() => handleSendTestEmail('admin_trainer_registered')}
              disabled={Boolean(testSendingEvent)}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 text-left transition-all"
            >
              <div className="text-[11px] font-semibold text-white">Admin Alert</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Pending Faculty</div>
              {testSendingEvent === 'admin_trainer_registered' && (
                <Loader2 className="w-3 h-3 text-indigo-400 animate-spin mt-1" />
              )}
            </button>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="overflow-x-auto">
          {!emailStatus || emailStatus.logs.length === 0 ? (
            <div className="py-8 text-center bg-slate-950/40 rounded-2xl border border-slate-800/80">
              <Mail className="w-7 h-7 text-slate-600 mx-auto mb-2" />
              <p className="text-xs font-medium text-slate-400">No emails dispatched yet in this dev session</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Click any test button above to send a sample email with Resend</p>
            </div>
          ) : (
            <table aria-label="Transactional email dispatch logs" className="w-full text-left text-xs min-w-[640px]">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th scope="col" className="pb-3 font-semibold">Timestamp</th>
                  <th scope="col" className="pb-3 font-semibold">Event Type</th>
                  <th scope="col" className="pb-3 font-semibold">Recipient</th>
                  <th scope="col" className="pb-3 font-semibold">Subject</th>
                  <th scope="col" className="pb-3 font-semibold">Provider Status</th>
                  <th scope="col" className="pb-3 font-semibold text-right">Preview</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {emailStatus.logs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 pr-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-3 pr-3">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
                        {log.eventType}
                      </span>
                    </td>
                    <td className="py-3 pr-3">
                      <div className="font-medium text-white">{log.recipientName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{log.recipientEmail}</div>
                    </td>
                    <td className="py-3 pr-3 text-slate-200 truncate max-w-[240px]">
                      {log.subject}
                    </td>
                    <td className="py-3 pr-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        <span>Resend Delivered</span>
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      {log.previewHtml && (
                        <button
                          type="button"
                          onClick={() => setPreviewHtmlModal({ subject: log.subject, html: log.previewHtml })}
                          className="px-2.5 py-1 text-slate-300 hover:text-cyan-300 hover:bg-slate-800/80 rounded-lg transition-colors inline-flex items-center gap-1 border border-slate-700/60"
                        >
                          <Eye className="w-3 h-3" />
                          <span>HTML</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    )}

      {/* Rendered Email HTML Preview Modal */}
      {previewHtmlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-mono text-cyan-400 font-bold block">
                  Rendered Email Preview
                </span>
                <h4 className="text-sm font-bold text-white truncate max-w-lg mt-0.5">
                  {previewHtmlModal.subject}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setPreviewHtmlModal(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-slate-950">
              <iframe
                title="Email Preview"
                srcDoc={previewHtmlModal.html}
                className="w-full h-[500px] border border-slate-800 rounded-2xl bg-slate-950"
              />
            </div>
            <div className="p-3 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewHtmlModal(null)}
                className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
