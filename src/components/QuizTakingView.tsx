import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  HelpCircle,
  Clock,
  ArrowLeft,
  Loader2,
  Check,
  Send,
  Eye,
  Award,
  BarChart2,
} from 'lucide-react';
import {
  Assessment,
  QuizQuestion,
  QuestionAnswer,
  AssessmentAttempt,
  AssessmentResult,
} from '../types';
import {
  saveAttemptProgress,
  gradeAndSubmitAssessment,
  getTraineeResultForAssessment,
} from '../services/assessmentService';
import { createNotification } from '../services/notificationService';
import { sendEmailNotification } from '../services/emailService';
import { useAuth } from '../context/AuthContext';
import { checkAttemptCompleteness } from '../utils/attemptValidation';

interface QuizTakingViewProps {
  assessment: Assessment;
  attempt: AssessmentAttempt;
  traineeId: string;
  onExit: () => void;
  onSubmitted: () => void;
}

export function QuizTakingView({
  assessment,
  attempt,
  traineeId,
  onExit,
  onSubmitted,
}: QuizTakingViewProps) {
  const { currentUser } = useAuth();
  const questions = assessment.questions || [];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<QuestionAnswer[]>(attempt.answers || []);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAlreadySubmitted, setIsAlreadySubmitted] = useState(attempt.status === 'submitted');
  const [gradedResult, setGradedResult] = useState<AssessmentResult | null>(null);
  const [loadingResult, setLoadingResult] = useState(false);

  // If already submitted, fetch previous authoritative result
  useEffect(() => {
    if (isAlreadySubmitted && !gradedResult) {
      setLoadingResult(true);
      getTraineeResultForAssessment(traineeId, assessment.id)
        .then((res) => {
          if (res) setGradedResult(res);
        })
        .catch((err) => console.warn('Could not load previous result:', err))
        .finally(() => setLoadingResult(false));
    }
  }, [isAlreadySubmitted, traineeId, assessment.id]);

  const currentQuestion: QuizQuestion | undefined = questions[currentIndex];

  // Helper to get selected option for a question
  const getSelectedOption = (qId: string): number | undefined => {
    const found = answers.find((a) => a.questionId === qId);
    return found ? found.selectedOptionIndex : undefined;
  };

  // Select or change answer
  const handleSelectOption = async (optionIndex: number) => {
    if (isAlreadySubmitted || !currentQuestion) return;

    const updated = answers.filter((a) => a.questionId !== currentQuestion.id);
    const newAnswers = [
      ...updated,
      {
        questionId: currentQuestion.id,
        selectedOptionIndex: optionIndex,
        answeredAt: new Date(),
      },
    ];

    setAnswers(newAnswers);

    // Save progress to Firestore in background
    try {
      setSavingProgress(true);
      await saveAttemptProgress(traineeId, assessment.id, newAnswers);
    } catch (err) {
      console.warn('Progress save notice:', err);
    } finally {
      setSavingProgress(false);
    }
  };

  const progress = checkAttemptCompleteness(questions, answers);

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsReviewMode(true);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleJumpToQuestion = (index: number) => {
    setCurrentIndex(index);
    setIsReviewMode(false);
  };

  // Submit attempt with authoritative server-side grading
  const handleFinalSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const result = await gradeAndSubmitAssessment({
        traineeId,
        traineeName: attempt.traineeName,
        assessmentId: assessment.id,
        answers,
        questions,
      });
      setGradedResult(result);
      setIsAlreadySubmitted(true);
      setConfirmModalOpen(false);
      onSubmitted();

      // Trigger Trainee result notification
      try {
        await createNotification({
          id: `res_${result.id}`,
          recipientUid: traineeId,
          type: 'assessment_result',
          title: 'Quiz Result Available',
          message: `Your quiz for "${assessment.title}" has been graded: ${result.marksObtained}/${result.totalMarks} marks (${result.percentage}%, ${result.resultStatus.toUpperCase()}).`,
          relatedEntityId: assessment.id,
          relatedEntityType: 'assessment',
        });

        // Trigger Course Trainer notification if trainer exists
        if (assessment.trainerId && assessment.trainerId !== traineeId) {
          await createNotification({
            id: `sub_${result.id}`,
            recipientUid: assessment.trainerId,
            type: 'assessment_submitted',
            title: 'Trainee Quiz Submitted',
            message: `${attempt.traineeName || 'A trainee'} submitted "${assessment.title}" scoring ${result.percentage}%.`,
            relatedEntityId: assessment.id,
            relatedEntityType: 'assessment',
          });
        }

        // Trigger Trainee assessment result email
        const targetEmail = (attempt as any).traineeEmail || currentUser?.email;
        if (targetEmail) {
          sendEmailNotification({
            eventType: 'assessment_result',
            recipientEmail: targetEmail,
            recipientName: attempt.traineeName || currentUser?.displayName || targetEmail.split('@')[0],
            data: {
              assessmentId: assessment.id,
              assessmentTitle: assessment.title,
              courseTitle: assessment.courseTitle || 'Course Assessment',
              percentage: result.percentage,
              marksObtained: result.marksObtained,
              totalMarks: result.totalMarks,
              resultStatus: result.resultStatus,
              passingPercentage: result.passingPercentage,
            },
            idempotencyKey: `email_res_${result.id}`,
          }).catch((emailErr) => console.warn('Notice: Non-critical email dispatch notice:', emailErr));
        }
      } catch (notifErr) {
        console.warn('Notice: Non-critical alert generation warning:', notifErr);
      }
    } catch (err: any) {
      console.error('Submission or server grading failed:', err);
      setError(err?.message || 'Failed to submit quiz. Please try again.');
      setConfirmModalOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  // Render Already Submitted / Graded Result Screen
  if (isAlreadySubmitted) {
    const passed = gradedResult ? gradedResult.resultStatus === 'passed' : false;

    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center shadow-2xl animate-in zoom-in-95 duration-200">
          {loadingResult ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
              <p className="text-xs text-slate-400">Loading your verified result...</p>
            </div>
          ) : gradedResult ? (
            <>
              <div
                className={`w-16 h-16 rounded-2xl border flex items-center justify-center mx-auto mb-4 ${
                  passed
                    ? 'bg-emerald-950/80 border-emerald-700/80 text-emerald-400'
                    : 'bg-rose-950/80 border-rose-700/80 text-rose-400'
                }`}
              >
                {passed ? <CheckCircle2 className="w-9 h-9" /> : <XCircle className="w-9 h-9" />}
              </div>

              <div className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-2 bg-slate-950 border border-slate-800">
                <span className={passed ? 'text-emerald-400' : 'text-rose-400'}>
                  {passed ? 'Passed Assessment' : 'Needs Improvement'}
                </span>
              </div>

              <h2 className="text-2xl font-bold text-white mb-1">
                {passed ? 'Congratulations!' : 'Quiz Completed'}
              </h2>
              <p className="text-xs text-slate-400 mb-6 truncate">
                {assessment.title}
              </p>

              {/* Score Highlight Box */}
              <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-3 mb-6">
                <div className="flex items-center justify-between pb-3 border-b border-slate-850">
                  <span className="text-xs text-slate-400">Authoritative Score</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold text-white">
                      {gradedResult.percentage}%
                    </span>
                    <span className="text-xs text-slate-400">
                      (Pass: {gradedResult.passingPercentage}%)
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center pt-1">
                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800/80">
                    <span className="text-[10px] uppercase text-slate-400 font-semibold block">
                      Marks
                    </span>
                    <span className="text-sm font-bold text-cyan-400">
                      {gradedResult.marksObtained}/{gradedResult.totalMarks}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800/80">
                    <span className="text-[10px] uppercase text-emerald-400 font-semibold block">
                      Correct
                    </span>
                    <span className="text-sm font-bold text-emerald-300">
                      {gradedResult.correctAnswers}/{gradedResult.totalQuestions}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800/80">
                    <span className="text-[10px] uppercase text-rose-400 font-semibold block">
                      Incorrect
                    </span>
                    <span className="text-sm font-bold text-rose-300">
                      {gradedResult.incorrectAnswers}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onExit}
                className="w-full py-3 text-sm font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-xl transition-all shadow-md shadow-cyan-400/20"
              >
                Return to Dashboard
              </button>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-2xl bg-emerald-950 border border-emerald-800/80 text-emerald-400 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Quiz Submitted!</h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6">
                Your responses for{' '}
                <span className="text-cyan-400 font-semibold">{assessment.title}</span> have been safely recorded and graded in the backend.
              </p>

              <button
                type="button"
                onClick={onExit}
                className="w-full py-3 text-sm font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-xl transition-all shadow-md shadow-cyan-400/20"
              >
                Return to Dashboard
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      {/* Top Banner Navigation */}
      <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
        <button
          type="button"
          onClick={onExit}
          className="text-xs sm:text-sm font-medium text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Save & Exit</span>
        </button>

        <div className="text-center">
          <span className="text-[11px] font-semibold text-cyan-400 font-mono block">
            {assessment.courseTitle || 'Course Quiz'}
          </span>
          <h1 className="text-sm sm:text-base font-bold text-white truncate max-w-xs sm:max-w-md">
            {assessment.title}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {savingProgress && (
            <span className="text-[11px] text-slate-500 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Saving...</span>
            </span>
          )}
          <button
            type="button"
            onClick={() => setIsReviewMode(!isReviewMode)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
              isReviewMode
                ? 'bg-cyan-950/80 border-cyan-800 text-cyan-300'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            {isReviewMode ? 'Return to Question' : 'Review All'}
          </button>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-950/50 border border-rose-800 text-rose-200 text-xs sm:text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {/* Progress & Question Navigation Matrix */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 sm:p-5 mb-6">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span>
            Progress:{' '}
            <strong className="text-white">
              {progress.answeredCount} of {questions.length} answered
            </strong>{' '}
            ({progress.percentage}%)
          </span>
          <span>
            {questions.length - progress.answeredCount === 0
              ? 'All questions answered'
              : `${questions.length - progress.answeredCount} remaining`}
          </span>
        </div>

        {/* Sleek Progress Bar */}
        <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden mb-4 border border-slate-800">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-300"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>

        {/* Question Quick Jump Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {questions.map((q, idx) => {
            const isAnswered = getSelectedOption(q.id) !== undefined;
            const isCurrent = idx === currentIndex && !isReviewMode;

            let pillStyle = 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700';
            if (isCurrent) {
              pillStyle = 'bg-cyan-500 text-slate-950 font-bold border-cyan-400 ring-2 ring-cyan-400/30';
            } else if (isAnswered) {
              pillStyle = 'bg-emerald-950/80 text-emerald-300 border-emerald-800/70';
            }

            return (
              <button
                type="button"
                key={q.id || idx}
                onClick={() => handleJumpToQuestion(idx)}
                className={`w-7 h-7 rounded-lg text-xs font-semibold border flex items-center justify-center transition-all ${pillStyle}`}
                title={`Question ${idx + 1}: ${isAnswered ? 'Answered' : 'Unanswered'}`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content: Question View or Review Screen */}
      {!isReviewMode && currentQuestion ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          {/* Question Header */}
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-800/80">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-cyan-950 border border-cyan-800 text-cyan-400 text-xs font-bold flex items-center justify-center shrink-0">
                {currentIndex + 1}
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Question {currentIndex + 1} of {questions.length}
              </span>
            </div>

            <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-medium">
              {currentQuestion.points || 1}{' '}
              {currentQuestion.points === 1 ? 'mark' : 'marks'}
            </span>
          </div>

          {/* Question Text */}
          <div className="text-lg sm:text-xl font-medium text-white leading-relaxed">
            {currentQuestion.questionText}
          </div>

          {/* 4 Radio Options */}
          <fieldset className="space-y-3 pt-2">
            <legend className="sr-only">
              Options for question {currentIndex + 1}: {currentQuestion.questionText}
            </legend>
            <div role="radiogroup" aria-label={`Question ${currentIndex + 1} options`} className="space-y-3">
              {currentQuestion.options.map((option, optIdx) => {
                const letter = String.fromCharCode(65 + optIdx);
                const isSelected = getSelectedOption(currentQuestion.id) === optIdx;

                return (
                  <div
                    key={optIdx}
                    role="radio"
                    aria-checked={isSelected}
                    tabIndex={0}
                    onClick={() => handleSelectOption(optIdx)}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault();
                        handleSelectOption(optIdx);
                      }
                    }}
                    className={`w-full p-4 rounded-2xl border text-left flex items-start gap-4 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                      isSelected
                        ? 'bg-cyan-950/40 border-cyan-500/80 text-white shadow-md shadow-cyan-950/30 ring-1 ring-cyan-500/40'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-850 hover:border-slate-700'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 transition-colors ${
                        isSelected
                          ? 'border-cyan-400 bg-cyan-500 text-slate-950'
                          : 'border-slate-700 bg-slate-900 text-slate-400'
                      }`}
                    >
                      {isSelected ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : letter}
                    </div>

                    <span className="text-sm sm:text-base leading-relaxed flex-1 select-none">
                      {option}
                    </span>
                  </div>
                );
              })}
            </div>
          </fieldset>

          {/* Navigation Controls */}
          <div className="pt-6 border-t border-slate-800 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className="px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-xs sm:text-sm font-medium text-slate-300 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 text-xs sm:text-sm font-bold transition-all shadow-md shadow-cyan-400/20 flex items-center gap-1.5"
            >
              <span>{currentIndex === questions.length - 1 ? 'Review Quiz' : 'Next Question'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* Review Screen Before Final Submission */
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Review Quiz Responses</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Inspect your answers before submitting. Click any question to return and revise it.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  progress.isComplete
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : 'bg-amber-950 text-amber-300 border border-amber-800'
                }`}
              >
                {progress.isComplete
                  ? 'All Questions Answered'
                  : `${progress.unansweredIndices.length} Questions Unanswered`}
              </span>
            </div>
          </div>

          {/* Matrix of Questions */}
          <div className="space-y-3">
            {questions.map((q, idx) => {
              const selectedIdx = getSelectedOption(q.id);
              const isAnswered = selectedIdx !== undefined;

              return (
                <div
                  key={q.id || idx}
                  className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                    isAnswered
                      ? 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                      : 'bg-amber-950/20 border-amber-800/60'
                  }`}
                >
                  <div className="flex items-start gap-3 max-w-xl">
                    <span className="w-6 h-6 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-white line-clamp-1">{q.questionText}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {isAnswered ? (
                          <span className="text-emerald-400">
                            Selected Option {String.fromCharCode(65 + selectedIdx)}: {q.options[selectedIdx]}
                          </span>
                        ) : (
                          <span className="text-amber-400">Unanswered</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleJumpToQuestion(idx)}
                    className="px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors self-start sm:self-auto shrink-0"
                  >
                    {isAnswered ? 'Change Answer' : 'Answer Now'}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Review Actions */}
          <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => handleJumpToQuestion(0)}
              className="text-xs sm:text-sm font-medium text-slate-400 hover:text-white transition-colors"
            >
              Return to Question 1
            </button>

            <button
              type="button"
              onClick={() => setConfirmModalOpen(true)}
              disabled={!progress.isComplete}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 text-xs sm:text-sm font-bold transition-all shadow-md shadow-cyan-400/20 flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>Final Submit Assessment</span>
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 max-w-md w-full shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-800 text-cyan-400 flex items-center justify-center shrink-0">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Confirm Submission</h3>
                <p className="text-xs text-slate-400">You are about to finalize this quiz</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Are you sure you want to submit your responses for{' '}
              <strong className="text-white">"{assessment.title}"</strong>?
              All {questions.length} questions have been answered. Once submitted, your answers cannot be altered.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setConfirmModalOpen(false)}
                disabled={submitting}
                className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-400 hover:text-white transition-colors"
              >
                Review Again
              </button>

              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={submitting}
                className="px-5 py-2 text-xs sm:text-sm font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-xl transition-all shadow-md shadow-cyan-400/20 flex items-center gap-1.5"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <span>Yes, Submit Now</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
