import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Eye,
  HelpCircle,
  Award,
  BookOpen,
  Clock,
  Check,
} from 'lucide-react';
import { Course, Assessment, QuizQuestion, AssessmentStatus } from '../types';
import {
  validateAssessmentInput,
  createEmptyQuestion,
} from '../utils/assessmentValidation';
import { QuizPreviewModal } from './QuizPreviewModal';

interface QuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: {
    title: string;
    description: string;
    courseId: string;
    courseTitle: string;
    passingPercentage: number;
    status: AssessmentStatus;
    questions: QuizQuestion[];
    timeLimitMinutes?: number;
  }) => Promise<void>;
  trainerCourses: Course[];
  initialAssessment?: Assessment | null;
  defaultCourseId?: string;
}

export function QuizModal({
  isOpen,
  onClose,
  onSave,
  trainerCourses,
  initialAssessment,
  defaultCourseId,
}: QuizModalProps) {
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [courseId, setCourseId] = useState('');
  const [passingPercentage, setPassingPercentage] = useState(70);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number | ''>('');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [status, setStatus] = useState<AssessmentStatus>('draft');

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [previewOpen, setPreviewOpen] = useState(false);

  // Initialize or reset form when modal opens
  useEffect(() => {
    if (!isOpen) return;

    if (initialAssessment) {
      setTitle(initialAssessment.title || '');
      setDescription(initialAssessment.description || '');
      setCourseId(initialAssessment.courseId || '');
      setPassingPercentage(initialAssessment.passingPercentage || 70);
      setTimeLimitMinutes(initialAssessment.timeLimitMinutes || '');
      setStatus(initialAssessment.status || 'draft');
      setQuestions(
        initialAssessment.questions && initialAssessment.questions.length > 0
          ? JSON.parse(JSON.stringify(initialAssessment.questions))
          : [createEmptyQuestion(0)]
      );
    } else {
      setTitle('');
      setDescription('');
      setCourseId(defaultCourseId || trainerCourses[0]?.id || '');
      setPassingPercentage(70);
      setTimeLimitMinutes('');
      setStatus('draft');
      setQuestions([createEmptyQuestion(0)]);
    }
    setErrors({});
  }, [isOpen, initialAssessment, defaultCourseId, trainerCourses]);

  if (!isOpen) return null;

  // Selected course details
  const selectedCourse = trainerCourses.find((c) => c.id === courseId);

  // Dynamic calculations
  const totalMarks = questions.reduce((sum, q) => sum + (Number(q.points) || 1), 0);
  const passingScore = Math.ceil((totalMarks * Number(passingPercentage)) / 100);

  // Question manipulation helpers
  const handleAddQuestion = () => {
    if (questions.length >= 50) return;
    setQuestions((prev) => [...prev, createEmptyQuestion(prev.length)]);
    setErrors((prev) => {
      const copy = { ...prev };
      delete copy.questions;
      return copy;
    });
  };

  const handleRemoveQuestion = (index: number) => {
    if (questions.length <= 1) return;
    setQuestions((prev) => prev.filter((_, i) => i !== index));
    setErrors((prev) => {
      const copy = { ...prev };
      delete copy[`question_${index}`];
      delete copy.questions;
      return copy;
    });
  };

  const handleQuestionTextChange = (index: number, text: string) => {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], questionText: text };
      return copy;
    });
    if (errors[`question_${index}`]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[`question_${index}`];
        return copy;
      });
    }
  };

  const handleOptionChange = (qIndex: number, optIndex: number, text: string) => {
    setQuestions((prev) => {
      const copy = [...prev];
      const newOptions = [...copy[qIndex].options] as [string, string, string, string];
      newOptions[optIndex] = text;
      copy[qIndex] = { ...copy[qIndex], options: newOptions };
      return copy;
    });
    if (errors[`question_${qIndex}`]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[`question_${qIndex}`];
        return copy;
      });
    }
  };

  const handleCorrectOptionChange = (qIndex: number, optIndex: number) => {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[qIndex] = { ...copy[qIndex], correctOptionIndex: optIndex };
      return copy;
    });
  };

  const handlePointsChange = (qIndex: number, val: number) => {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[qIndex] = { ...copy[qIndex], points: Math.max(1, Math.min(100, val || 1)) };
      return copy;
    });
  };

  const handleExplanationChange = (qIndex: number, text: string) => {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[qIndex] = { ...copy[qIndex], explanation: text };
      return copy;
    });
  };

  const handleSubmit = async (targetStatus: AssessmentStatus) => {
    const payload = {
      title,
      description,
      courseId,
      courseTitle: selectedCourse?.title || '',
      passingPercentage: Number(passingPercentage),
      status: targetStatus,
      questions,
      timeLimitMinutes: timeLimitMinutes ? Number(timeLimitMinutes) : undefined,
    };

    const allowedCourseIds = trainerCourses.map((c) => c.id);
    const validation = validateAssessmentInput(payload, undefined, allowedCourseIds);

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setSubmitting(true);
    try {
      await onSave(payload);
      onClose();
    } catch (err: any) {
      console.error('Failed to save assessment:', err);
      setErrors({ form: err.message || 'Failed to save quiz. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
          {/* Top Lockup */}
          <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-800/60 flex items-center justify-center text-cyan-400">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  {initialAssessment ? 'Edit Assessment' : 'Create Course Assessment'}
                </h2>
                <p className="text-xs text-slate-400">
                  Multiple-choice quiz with automatic scoring and protected answer keys
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Body */}
          <div className="overflow-y-auto p-6 sm:p-8 space-y-6 flex-1">
            {errors.form && (
              <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/80 text-rose-200 text-xs sm:text-sm flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <p>{errors.form}</p>
              </div>
            )}

            {/* Basic Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Target Course */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Associated Course <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <select
                    value={courseId}
                    onChange={(e) => {
                      setCourseId(e.target.value);
                      if (errors.courseId) {
                        setErrors((prev) => {
                          const copy = { ...prev };
                          delete copy.courseId;
                          return copy;
                        });
                      }
                    }}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  >
                    <option value="" disabled>
                      Select one of your courses
                    </option>
                    {trainerCourses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title} ({c.level} • {c.category})
                      </option>
                    ))}
                  </select>
                </div>
                {errors.courseId && (
                  <p className="text-xs text-rose-400 mt-1">{errors.courseId}</p>
                )}
              </div>

              {/* Quiz Title */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Quiz Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (errors.title) {
                      setErrors((prev) => {
                        const copy = { ...prev };
                        delete copy.title;
                        return copy;
                      });
                    }
                  }}
                  placeholder="e.g. Module 1: Object-Oriented Fundamentals Checkpoint"
                  maxLength={120}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 placeholder:text-slate-600"
                />
                <div className="flex justify-between items-center text-[11px] text-slate-500 mt-1">
                  {errors.title ? (
                    <span className="text-rose-400">{errors.title}</span>
                  ) : (
                    <span>Clear title describing the assessment milestone</span>
                  )}
                  <span>{title.length}/120</span>
                </div>
              </div>

              {/* Overview / Description */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Instructions / Description <span className="text-rose-400">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    if (errors.description) {
                      setErrors((prev) => {
                        const copy = { ...prev };
                        delete copy.description;
                        return copy;
                      });
                    }
                  }}
                  rows={2}
                  maxLength={1000}
                  placeholder="Provide instructions, topics covered, and guidelines for students taking this assessment..."
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 placeholder:text-slate-600 resize-none"
                />
                <div className="flex justify-between items-center text-[11px] text-slate-500 mt-0.5">
                  {errors.description ? (
                    <span className="text-rose-400">{errors.description}</span>
                  ) : (
                    <span>Min 5 characters</span>
                  )}
                  <span>{description.length}/1000</span>
                </div>
              </div>

              {/* Passing Percentage */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Passing Percentage (%): <span className="text-cyan-400 font-mono">{passingPercentage}%</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={passingPercentage}
                    onChange={(e) => setPassingPercentage(Number(e.target.value))}
                    className="flex-1 accent-cyan-400 cursor-pointer"
                  />
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={passingPercentage}
                    onChange={(e) => setPassingPercentage(Number(e.target.value))}
                    className="w-16 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-center text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  />
                </div>
                {errors.passingPercentage && (
                  <p className="text-xs text-rose-400 mt-1">{errors.passingPercentage}</p>
                )}
              </div>

              {/* Optional Time Limit */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Time Limit (Optional)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="300"
                    value={timeLimitMinutes}
                    onChange={(e) =>
                      setTimeLimitMinutes(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    placeholder="No time limit (e.g. 20 min)"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 placeholder:text-slate-600"
                  />
                  <Clock className="w-4 h-4 text-slate-500 absolute right-3.5 top-3" />
                </div>
                {errors.timeLimitMinutes && (
                  <p className="text-xs text-rose-400 mt-1">{errors.timeLimitMinutes}</p>
                )}
              </div>
            </div>

            {/* Metrics Live Summary Bar */}
            <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-800/40 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-xs">
                <div>
                  <span className="text-slate-400">Questions:</span>{' '}
                  <span className="text-white font-semibold">{questions.length}</span>
                </div>
                <div>
                  <span className="text-slate-400">Total Marks:</span>{' '}
                  <span className="text-amber-400 font-semibold">{totalMarks} pts</span>
                </div>
                <div>
                  <span className="text-slate-400">Required to Pass:</span>{' '}
                  <span className="text-emerald-400 font-semibold">
                    {passingScore} pts ({passingPercentage}%)
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPreviewOpen(true)}
                className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 border border-slate-700/80 rounded-xl transition-colors flex items-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5 text-cyan-400" />
                <span>Preview Trainee Experience</span>
              </button>
            </div>

            {/* Questions Header */}
            <div className="border-t border-slate-800 pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Multiple-Choice Questions</span>
                    <span className="text-xs font-normal text-slate-400">
                      (4 options • exactly 1 correct answer)
                    </span>
                  </h3>
                  {errors.questions && (
                    <p className="text-xs text-rose-400 mt-0.5">{errors.questions}</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleAddQuestion}
                  disabled={questions.length >= 50}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm shadow-cyan-400/20"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Question</span>
                </button>
              </div>

              {/* Questions List */}
              <div className="space-y-6">
                {questions.map((q, qIndex) => {
                  const qError = errors[`question_${qIndex}`];

                  return (
                    <div
                      key={q.id || qIndex}
                      className={`p-5 sm:p-6 rounded-2xl bg-slate-950/60 border transition-all ${
                        qError
                          ? 'border-rose-700/80 ring-1 ring-rose-500/30'
                          : 'border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {/* Question Top Row: Label, Points, Remove */}
                      <div className="flex items-center justify-between gap-4 mb-3 pb-3 border-b border-slate-800/60">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-cyan-950 border border-cyan-800/60 text-cyan-400 text-xs font-bold flex items-center justify-center shrink-0">
                            {qIndex + 1}
                          </span>
                          <span className="text-xs font-semibold text-slate-300">
                            Question {qIndex + 1} of {questions.length}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5 text-xs text-slate-400">
                            <span>Mark value:</span>
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={q.points || 1}
                              onChange={(e) => handlePointsChange(qIndex, Number(e.target.value))}
                              className="w-14 px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-center text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
                            />
                            <span>pts</span>
                          </div>

                          {questions.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveQuestion(qIndex)}
                              className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                              title="Delete Question"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Question Text */}
                      <div className="mb-4">
                        <textarea
                          value={q.questionText}
                          onChange={(e) => handleQuestionTextChange(qIndex, e.target.value)}
                          placeholder="Type the question text here..."
                          rows={2}
                          maxLength={500}
                          className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 placeholder:text-slate-600 resize-none"
                        />
                      </div>

                      {/* 4 Options Grid */}
                      <div className="space-y-2.5">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                          <span>Answer Options</span>
                          <span className="text-cyan-400">Select correct radio</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {q.options.map((option, optIdx) => {
                            const letter = String.fromCharCode(65 + optIdx);
                            const isCorrect = q.correctOptionIndex === optIdx;

                            return (
                              <div
                                key={optIdx}
                                className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                                  isCorrect
                                    ? 'bg-emerald-950/30 border-emerald-700/80 ring-1 ring-emerald-500/20'
                                    : 'bg-slate-900/80 border-slate-800 focus-within:border-slate-700'
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => handleCorrectOptionChange(qIndex, optIdx)}
                                  className={`w-7 h-7 rounded-lg border text-xs font-bold flex items-center justify-center shrink-0 transition-colors ${
                                    isCorrect
                                      ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-sm shadow-emerald-500/30'
                                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white'
                                  }`}
                                  title={`Click to mark Option ${letter} as correct`}
                                >
                                  {isCorrect ? <Check className="w-4 h-4 stroke-[3]" /> : letter}
                                </button>

                                <input
                                  type="text"
                                  value={option}
                                  onChange={(e) =>
                                    handleOptionChange(qIndex, optIdx, e.target.value)
                                  }
                                  placeholder={`Option ${letter}...`}
                                  maxLength={200}
                                  className="w-full bg-transparent text-sm text-slate-100 focus:outline-none placeholder:text-slate-600"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Optional Explanation */}
                      <div className="mt-3 pt-3 border-t border-slate-800/40">
                        <input
                          type="text"
                          value={q.explanation || ''}
                          onChange={(e) => handleExplanationChange(qIndex, e.target.value)}
                          placeholder="Optional: Explanation or learning hint shown after quiz completion"
                          maxLength={300}
                          className="w-full px-3 py-1.5 bg-slate-900/60 border border-slate-800 rounded-lg text-xs text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                        />
                      </div>

                      {qError && <p className="text-xs text-rose-400 mt-2">{qError}</p>}
                    </div>
                  );
                })}
              </div>

              {/* Add Question Bottom Button */}
              {questions.length < 50 && (
                <div className="mt-4 pt-2">
                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    className="w-full py-3 border border-dashed border-slate-800 hover:border-cyan-500/60 rounded-2xl text-xs font-medium text-slate-400 hover:text-cyan-300 transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Another Question ({questions.length}/50)</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 bg-slate-950/80 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPreviewOpen(true)}
                className="px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 border border-slate-700/80 rounded-xl transition-colors flex items-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5 text-cyan-400" />
                <span>Preview</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleSubmit('draft')}
                disabled={submitting}
                className="px-4 py-2.5 text-xs font-medium text-amber-300 bg-amber-950/50 hover:bg-amber-900/60 border border-amber-800/60 rounded-xl transition-colors flex items-center gap-1.5"
              >
                {submitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <span>Save as Draft</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleSubmit('published')}
                disabled={submitting}
                className="px-5 py-2.5 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 rounded-xl transition-all shadow-md shadow-cyan-400/20 flex items-center gap-1.5"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Publish Assessment</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Embedded Live Preview Modal */}
      <QuizPreviewModal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        assessment={{
          title: title || 'Untitled Assessment',
          description,
          courseTitle: selectedCourse?.title,
          passingPercentage: Number(passingPercentage),
          totalMarks,
          timeLimitMinutes: timeLimitMinutes ? Number(timeLimitMinutes) : undefined,
          questions,
        }}
      />
    </>
  );
}
