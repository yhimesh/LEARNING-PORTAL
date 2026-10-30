import { useState, useEffect, useCallback } from 'react';
import { Enrollment, CourseProgress } from '../types';
import { getTraineeEnrollments } from '../services/enrollmentService';
import { getTraineeAllProgress } from '../services/progressService';
import {
  GraduationCap,
  Calendar,
  User,
  ArrowRight,
  BookOpen,
  Loader2,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  BarChart2,
  Play,
} from 'lucide-react';

interface MyCoursesProps {
  traineeId: string;
  onViewCourse: (courseId: string) => void;
  onOpenClassroom?: (courseId: string) => void;
  onExploreCatalogue: () => void;
  refreshTrigger?: number;
}

export function MyCourses({
  traineeId,
  onViewCourse,
  onOpenClassroom,
  onExploreCatalogue,
  refreshTrigger,
}: MyCoursesProps) {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, CourseProgress>>({});
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const fetchEnrollments = useCallback(async () => {
    if (!traineeId) return;
    setLoading(true);
    setError(null);
    try {
      const [enrollmentsData, progressData] = await Promise.all([
        getTraineeEnrollments(traineeId),
        getTraineeAllProgress(traineeId),
      ]);
      setEnrollments(enrollmentsData);
      setProgressMap(progressData);
    } catch (err) {
      console.error('Failed to load trainee enrollments and progress:', err);
      setError('Unable to load your enrolled courses from Cloud Firestore. Please check your network or try again.');
    } finally {
      setLoading(false);
    }
  }, [traineeId]);

  useEffect(() => {
    fetchEnrollments();
  }, [fetchEnrollments, refreshTrigger]);

  const formatEnrollmentDate = (dateVal: any) => {
    if (!dateVal) return 'Recently';
    try {
      if (typeof dateVal.toDate === 'function') {
        return dateVal.toDate().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      }
      if (dateVal instanceof Date) {
        return dateVal.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      }
      return new Date(dateVal).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className="mt-8 border-t border-slate-800 pt-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-950/70 border border-cyan-800/60 flex items-center justify-center text-cyan-400 shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>My Learning & Enrolled Courses</span>
              {!loading && enrollments.length > 0 && (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-cyan-950/90 text-cyan-400 border border-cyan-800/50">
                  {enrollments.length} {enrollments.length === 1 ? 'Course' : 'Courses'}
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400">
              Track curriculum progress across your enrolled technical disciplines
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchEnrollments}
          disabled={loading}
          aria-label="Refresh my enrolled courses"
          className="self-start sm:self-auto px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="p-8 rounded-2xl bg-slate-950/50 border border-slate-800 flex flex-col items-center justify-center text-center">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mb-3" />
          <p className="text-xs sm:text-sm font-medium text-slate-300">
            Retrieving your course enrollments from Cloud Firestore...
          </p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="p-5 rounded-2xl bg-rose-950/40 border border-rose-800/60 text-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm">
              <span className="font-semibold text-rose-300">Firestore Query Error: </span>
              {error}
            </div>
          </div>
          <button
            type="button"
            onClick={fetchEnrollments}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-rose-400 hover:bg-rose-300 rounded-lg transition-colors shrink-0 cursor-pointer"
          >
            Retry Query
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && enrollments.length === 0 && (
        <div className="p-8 rounded-2xl bg-slate-950/40 border border-slate-800/80 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-3">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-white mb-1">
            No courses enrolled yet
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto mb-4">
            You haven't enrolled in any courses yet. Explore our published curriculum modules in the catalogue below to start building your technical skills.
          </p>
          <button
            type="button"
            onClick={onExploreCatalogue}
            className="px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors shadow-md shadow-cyan-400/20 flex items-center gap-1.5 cursor-pointer"
          >
            <BookOpen className="w-4 h-4" />
            <span>Explore Course Catalogue</span>
          </button>
        </div>
      )}

      {/* Populated Enrolled Courses Grid */}
      {!loading && !error && enrollments.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {enrollments.map((item) => {
            const progress = progressMap[item.courseId];
            const percentage = progress?.progressPercentage || 0;
            const isCompleted = percentage === 100;

            return (
              <div
                key={item.id}
                className="group p-5 rounded-2xl bg-slate-950/80 hover:bg-slate-950 border border-slate-800 hover:border-cyan-800/60 transition-all flex flex-col justify-between shadow-lg"
              >
                <div>
                  {/* Header Badge */}
                  <div className="flex items-center justify-between text-xs mb-3">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-800/50 text-emerald-400 font-medium text-[11px]">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Enrolled</span>
                    </span>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      {formatEnrollmentDate(item.enrolledAt)}
                    </span>
                  </div>

                  {/* Course Title */}
                  <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-2 mb-2">
                    {item.courseTitle}
                  </h3>

                  {/* Instructor */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-3">
                    <User className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="truncate">{item.trainerName}</span>
                  </div>

                  {/* Progress Bar & Metric Strip */}
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-850 mb-4">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-slate-400 font-medium flex items-center gap-1">
                        <BarChart2 className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Curriculum Progress</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-semibold px-2 py-0.2 rounded-full border ${
                          isCompleted
                            ? 'bg-emerald-950/80 border-emerald-700/80 text-emerald-400'
                            : percentage > 0
                            ? 'bg-cyan-950/80 border-cyan-800/80 text-cyan-300'
                            : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}>
                          {isCompleted ? 'Completed' : percentage > 0 ? 'In Progress' : 'Not Started'}
                        </span>
                        <span className="font-extrabold text-white text-xs">{percentage}%</span>
                      </div>
                    </div>

                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800 mb-1.5">
                      <div
                        className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>

                    <div className="text-[10px] text-slate-500 text-right">
                      {progress?.completedResourceCount || 0} of {progress?.totalResourceCount || 0} modules completed
                    </div>
                  </div>
                </div>

                {/* Action Buttons: Continue Learning / Overview */}
                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-900">
                  <button
                    type="button"
                    onClick={() =>
                      onOpenClassroom ? onOpenClassroom(item.courseId) : onViewCourse(item.courseId)
                    }
                    className="py-2 px-2.5 rounded-xl text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-cyan-400/20 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Continue Learning</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onViewCourse(item.courseId)}
                    className="py-2 px-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>Overview</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

