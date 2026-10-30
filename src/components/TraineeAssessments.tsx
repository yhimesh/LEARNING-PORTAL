import React, { useState, useEffect, useCallback } from 'react';
import {
  HelpCircle,
  Play,
  RotateCcw,
  CheckCircle2,
  Clock,
  Award,
  BookOpen,
  Loader2,
  AlertCircle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Assessment, AssessmentAttempt, Enrollment } from '../types';
import { getTraineeEnrollments } from '../services/enrollmentService';
import {
  getEnrolledCourseAssessments,
  getTraineeAttempts,
  startOrResumeAttempt,
} from '../services/assessmentService';

interface TraineeAssessmentsProps {
  traineeId: string;
  traineeName: string;
  onStartQuiz: (assessment: Assessment, attempt: AssessmentAttempt) => void;
  onExploreCourses?: () => void;
  refreshTrigger?: number;
}

export function TraineeAssessments({
  traineeId,
  traineeName,
  onStartQuiz,
  onExploreCourses,
  refreshTrigger,
}: TraineeAssessmentsProps) {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [attempts, setAttempts] = useState<Map<string, AssessmentAttempt>>(new Map());
  const [loading, setLoading] = useState(true);
  const [startingQuizId, setStartingQuizId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enrolledCount, setEnrolledCount] = useState(0);

  const loadTraineeQuizzes = useCallback(async () => {
    if (!traineeId) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch trainee enrollments to determine eligible courses
      const enrollments = await getTraineeEnrollments(traineeId);
      setEnrolledCount(enrollments.length);
      const enrolledCourseIds = enrollments.map((e) => e.courseId);

      if (enrolledCourseIds.length === 0) {
        setAssessments([]);
        setAttempts(new Map());
        setLoading(false);
        return;
      }

      // 2. Fetch published assessments for enrolled courses
      const availableAssessments = await getEnrolledCourseAssessments(enrolledCourseIds);
      setAssessments(availableAssessments);

      // 3. Fetch trainee attempts to determine completion status
      const attemptList = await getTraineeAttempts(traineeId);
      const attemptMap = new Map<string, AssessmentAttempt>();
      attemptList.forEach((att) => {
        attemptMap.set(att.assessmentId, att);
      });
      setAttempts(attemptMap);
    } catch (err: any) {
      console.error('Failed to load trainee assessments:', err);
      setError('Unable to load quizzes. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, [traineeId]);

  useEffect(() => {
    loadTraineeQuizzes();
  }, [loadTraineeQuizzes, refreshTrigger]);

  const handleLaunchQuiz = async (assessment: Assessment) => {
    setStartingQuizId(assessment.id);
    try {
      const attempt = await startOrResumeAttempt({
        traineeId,
        traineeName,
        assessmentId: assessment.id,
        courseId: assessment.courseId,
        assessmentTitle: assessment.title,
        courseTitle: assessment.courseTitle,
      });
      onStartQuiz(assessment, attempt);
    } catch (err: any) {
      console.error('Failed to start quiz attempt:', err);
      setError(err?.message || 'Failed to start quiz attempt. Please verify enrollment.');
    } finally {
      setStartingQuizId(null);
    }
  };

  return (
    <div className="mt-10 border-t border-slate-800 pt-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider font-mono">
              Trainee Assessments
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Quizzes & Checkpoints
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Test your understanding with milestone assessments for courses you are enrolled in.
          </p>
        </div>

        <button
          type="button"
          onClick={loadTraineeQuizzes}
          disabled={loading}
          className="text-xs font-medium text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors self-start sm:self-auto"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-200 text-xs sm:text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="p-12 text-center bg-slate-950/40 rounded-2xl border border-slate-800">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-400">Loading your eligible course assessments...</p>
        </div>
      )}

      {/* Empty State: Not enrolled in any course */}
      {!loading && !error && enrolledCount === 0 && (
        <div className="p-8 sm:p-10 text-center bg-slate-950/40 border border-dashed border-slate-800 rounded-2xl max-w-lg mx-auto">
          <BookOpen className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white mb-1">
            Enroll in a Course to Access Quizzes
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 mb-5 leading-relaxed">
            Assessments are published by faculty for registered trainees. Browse the course catalogue to enroll in a foundational track.
          </p>
          {onExploreCourses && (
            <button
              type="button"
              onClick={onExploreCourses}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-xl transition-colors inline-flex items-center gap-1.5"
            >
              <span>Explore Course Catalogue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Empty State: Enrolled but no published quizzes */}
      {!loading && !error && enrolledCount > 0 && assessments.length === 0 && (
        <div className="p-8 sm:p-10 text-center bg-slate-950/40 border border-dashed border-slate-800 rounded-2xl max-w-lg mx-auto">
          <HelpCircle className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white mb-1">
            No Published Quizzes Yet
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            Instructors for your enrolled courses have not published quizzes yet. Check back once milestone evaluations are announced.
          </p>
        </div>
      )}

      {/* Assessments Grid */}
      {!loading && !error && assessments.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {assessments.map((quiz) => {
            const attempt = attempts.get(quiz.id);
            const isSubmitted = attempt?.status === 'submitted';
            const isInProgress = attempt?.status === 'in_progress';
            const answeredCount = attempt?.answers?.length || 0;
            const questionCount = quiz.questionCount || quiz.questions?.length || 0;
            const isStarting = startingQuizId === quiz.id;

            return (
              <div
                key={quiz.id}
                className="p-5 sm:p-6 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-slate-700/80 transition-all flex flex-col justify-between group shadow-lg shadow-black/20"
              >
                <div>
                  {/* Top Lockup: Course & Status */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-cyan-400 font-mono truncate max-w-[200px]">
                      {quiz.courseTitle || 'Enrolled Course'}
                    </span>

                    {isSubmitted ? (
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800/60 text-emerald-300 flex items-center gap-1 shrink-0">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Submitted</span>
                      </span>
                    ) : isInProgress ? (
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-950/80 border border-amber-800/60 text-amber-300 flex items-center gap-1 shrink-0">
                        <Clock className="w-3 h-3" />
                        <span>In Progress ({answeredCount}/{questionCount})</span>
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-800/60 text-cyan-300 flex items-center gap-1 shrink-0">
                        <Sparkles className="w-3 h-3" />
                        <span>Ready to Take</span>
                      </span>
                    )}
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-2 mb-1.5">
                    {quiz.title}
                  </h3>
                  <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed mb-4">
                    {quiz.description || 'Complete this checkpoint to test your understanding.'}
                  </p>

                  {/* Metrics Pill Matrix */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 rounded-xl bg-slate-900/60 border border-slate-800/60 text-[11px] mb-4">
                    <div className="space-y-0.5">
                      <span className="text-slate-500 block">Questions</span>
                      <span className="text-white font-semibold flex items-center gap-1">
                        <HelpCircle className="w-3 h-3 text-cyan-400" />
                        {questionCount}
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-slate-500 block">Total Marks</span>
                      <span className="text-amber-400 font-semibold flex items-center gap-1">
                        <Award className="w-3 h-3 text-amber-400" />
                        {quiz.totalMarks || 0} pts
                      </span>
                    </div>

                    <div className="space-y-0.5 col-span-2 sm:col-span-1">
                      <span className="text-slate-500 block">Pass Criteria</span>
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        {quiz.passingPercentage}%
                      </span>
                    </div>

                    {quiz.timeLimitMinutes && (
                      <div className="space-y-0.5 col-span-2 pt-1 border-t border-slate-800/60 flex items-center gap-1 text-indigo-300">
                        <Clock className="w-3 h-3 text-indigo-400" />
                        <span>Time limit: {quiz.timeLimitMinutes} minutes</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Button */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">
                    By {quiz.trainerName || 'Instructor'}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleLaunchQuiz(quiz)}
                    disabled={isStarting}
                    className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all shadow-md flex items-center gap-1.5 ${
                      isSubmitted
                        ? 'bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-700'
                        : isInProgress
                        ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-amber-400/20'
                        : 'bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-cyan-400/20'
                    }`}
                  >
                    {isStarting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Starting...</span>
                      </>
                    ) : isSubmitted ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>View Submitted Attempt</span>
                      </>
                    ) : isInProgress ? (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Resume Quiz</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Start Quiz</span>
                      </>
                    )}
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
