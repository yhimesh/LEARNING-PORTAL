import React, { useState } from 'react';
import {
  X,
  Clock,
  Award,
  CheckCircle2,
  HelpCircle,
  Eye,
  EyeOff,
  BookOpen,
} from 'lucide-react';
import { Assessment, QuizQuestion } from '../types';

interface QuizPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  assessment: Partial<Assessment> | null;
}

export function QuizPreviewModal({
  isOpen,
  onClose,
  assessment,
}: QuizPreviewModalProps) {
  const [showAnswerKeys, setShowAnswerKeys] = useState(true);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});

  if (!isOpen || !assessment) return null;

  const questions: QuizQuestion[] = assessment.questions || [];
  const passingScore = Math.ceil(
    ((assessment.totalMarks || 0) * (assessment.passingPercentage || 70)) / 100
  );

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header Banner */}
        <div className="px-6 py-4 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-950/80 border border-cyan-800/60 text-cyan-400">
              Trainer Preview Mode
            </span>
            <span className="text-xs text-slate-400 hidden sm:inline">
              Simulating trainee view • Submissions are not recorded
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowAnswerKeys(!showAnswerKeys)}
              className="px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5"
            >
              {showAnswerKeys ? (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                  <span>Hide Answer Keys</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Highlight Correct Answers</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              aria-label="Close Preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto p-6 sm:p-8 space-y-8 flex-1">
          {/* Quiz Details Card */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-6 relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div>
                {assessment.courseTitle && (
                  <div className="flex items-center gap-1.5 text-xs text-cyan-400 font-medium mb-1.5">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>{assessment.courseTitle}</span>
                  </div>
                )}
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  {assessment.title || 'Untitled Assessment'}
                </h2>
                <p className="text-sm text-slate-300 mt-2 leading-relaxed max-w-2xl">
                  {assessment.description || 'No instructions provided.'}
                </p>
              </div>

              {/* Stats badges */}
              <div className="flex flex-wrap md:flex-col gap-2 shrink-0">
                <div className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-cyan-400" />
                  <span>{questions.length} Questions</span>
                </div>
                <div className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span>Total: {assessment.totalMarks || 0} Marks</span>
                </div>
                <div className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>
                    Passing: {assessment.passingPercentage || 70}% ({passingScore} pts)
                  </span>
                </div>
                {assessment.timeLimitMinutes && (
                  <div className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-400" />
                    <span>{assessment.timeLimitMinutes} Minutes</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Question List */}
          <div className="space-y-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Questions ({questions.length})
            </h3>

            {questions.length === 0 ? (
              <div className="p-8 text-center text-slate-400 bg-slate-950/40 rounded-2xl border border-slate-800">
                No questions added to this quiz yet.
              </div>
            ) : (
              questions.map((q, qIndex) => {
                const isSelected = (optIdx: number) => selectedAnswers[q.id] === optIdx;
                const isCorrect = (optIdx: number) => q.correctOptionIndex === optIdx;

                return (
                  <div
                    key={q.id || qIndex}
                    className="p-6 rounded-2xl bg-slate-950/40 border border-slate-800/80 space-y-4 hover:border-slate-700/80 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <span className="w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-800/60 text-cyan-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {qIndex + 1}
                        </span>
                        <p className="text-base font-medium text-white leading-relaxed">
                          {q.questionText || `Question ${qIndex + 1}`}
                        </p>
                      </div>

                      <span className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 text-xs font-medium whitespace-nowrap">
                        {q.points || 1} {q.points === 1 ? 'mark' : 'marks'}
                      </span>
                    </div>

                    {/* Multiple Choice Options */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      {q.options.map((option, optIdx) => {
                        const letter = String.fromCharCode(65 + optIdx);
                        const selected = isSelected(optIdx);
                        const correct = isCorrect(optIdx);

                        let cardStyle =
                          'bg-slate-900/70 border-slate-800 text-slate-300 hover:bg-slate-850 hover:border-slate-700';
                        let badgeStyle =
                          'bg-slate-800 text-slate-400 border-slate-700';

                        if (showAnswerKeys && correct) {
                          cardStyle =
                            'bg-emerald-950/30 border-emerald-800/80 text-emerald-200 ring-1 ring-emerald-500/30';
                          badgeStyle =
                            'bg-emerald-500 text-slate-950 font-bold border-emerald-400';
                        } else if (selected) {
                          cardStyle =
                            'bg-cyan-950/30 border-cyan-700 text-cyan-200';
                          badgeStyle =
                            'bg-cyan-500 text-slate-950 font-bold border-cyan-400';
                        }

                        return (
                          <button
                            type="button"
                            key={optIdx}
                            onClick={() => handleSelectOption(q.id, optIdx)}
                            className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${cardStyle}`}
                          >
                            <span
                              className={`w-6 h-6 rounded-md border flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5 transition-colors ${badgeStyle}`}
                            >
                              {letter}
                            </span>
                            <span className="text-sm leading-normal flex-1">
                              {option || `Option ${letter}`}
                            </span>
                            {showAnswerKeys && correct && (
                              <span className="text-xs font-medium text-emerald-400 shrink-0 self-center">
                                ✓ Correct
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Explanation if available */}
                    {showAnswerKeys && q.explanation && (
                      <div className="mt-3 p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400">
                        <span className="font-semibold text-slate-300">Rationale: </span>
                        {q.explanation}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Passing threshold: <span className="text-slate-200 font-semibold">{assessment.passingPercentage || 70}%</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-xl transition-colors shadow-md shadow-cyan-400/20"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}
