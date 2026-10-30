import React, { useState, useEffect, useCallback } from 'react';
import {
  HelpCircle,
  Plus,
  Trash2,
  Edit3,
  Loader2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  BookOpen,
  Award,
  Clock,
  Eye,
  Archive,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import { Course, Assessment, AssessmentStatus, QuizQuestion } from '../types';
import {
  getTrainerCourseAssessments,
  createAssessment,
  updateAssessment,
  updateAssessmentStatus,
  deleteAssessment,
} from '../services/assessmentService';
import { QuizModal } from './QuizModal';
import { QuizPreviewModal } from './QuizPreviewModal';
import { DeleteAssessmentModal } from './DeleteAssessmentModal';

interface TrainerAssessmentsProps {
  trainerId: string;
  trainerName: string;
  trainerCourses: Course[];
  onOpenCreateCourse?: () => void;
}

export function TrainerAssessments({
  trainerId,
  trainerName,
  trainerCourses,
  onOpenCreateCourse,
}: TrainerAssessmentsProps) {
  const [selectedCourseId, setSelectedCourseId] = useState<string>(
    trainerCourses[0]?.id || ''
  );
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'archived'>('all');
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(
    null
  );

  // Modal states
  const [quizModalOpen, setQuizModalOpen] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState<Assessment | null>(null);
  const [previewAssessment, setPreviewAssessment] = useState<Assessment | null>(null);
  const [assessmentToDelete, setAssessmentToDelete] = useState<Assessment | null>(null);

  // Sync selectedCourseId when trainerCourses updates
  useEffect(() => {
    if (
      trainerCourses.length > 0 &&
      (!selectedCourseId || !trainerCourses.some((c) => c.id === selectedCourseId))
    ) {
      setSelectedCourseId(trainerCourses[0].id);
    }
  }, [trainerCourses, selectedCourseId]);

  // Load assessments for the currently selected course
  const loadAssessments = useCallback(async () => {
    if (!selectedCourseId || !trainerId) {
      setAssessments([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await getTrainerCourseAssessments(trainerId, selectedCourseId);
      setAssessments(data);
    } catch (err: any) {
      console.error('Failed to load assessments:', err);
      setError('Unable to load assessments from Cloud Firestore. Please check your network connection.');
    } finally {
      setLoading(false);
    }
  }, [trainerId, selectedCourseId]);

  useEffect(() => {
    loadAssessments();
  }, [loadAssessments]);

  // Auto-dismiss feedback message after 4 seconds
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const selectedCourse = trainerCourses.find((c) => c.id === selectedCourseId);
  const ownedCourseIds = trainerCourses.map((c) => c.id);

  // Create or Update handler
  const handleSaveAssessment = async (payload: {
    title: string;
    description: string;
    courseId: string;
    courseTitle: string;
    passingPercentage: number;
    status: AssessmentStatus;
    questions: QuizQuestion[];
    timeLimitMinutes?: number;
  }) => {
    if (editingAssessment) {
      await updateAssessment(
        editingAssessment.id,
        payload,
        trainerId,
        ownedCourseIds
      );
      setFeedback({
        message: `Assessment "${payload.title}" updated successfully!`,
        type: 'success',
      });
    } else {
      await createAssessment(
        payload,
        trainerId,
        trainerName,
        ownedCourseIds
      );
      setFeedback({
        message: `Assessment "${payload.title}" created successfully!`,
        type: 'success',
      });
    }
    await loadAssessments();
  };

  // Toggle Publish / Draft
  const handleTogglePublish = async (assessment: Assessment) => {
    const nextStatus: AssessmentStatus =
      assessment.status === 'published' ? 'draft' : 'published';
    try {
      await updateAssessmentStatus(assessment.id, nextStatus);
      setFeedback({
        message:
          nextStatus === 'published'
            ? `Assessment "${assessment.title}" is now published and accessible to enrolled trainees.`
            : `Assessment "${assessment.title}" moved to draft status.`,
        type: 'success',
      });
      await loadAssessments();
    } catch (err: any) {
      console.error('Failed to update status:', err);
      setFeedback({
        message: err?.message || 'Failed to update assessment status.',
        type: 'error',
      });
    }
  };

  // Toggle Archive
  const handleToggleArchive = async (assessment: Assessment) => {
    const nextStatus: AssessmentStatus =
      assessment.status === 'archived' ? 'draft' : 'archived';
    try {
      await updateAssessmentStatus(assessment.id, nextStatus);
      setFeedback({
        message:
          nextStatus === 'archived'
            ? `Assessment "${assessment.title}" has been archived.`
            : `Assessment "${assessment.title}" restored to draft.`,
        type: 'success',
      });
      await loadAssessments();
    } catch (err: any) {
      console.error('Failed to archive assessment:', err);
      setFeedback({
        message: err?.message || 'Failed to archive assessment.',
        type: 'error',
      });
    }
  };

  // Delete handler
  const handleConfirmDelete = async (assessment: Assessment) => {
    await deleteAssessment(assessment.id);
    setFeedback({
      message: `Assessment "${assessment.title}" was permanently deleted.`,
      type: 'success',
    });
    await loadAssessments();
  };

  // Filtered list
  const filteredAssessments = assessments.filter((a) => {
    if (statusFilter === 'all') return true;
    return a.status === statusFilter;
  });

  return (
    <div className="mt-10 border-t border-slate-800 pt-8">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider font-mono">
              Assessment Studio
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Assessments & Course Quizzes
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Create milestone quizzes, configure pass criteria, and author multiple-choice checks with protected answer keys.
          </p>
        </div>

        {trainerCourses.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setEditingAssessment(null);
              setQuizModalOpen(true);
            }}
            className="px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 rounded-xl transition-all shadow-md shadow-cyan-400/20 flex items-center gap-2 shrink-0 self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Quiz</span>
          </button>
        )}
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          role="status"
          className={`mb-6 p-4 rounded-2xl border text-xs sm:text-sm flex items-start gap-3 animate-in fade-in duration-200 ${
            feedback.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
              : 'bg-rose-950/60 border-rose-800 text-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          )}
          <span className="font-medium">{feedback.message}</span>
        </div>
      )}

      {/* No Courses Available Warning */}
      {trainerCourses.length === 0 ? (
        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-8 sm:p-10 text-center max-w-xl mx-auto">
          <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white mb-1">
            No Trainer Courses Found
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 mb-5 leading-relaxed">
            You must have at least one course authored under your trainer profile to create quizzes and learning assessments.
          </p>
          {onOpenCreateCourse && (
            <button
              type="button"
              onClick={onOpenCreateCourse}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-xl transition-colors inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Create Your First Course</span>
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Course Selector & Filters Bar */}
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 sm:p-5 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1 max-w-md">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Select Course to Manage Quizzes
              </label>
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                {trainerCourses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} ({c.level} • {c.category})
                  </option>
                ))}
              </select>
            </div>

            {/* Status Tabs & Refresh */}
            <div className="flex flex-wrap items-center gap-2 self-start md:self-end">
              <div className="bg-slate-900 p-1 rounded-xl border border-slate-800 flex items-center text-xs">
                {(['all', 'published', 'draft', 'archived'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setStatusFilter(tab)}
                    className={`px-3 py-1 rounded-lg font-medium capitalize transition-colors ${
                      statusFilter === tab
                        ? 'bg-cyan-400 text-slate-950 font-semibold shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={loadAssessments}
                disabled={loading}
                title="Refresh Assessments"
                className="p-2 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-950/40 border border-rose-800/80 text-rose-200 text-xs sm:text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p>{error}</p>
                <button
                  type="button"
                  onClick={loadAssessments}
                  className="mt-2 text-xs font-semibold text-cyan-400 hover:underline"
                >
                  Retry loading assessments
                </button>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="p-12 text-center bg-slate-950/40 rounded-2xl border border-slate-800">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-400">Loading assessments from Cloud Firestore...</p>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && filteredAssessments.length === 0 && (
            <div className="bg-slate-950/40 border border-dashed border-slate-800 rounded-2xl p-8 sm:p-12 text-center">
              <HelpCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-white mb-1">
                No Assessments for "{selectedCourse?.title || 'Selected Course'}"
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto mb-5 leading-relaxed">
                {statusFilter !== 'all'
                  ? `No quizzes currently match the "${statusFilter}" filter.`
                  : 'You have not created any quizzes for this course yet. Build an assessment to verify trainee understanding.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  setEditingAssessment(null);
                  setQuizModalOpen(true);
                }}
                className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-xl transition-colors inline-flex items-center gap-1.5 shadow-sm shadow-cyan-400/20"
              >
                <Plus className="w-4 h-4" />
                <span>Create Assessment Now</span>
              </button>
            </div>
          )}

          {/* Assessments Grid */}
          {!loading && !error && filteredAssessments.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredAssessments.map((quiz) => {
                const questionCount = quiz.questionCount || quiz.questions?.length || 0;
                const passingScore = Math.ceil(((quiz.totalMarks || 0) * (quiz.passingPercentage || 70)) / 100);

                return (
                  <div
                    key={quiz.id}
                    className="p-5 sm:p-6 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-slate-700/80 transition-all flex flex-col justify-between group shadow-lg shadow-black/20"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-cyan-400 font-mono line-clamp-1">
                          {quiz.courseTitle || selectedCourse?.title || 'Course'}
                        </span>

                        {quiz.status === 'published' ? (
                          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800/60 text-emerald-300 flex items-center gap-1 shrink-0">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Published</span>
                          </span>
                        ) : quiz.status === 'draft' ? (
                          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-950/80 border border-amber-800/60 text-amber-300 flex items-center gap-1 shrink-0">
                            <Clock className="w-3 h-3" />
                            <span>Draft</span>
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-400 flex items-center gap-1 shrink-0">
                            <Archive className="w-3 h-3" />
                            <span>Archived</span>
                          </span>
                        )}
                      </div>

                      {/* Title & Description */}
                      <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-2 mb-1.5">
                        {quiz.title}
                      </h3>
                      <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed mb-4">
                        {quiz.description || 'No description provided.'}
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
                          <span className="text-slate-500 block">Passing Mark</span>
                          <span className="text-emerald-400 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            {quiz.passingPercentage}% ({passingScore} pts)
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

                    {/* Action Bar */}
                    <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setPreviewAssessment(quiz)}
                        className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Preview</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingAssessment(quiz);
                            setQuizModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-900 rounded-lg transition-colors"
                          title="Edit Assessment"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleTogglePublish(quiz)}
                          className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                            quiz.status === 'published'
                              ? 'bg-amber-950/60 text-amber-300 hover:bg-amber-900/60 border border-amber-800/50'
                              : 'bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/60 border border-emerald-800/50'
                          }`}
                          title={quiz.status === 'published' ? 'Unpublish quiz' : 'Publish quiz to trainees'}
                        >
                          {quiz.status === 'published' ? 'Unpublish' : 'Publish'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleArchive(quiz)}
                          className="p-1.5 text-slate-400 hover:text-amber-300 hover:bg-slate-900 rounded-lg transition-colors"
                          title={quiz.status === 'archived' ? 'Restore to Draft' : 'Archive Assessment'}
                        >
                          <Archive className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setAssessmentToDelete(quiz)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition-colors"
                          title="Delete Assessment"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Quiz Create / Edit Modal */}
      <QuizModal
        isOpen={quizModalOpen}
        onClose={() => {
          setQuizModalOpen(false);
          setEditingAssessment(null);
        }}
        onSave={handleSaveAssessment}
        trainerCourses={trainerCourses}
        initialAssessment={editingAssessment}
        defaultCourseId={selectedCourseId}
      />

      {/* Quiz Preview Modal */}
      <QuizPreviewModal
        isOpen={Boolean(previewAssessment)}
        onClose={() => setPreviewAssessment(null)}
        assessment={previewAssessment}
      />

      {/* Delete Confirmation Modal */}
      <DeleteAssessmentModal
        isOpen={Boolean(assessmentToDelete)}
        assessment={assessmentToDelete}
        onClose={() => setAssessmentToDelete(null)}
        onConfirmDelete={handleConfirmDelete}
      />
    </div>
  );
}
