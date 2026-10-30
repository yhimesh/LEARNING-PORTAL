import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Users,
  BookOpen,
  Award,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  Filter,
  ArrowUpRight,
  HelpCircle,
  AlertCircle,
  FileText,
  X,
  Target,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { Course, CourseAnalyticsItem, TrainerAnalyticsSummary } from '../types';
import { fetchTrainerAnalytics } from '../services/analyticsService';

interface TrainerAnalyticsProps {
  trainerId: string;
  courses: Course[];
  onOpenCreateCourse?: () => void;
  onViewCourseDetails?: (courseId: string) => void;
}

export function TrainerAnalytics({
  trainerId,
  courses,
  onOpenCreateCourse,
  onViewCourseDetails,
}: TrainerAnalyticsProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<TrainerAnalyticsSummary | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'archived'>('all');

  // Course detail modal state
  const [selectedCourse, setSelectedCourse] = useState<CourseAnalyticsItem | null>(null);

  const loadAnalytics = useCallback(async (isManualRefresh = false) => {
    if (!trainerId) return;
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const data = await fetchTrainerAnalytics(trainerId, courses);
      setSummary(data);
      setLastRefreshed(new Date());
    } catch (err: any) {
      console.error('Failed to load trainer analytics:', err);
      setError(err?.message || 'Failed to aggregate analytics from Firestore.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [trainerId, courses]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  // Filter courses list
  const filteredCourses = useMemo(() => {
    if (!summary) return [];
    return summary.courses.filter((c) => {
      const matchesSearch =
        c.courseTitle.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        c.category.toLowerCase().includes(searchQuery.toLowerCase().trim());
      const matchesStatus =
        statusFilter === 'all' ? true : c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [summary, searchQuery, statusFilter]);

  // Max enrollments for bar scaling
  const maxEnrollments = useMemo(() => {
    if (!summary || summary.courses.length === 0) return 1;
    const max = Math.max(...summary.courses.map((c) => c.enrollmentCount));
    return max > 0 ? max : 1;
  }, [summary]);

  return (
    <div className="mt-10 border-t border-slate-800/80 pt-10">
      {/* Header Lockup */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 font-mono">
              <BarChart3 className="w-3.5 h-3.5" />
              Trainer Analytics
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-950/70 text-emerald-400 border border-emerald-800/50">
              <ShieldCheck className="w-3 h-3" />
              Live Firestore Verified
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Trainer Analytics & Performance
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Real-time enrollment counts, cohort completion rates, and quiz score outcomes across your courses.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] text-slate-500 font-mono hidden md:inline-block">
            Refreshed {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          <button
            type="button"
            onClick={() => loadAnalytics(true)}
            disabled={refreshing || loading}
            aria-label="Refresh trainer analytics"
            className="px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl transition-all flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-cyan-400' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh Data'}</span>
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 mb-6 rounded-2xl bg-rose-950/40 border border-rose-800/60 text-slate-200 text-xs sm:text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold text-rose-300">Unable to load analytics data</div>
            <p className="text-slate-300 leading-relaxed">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => loadAnalytics(true)}
            className="ml-auto px-3 py-1 text-xs font-semibold text-rose-200 bg-rose-900/60 hover:bg-rose-800 rounded-lg transition-colors shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !summary && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 rounded-2xl bg-slate-900/60 border border-slate-800/80 animate-pulse" />
            ))}
          </div>
          <div className="h-64 rounded-2xl bg-slate-900/60 border border-slate-800/80 animate-pulse" />
        </div>
      )}

      {/* Analytics Content */}
      {summary && (
        <div className="space-y-8">
          {/* Summary KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {/* Total Courses */}
            <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="font-semibold text-slate-300">My Courses</span>
                <BookOpen className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <div className="text-2xl font-black text-white font-mono">{summary.totalCourses}</div>
                <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-400">
                  <span className="text-emerald-400 font-semibold">{summary.publishedCoursesCount} pub</span>
                  <span>•</span>
                  <span className="text-amber-400">{summary.draftCoursesCount} draft</span>
                  {summary.archivedCoursesCount > 0 && (
                    <>
                      <span>•</span>
                      <span className="text-slate-500">{summary.archivedCoursesCount} arch</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Total Enrollments */}
            <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="font-semibold text-slate-300">Total Enrollments</span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <div className="text-2xl font-black text-white font-mono">{summary.totalEnrollments}</div>
                <p className="text-[11px] text-slate-400 mt-2">
                  Total course registrations
                </p>
              </div>
            </div>

            {/* Unique Trainees */}
            <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="font-semibold text-slate-300">Unique Learners</span>
                <Users className="w-4 h-4 text-indigo-400" />
              </div>
              <div>
                <div className="text-2xl font-black text-white font-mono">{summary.uniqueTraineesCount}</div>
                <p className="text-[11px] text-slate-400 mt-2">
                  Distinct enrolled trainees
                </p>
              </div>
            </div>

            {/* Average Course Progress */}
            <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="font-semibold text-slate-300">Cohort Progress</span>
                <CheckCircle2 className="w-4 h-4 text-teal-400" />
              </div>
              <div>
                <div className="text-2xl font-black text-white font-mono">{summary.averageProgress}%</div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full bg-gradient-to-r from-teal-500 to-cyan-400 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, summary.averageProgress)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Total Submissions */}
            <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="font-semibold text-slate-300">Quiz Submissions</span>
                <FileText className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <div className="text-2xl font-black text-white font-mono">{summary.totalSubmissions}</div>
                <p className="text-[11px] text-slate-400 mt-2">
                  Across {summary.totalAssessments} quizzes
                </p>
              </div>
            </div>

            {/* Average Score */}
            <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="font-semibold text-slate-300">Average Score</span>
                <Award className="w-4 h-4 text-violet-400" />
              </div>
              <div>
                {summary.averageScore !== null ? (
                  <>
                    <div className="text-2xl font-black text-white font-mono">{summary.averageScore}%</div>
                    <p className="text-[11px] text-slate-400 mt-2">
                      Pass rate: <span className="text-emerald-400 font-semibold">{summary.overallPassRate ?? 0}%</span>
                    </p>
                  </>
                ) : (
                  <>
                    <div className="text-lg font-bold text-slate-400 font-mono">N/A</div>
                    <p className="text-[11px] text-slate-500 mt-2">
                      No graded results yet
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart 1: Enrollments by Course */}
            <div className="lg:col-span-2 p-5 sm:p-6 rounded-2xl bg-slate-900/70 border border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-cyan-400" />
                    Enrollments by Course
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Total trainee registrations per authored course
                  </p>
                </div>
              </div>

              {summary.courses.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <BookOpen className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs">No courses created yet.</p>
                </div>
              ) : summary.totalEnrollments === 0 ? (
                <div className="py-12 text-center text-slate-400 bg-slate-950/40 rounded-xl border border-slate-800/60">
                  <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-300 font-medium">No trainees enrolled yet</p>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
                    When trainees enroll in your published courses, enrollment counts and comparisons will display here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3.5 pt-2">
                  {summary.courses.map((course) => {
                    const percentage = Math.round((course.enrollmentCount / maxEnrollments) * 100);
                    return (
                      <div key={course.courseId} className="group">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-slate-200 font-medium truncate max-w-xs sm:max-w-md group-hover:text-cyan-300 transition-colors">
                            {course.courseTitle}
                          </span>
                          <span className="font-mono text-cyan-400 font-semibold shrink-0 ml-2">
                            {course.enrollmentCount} {course.enrollmentCount === 1 ? 'learner' : 'learners'}
                          </span>
                        </div>
                        <div className="w-full bg-slate-800/90 h-3 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(4, percentage)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Chart 2: Course Progress Distribution */}
            <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2 mb-1">
                  <Target className="w-4 h-4 text-teal-400" />
                  Cohort Progress Breakdown
                </h3>
                <p className="text-xs text-slate-400 mb-5">
                  Completion status across all enrolled learners
                </p>

                {summary.totalEnrollments === 0 ? (
                  <div className="py-10 text-center text-slate-400 bg-slate-950/40 rounded-xl border border-slate-800/60">
                    <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-xs text-slate-300 font-medium">No progress records yet</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Learners will appear here as they complete resources.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Visual Segmented Bar */}
                    {(() => {
                      const total =
                        summary.progressDistribution.notStarted +
                        summary.progressDistribution.inProgress +
                        summary.progressDistribution.completed;
                      const completedPct = total > 0 ? Math.round((summary.progressDistribution.completed / total) * 100) : 0;
                      const inProgressPct = total > 0 ? Math.round((summary.progressDistribution.inProgress / total) * 100) : 0;
                      const notStartedPct = total > 0 ? 100 - completedPct - inProgressPct : 0;

                      return (
                        <div>
                          <div className="h-4 w-full bg-slate-800 rounded-full overflow-hidden flex">
                            {completedPct > 0 && (
                              <div
                                style={{ width: `${completedPct}%` }}
                                className="bg-emerald-500 transition-all duration-500"
                                title={`Completed: ${completedPct}%`}
                              />
                            )}
                            {inProgressPct > 0 && (
                              <div
                                style={{ width: `${inProgressPct}%` }}
                                className="bg-amber-500 transition-all duration-500"
                                title={`In Progress: ${inProgressPct}%`}
                              />
                            )}
                            {notStartedPct > 0 && (
                              <div
                                style={{ width: `${notStartedPct}%` }}
                                className="bg-slate-600 transition-all duration-500"
                                title={`Not Started: ${notStartedPct}%`}
                              />
                            )}
                          </div>

                          {/* Legend with Counts */}
                          <div className="grid grid-cols-1 gap-2.5 mt-5">
                            <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                              <span className="flex items-center gap-2 text-slate-300">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                <span>Completed (100%)</span>
                              </span>
                              <span className="font-mono font-semibold text-emerald-400">
                                {summary.progressDistribution.completed}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                              <span className="flex items-center gap-2 text-slate-300">
                                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                                <span>In Progress (1-99%)</span>
                              </span>
                              <span className="font-mono font-semibold text-amber-400">
                                {summary.progressDistribution.inProgress}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                              <span className="flex items-center gap-2 text-slate-300">
                                <span className="w-2.5 h-2.5 rounded-full bg-slate-600" />
                                <span>Not Started (0%)</span>
                              </span>
                              <span className="font-mono font-semibold text-slate-400">
                                {summary.progressDistribution.notStarted}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-500">
                Average learner completion: <span className="text-cyan-400 font-semibold">{summary.averageProgress}%</span>
              </div>
            </div>
          </div>

          {/* Chart 3: Assessment Score Distribution (Only when graded results exist) */}
          <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/70 border border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-violet-400" />
                  Quiz & Assessment Performance
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Distribution of authoritative quiz scores graded by the system
                </p>
              </div>

              {summary.totalSubmissions > 0 && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">Overall Pass Rate:</span>
                  <span className="px-2.5 py-0.5 rounded-full font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 font-mono">
                    {summary.overallPassRate ?? 0}%
                  </span>
                </div>
              )}
            </div>

            {summary.totalSubmissions === 0 ? (
              <div className="py-10 text-center text-slate-400 bg-slate-950/40 rounded-xl border border-slate-800/60">
                <FileText className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-300 font-medium">No assessment results available yet</p>
                <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
                  When trainees take and submit published quizzes for your courses, graded score distributions will automatically calculate here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                {/* 85 - 100% */}
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
                  <div className="text-xs font-semibold text-emerald-400 mb-1 flex items-center justify-between">
                    <span>85% - 100%</span>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-300">Mastery</span>
                  </div>
                  <div className="text-xl font-extrabold text-white font-mono">
                    {summary.scoreDistribution.range85to100}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">High distinction</p>
                </div>

                {/* 70 - 84% */}
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
                  <div className="text-xs font-semibold text-cyan-400 mb-1 flex items-center justify-between">
                    <span>70% - 84%</span>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-cyan-950/60 text-cyan-300">Proficient</span>
                  </div>
                  <div className="text-xl font-extrabold text-white font-mono">
                    {summary.scoreDistribution.range70to84}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Met standard passing</p>
                </div>

                {/* 50 - 69% */}
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
                  <div className="text-xs font-semibold text-amber-400 mb-1 flex items-center justify-between">
                    <span>50% - 69%</span>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-300">Developing</span>
                  </div>
                  <div className="text-xl font-extrabold text-white font-mono">
                    {summary.scoreDistribution.range50to69}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Borderline score</p>
                </div>

                {/* < 50% */}
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
                  <div className="text-xs font-semibold text-rose-400 mb-1 flex items-center justify-between">
                    <span>&lt; 50%</span>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-rose-950/60 text-rose-300">Needs Review</span>
                  </div>
                  <div className="text-xl font-extrabold text-white font-mono">
                    {summary.scoreDistribution.under50}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Remediation suggested</p>
                </div>
              </div>
            )}
          </div>

          {/* Course-Level Analytics Table */}
          <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/70 border border-slate-800">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-cyan-400" />
                  Course-by-Course Performance Breakdown
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Detailed analytics per course with enrollment, progress, and assessment metrics
                </p>
              </div>

              {/* Search & Filter Bar */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-[200px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search courses..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl p-1 text-xs">
                  <Filter className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
                  {(['all', 'published', 'draft', 'archived'] as const).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setStatusFilter(status)}
                      className={`px-2.5 py-1 rounded-lg capitalize transition-colors font-medium ${
                        statusFilter === status
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {filteredCourses.length === 0 ? (
              <div className="py-12 text-center text-slate-400 bg-slate-950/40 rounded-xl border border-slate-800/60">
                <BookOpen className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-300 font-medium">No matching courses found</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Try adjusting your search query or status filter.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-3">Course</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3 text-right">Enrollments</th>
                      <th className="py-3 px-3">Avg Progress</th>
                      <th className="py-3 px-3">Learners Status</th>
                      <th className="py-3 px-3 text-right">Quizzes</th>
                      <th className="py-3 px-3 text-right">Submissions</th>
                      <th className="py-3 px-3 text-right">Avg Score</th>
                      <th className="py-3 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredCourses.map((c) => (
                      <tr
                        key={c.courseId}
                        className="hover:bg-slate-800/40 transition-colors group"
                      >
                        {/* Course Title & Metadata */}
                        <td className="py-3.5 px-3">
                          <div className="font-semibold text-white group-hover:text-cyan-300 transition-colors">
                            {c.courseTitle}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                            <span>{c.category}</span>
                            <span>•</span>
                            <span>{c.level}</span>
                          </div>
                        </td>

                        {/* Status badge */}
                        <td className="py-3.5 px-3">
                          {c.status === 'published' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/70 border border-emerald-800/50 text-emerald-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              Published
                            </span>
                          ) : c.status === 'draft' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-950/70 border border-amber-800/50 text-amber-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                              Draft
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 border border-slate-700 text-slate-400">
                              Archived
                            </span>
                          )}
                        </td>

                        {/* Enrollment count */}
                        <td className="py-3.5 px-3 text-right font-mono font-bold text-white">
                          {c.enrollmentCount}
                        </td>

                        {/* Average learner progress */}
                        <td className="py-3.5 px-3">
                          <div className="w-28">
                            <div className="flex items-center justify-between text-[11px] mb-1">
                              <span className="font-mono text-cyan-300 font-semibold">{c.averageProgress}%</span>
                            </div>
                            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-cyan-400 rounded-full transition-all duration-300"
                                style={{ width: `${Math.min(100, c.averageProgress)}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Learners breakdown */}
                        <td className="py-3.5 px-3 text-[11px]">
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-400 font-medium" title="Completed">
                              {c.completedCount} comp
                            </span>
                            <span>•</span>
                            <span className="text-amber-400 font-medium" title="In Progress">
                              {c.inProgressCount} in prog
                            </span>
                            <span>•</span>
                            <span className="text-slate-500" title="Not Started">
                              {c.notStartedCount} unstarted
                            </span>
                          </div>
                        </td>

                        {/* Quizzes Count */}
                        <td className="py-3.5 px-3 text-right font-mono text-slate-300">
                          {c.assessmentCount}
                        </td>

                        {/* Submissions */}
                        <td className="py-3.5 px-3 text-right font-mono text-slate-300">
                          {c.submissionCount}
                        </td>

                        {/* Average Score */}
                        <td className="py-3.5 px-3 text-right font-mono">
                          {c.averageScore !== null ? (
                            <span className="font-semibold text-emerald-400">
                              {c.averageScore}%
                            </span>
                          ) : (
                            <span className="text-slate-500 font-sans">N/A</span>
                          )}
                        </td>

                        {/* Action: Select / View Details */}
                        <td className="py-3.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedCourse(c)}
                            aria-label={`View analytics details for ${c.courseTitle}`}
                            className="px-2.5 py-1 text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-800/60 rounded-lg transition-colors inline-flex items-center gap-1 focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-300"
                          >
                            <span>Inspect</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Course Detail Modal */}
      {selectedCourse && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="course-detail-title"
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl relative">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/50">
                    {selectedCourse.category}
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {selectedCourse.level}
                  </span>
                </div>
                <h3 id="course-detail-title" className="text-lg sm:text-xl font-bold text-white">
                  {selectedCourse.courseTitle}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCourse(null)}
                aria-label="Close details"
                className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800/60 hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-6 space-y-5 text-xs sm:text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-xs text-slate-400 mb-1">Total Enrolled Trainees</div>
                  <div className="text-2xl font-bold text-white font-mono">{selectedCourse.enrollmentCount}</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-xs text-slate-400 mb-1">Average Completion</div>
                  <div className="text-2xl font-bold text-cyan-400 font-mono">{selectedCourse.averageProgress}%</div>
                </div>
              </div>

              {/* Progress Breakdown */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="text-xs font-semibold text-slate-300">Cohort Learning State</div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Completed Course:</span>
                  <span className="font-mono text-emerald-400 font-bold">{selectedCourse.completedCount} learners</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Currently In Progress:</span>
                  <span className="font-mono text-amber-400 font-bold">{selectedCourse.inProgressCount} learners</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Not Started Yet:</span>
                  <span className="font-mono text-slate-400 font-bold">{selectedCourse.notStartedCount} learners</span>
                </div>
              </div>

              {/* Assessment Outcomes */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="text-xs font-semibold text-slate-300">Assessment & Quiz Performance</div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Created Quizzes:</span>
                  <span className="font-mono text-white font-bold">{selectedCourse.assessmentCount}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Graded Submissions:</span>
                  <span className="font-mono text-white font-bold">{selectedCourse.submissionCount}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Average Score:</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {selectedCourse.averageScore !== null ? `${selectedCourse.averageScore}%` : 'N/A (No submissions)'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Course Pass Rate:</span>
                  <span className="font-mono text-cyan-300 font-bold">
                    {selectedCourse.passRate !== null ? `${selectedCourse.passRate}%` : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              {onViewCourseDetails && (
                <button
                  type="button"
                  onClick={() => {
                    const cid = selectedCourse.courseId;
                    setSelectedCourse(null);
                    onViewCourseDetails(cid);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <span>Open Course Curriculum</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedCourse(null)}
                className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
