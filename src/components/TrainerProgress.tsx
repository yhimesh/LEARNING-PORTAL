import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertCircle,
  Users,
  Search,
  Filter,
  BarChart2,
  Loader2,
  BookOpen,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import { Course, CourseProgress, ProgressStatus } from '../types';
import { getCourseProgressForTrainer } from '../services/progressService';

interface TrainerProgressProps {
  courses: Course[];
  trainerId: string;
}

export function TrainerProgress({ courses, trainerId }: TrainerProgressProps) {
  const [selectedCourseId, setSelectedCourseId] = useState<string>(
    courses[0]?.id || ''
  );
  const [progressList, setProgressList] = useState<CourseProgress[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ProgressStatus>('all');

  // Auto-select first course when courses load
  useEffect(() => {
    if (!selectedCourseId && courses.length > 0) {
      setSelectedCourseId(courses[0].id);
    }
  }, [courses, selectedCourseId]);

  const fetchProgress = async () => {
    if (!selectedCourseId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getCourseProgressForTrainer(selectedCourseId, trainerId);
      // Sort in-progress first, then newest
      data.sort((a, b) => {
        if (a.status === 'in_progress' && b.status !== 'in_progress') return -1;
        if (b.status === 'in_progress' && a.status !== 'in_progress') return 1;
        return b.progressPercentage - a.progressPercentage;
      });
      setProgressList(data);
    } catch (err: any) {
      console.error('Failed to load course progress for trainer:', err);
      setError(err?.message || 'Could not load student progress records for this course.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCourseId) {
      fetchProgress();
    }
  }, [selectedCourseId]);

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);

  // Aggregated KPI Metrics
  const totalTrainees = progressList.length;
  const inProgressCount = progressList.filter((p) => p.status === 'in_progress').length;
  const completedCount = progressList.filter((p) => p.status === 'completed').length;
  const notStartedCount = progressList.filter((p) => p.status === 'not_started').length;
  const averageProgress =
    totalTrainees > 0
      ? Math.round(progressList.reduce((acc, p) => acc + p.progressPercentage, 0) / totalTrainees)
      : 0;

  // Filtered List
  const filteredList = progressList.filter((item) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (item.traineeName || '').toLowerCase().includes(q) ||
      (item.traineeEmail || '').toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatDate = (val: any) => {
    if (!val) return 'Recently';
    try {
      const d = val.toDate ? val.toDate() : new Date(val);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Recently';
    }
  };

  if (courses.length === 0) {
    return (
      <div className="p-8 rounded-3xl bg-slate-900/60 border border-dashed border-slate-800 text-center">
        <TrendingUp className="w-10 h-10 text-slate-500 mx-auto mb-2" />
        <h3 className="text-base font-semibold text-white">No Courses Available</h3>
        <p className="text-xs text-slate-400 mt-1">
          Create and publish courses to start tracking student curriculum completion.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Course Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-cyan-400" />
            <span>Course Progress & Learning Completion</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time curriculum progress and resource completion tracking for your courses.
          </p>
        </div>

        {/* Course Dropdown */}
        <div className="flex items-center gap-2">
          <label htmlFor="progress-course-select" className="text-xs text-slate-400 whitespace-nowrap">
            Select Course:
          </label>
          <select
            id="progress-course-select"
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
          >
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Tracking Trainees</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white">{totalTrainees}</div>
          <span className="text-[10px] text-slate-500">Active progress records</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">In Progress</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-300">{inProgressCount}</div>
          <span className="text-[10px] text-slate-500">Started but not finished</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">{completedCount}</div>
          <span className="text-[10px] text-slate-500">100% resources finished</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Average Progress</span>
            <BarChart2 className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-purple-300">{averageProgress}%</div>
          <span className="text-[10px] text-slate-500">Across enrolled learners</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by student name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          {(
            [
              { id: 'all', label: 'All Learners' },
              { id: 'in_progress', label: `In Progress (${inProgressCount})` },
              { id: 'completed', label: `Completed (${completedCount})` },
              { id: 'not_started', label: `Not Started (${notStartedCount})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                statusFilter === tab.id
                  ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}

          <button
            type="button"
            onClick={fetchProgress}
            disabled={loading}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div className="py-16 text-center">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-400">Loading student progress records...</p>
        </div>
      )}

      {error && !loading && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800/80 text-rose-300 text-xs sm:text-sm">
          {error}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredList.length === 0 && (
        <div className="p-12 text-center rounded-3xl bg-slate-900/60 border border-dashed border-slate-800">
          <TrendingUp className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white mb-1">No Progress Records Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {progressList.length === 0
              ? 'No students have started interacting with the curriculum materials for this course yet.'
              : 'No students match your selected status filter.'}
          </p>
        </div>
      )}

      {/* Progress Table */}
      {!loading && filteredList.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table aria-label="Student curriculum progress and module completion records" className="w-full text-left text-xs sm:text-sm min-w-[640px]">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th scope="col" className="py-3.5 px-4">Trainee</th>
                  <th scope="col" className="py-3.5 px-4">Status</th>
                  <th scope="col" className="py-3.5 px-4">Curriculum Progress</th>
                  <th scope="col" className="py-3.5 px-4 text-center">Modules Completed</th>
                  <th scope="col" className="py-3.5 px-4 text-right">Last Activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-slate-300">
                {filteredList.map((item) => {
                  const isCompleted = item.status === 'completed';
                  const isInProgress = item.status === 'in_progress';

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Trainee Details */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">
                          {item.traineeName || 'Trainee Learner'}
                        </div>
                        {item.traineeEmail && (
                          <div className="text-[11px] text-slate-500 font-mono">
                            {item.traineeEmail}
                          </div>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize ${
                            isCompleted
                              ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/80'
                              : isInProgress
                              ? 'bg-amber-950/80 text-amber-300 border border-amber-800/80'
                              : 'bg-slate-950 text-slate-400 border border-slate-800'
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : isInProgress ? (
                            <Clock className="w-3 h-3" />
                          ) : (
                            <AlertCircle className="w-3 h-3" />
                          )}
                          <span>
                            {item.status ? item.status.replace('_', ' ') : 'Not Started'}
                          </span>
                        </span>
                      </td>

                      {/* Progress Bar & Percentage */}
                      <td className="py-3.5 px-4 min-w-[200px]">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-bold text-white">
                            {item.progressPercentage}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isCompleted
                                ? 'bg-emerald-400'
                                : isInProgress
                                ? 'bg-gradient-to-r from-amber-400 to-cyan-400'
                                : 'bg-slate-700'
                            }`}
                            style={{ width: `${item.progressPercentage}%` }}
                          />
                        </div>
                      </td>

                      {/* Modules Count */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-semibold text-cyan-400">
                          {item.completedResourceCount}
                        </span>
                        <span className="text-slate-500"> / {item.totalResourceCount}</span>
                      </td>

                      {/* Last Activity */}
                      <td className="py-3.5 px-4 text-slate-400 text-xs text-right">
                        {formatDate(item.updatedAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
