import React, { useState, useEffect } from 'react';
import {
  Award,
  CheckCircle2,
  XCircle,
  Calendar,
  BookOpen,
  Eye,
  Loader2,
  Search,
  Filter,
  Check,
  Percent,
  X,
  FileText,
} from 'lucide-react';
import { AssessmentResult } from '../types';
import { getTraineeResults } from '../services/assessmentService';

interface TraineeResultsProps {
  traineeId: string;
}

export function TraineeResults({ traineeId }: TraineeResultsProps) {
  const [results, setResults] = useState<AssessmentResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'passed' | 'failed'>('all');
  const [selectedResult, setSelectedResult] = useState<AssessmentResult | null>(null);

  const fetchResults = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTraineeResults(traineeId);
      // Sort newest first
      data.sort((a, b) => {
        const timeA = a.submittedAt?.toMillis ? a.submittedAt.toMillis() : new Date(a.submittedAt || 0).getTime();
        const timeB = b.submittedAt?.toMillis ? b.submittedAt.toMillis() : new Date(b.submittedAt || 0).getTime();
        return timeB - timeA;
      });
      setResults(data);
    } catch (err: any) {
      console.error('Failed to load trainee results:', err);
      setError(err?.message || 'Could not load your quiz results.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (traineeId) {
      fetchResults();
    }
  }, [traineeId]);

  const filteredResults = results.filter((res) => {
    const matchesSearch =
      res.assessmentTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      res.courseTitle.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || res.resultStatus === statusFilter;
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
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Stats Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Award className="w-6 h-6 text-cyan-400" />
            <span>My Assessment Results</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Authoritative, tamper-proof grades computed securely on the backend.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchResults}
          disabled={loading}
          className="self-start sm:self-auto px-4 py-2 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80 transition-all flex items-center gap-1.5"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
          <span>Refresh Results</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by quiz or course title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          {(['all', 'passed', 'failed'] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold capitalize transition-all border ${
                statusFilter === status
                  ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div className="py-16 text-center">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-400">Loading your verified results...</p>
        </div>
      )}

      {error && !loading && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800/80 text-rose-300 text-xs sm:text-sm">
          {error}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredResults.length === 0 && (
        <div className="p-12 text-center rounded-3xl bg-slate-900/60 border border-dashed border-slate-800">
          <div className="w-14 h-14 rounded-2xl bg-slate-800/70 border border-slate-700/80 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <Award className="w-7 h-7" />
          </div>
          <h3 className="text-base font-semibold text-white mb-1">No Assessment Results Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {results.length === 0
              ? 'You have not submitted any quizzes yet. Complete a course quiz to view your official score here.'
              : 'No results match your active search filter.'}
          </p>
        </div>
      )}

      {/* Results Cards Grid */}
      {!loading && filteredResults.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredResults.map((res) => {
            const passed = res.resultStatus === 'passed';
            return (
              <div
                key={res.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all flex flex-col justify-between shadow-lg"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <span className="text-[11px] font-semibold text-cyan-400 font-mono truncate max-w-[200px]">
                      {res.courseTitle}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider ${
                        passed
                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/80'
                          : 'bg-rose-950/80 text-rose-400 border border-rose-800/80'
                      }`}
                    >
                      {passed ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5" />
                      )}
                      <span>{passed ? 'Passed' : 'Failed'}</span>
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white mb-3 line-clamp-1">
                    {res.assessmentTitle}
                  </h3>

                  {/* Score Summary Metrics */}
                  <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-950/80 border border-slate-850 mb-4 text-center">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                        Score
                      </span>
                      <span className="text-sm font-extrabold text-white">
                        {res.percentage}%
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                        Marks
                      </span>
                      <span className="text-sm font-bold text-cyan-400">
                        {res.marksObtained}/{res.totalMarks}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                        Pass Target
                      </span>
                      <span className="text-sm font-semibold text-slate-300">
                        {res.passingPercentage}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>{formatDate(res.submittedAt)}</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => setSelectedResult(res)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 font-medium flex items-center gap-1 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Details</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detailed Result Modal */}
      {selectedResult && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-xs font-semibold text-cyan-400 font-mono">
                  {selectedResult.courseTitle}
                </span>
                <h3 className="text-xl font-bold text-white mt-0.5">
                  {selectedResult.assessmentTitle}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedResult(null)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Pass / Fail Banner */}
            <div
              className={`p-4 rounded-2xl border flex items-center justify-between ${
                selectedResult.resultStatus === 'passed'
                  ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-300'
                  : 'bg-rose-950/60 border-rose-800/80 text-rose-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    selectedResult.resultStatus === 'passed'
                      ? 'bg-emerald-900/60 text-emerald-400'
                      : 'bg-rose-900/60 text-rose-400'
                  }`}
                >
                  {selectedResult.resultStatus === 'passed' ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : (
                    <XCircle className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-sm">
                    {selectedResult.resultStatus === 'passed'
                      ? 'Assessment Passed'
                      : 'Assessment Failed'}
                  </h4>
                  <p className="text-xs opacity-80">
                    Passing threshold is {selectedResult.passingPercentage}%
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black">
                  {selectedResult.percentage}%
                </span>
              </div>
            </div>

            {/* Breakdown List */}
            <div className="space-y-2.5 p-4 rounded-2xl bg-slate-950/90 border border-slate-800 text-xs sm:text-sm">
              <div className="flex justify-between py-1 border-b border-slate-850">
                <span className="text-slate-400">Total Questions:</span>
                <span className="font-semibold text-white">
                  {selectedResult.totalQuestions}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-850">
                <span className="text-emerald-400">Correct Answers:</span>
                <span className="font-semibold text-emerald-300">
                  {selectedResult.correctAnswers}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-850">
                <span className="text-rose-400">Incorrect Answers:</span>
                <span className="font-semibold text-rose-300">
                  {selectedResult.incorrectAnswers}
                </span>
              </div>
              {selectedResult.unansweredCount > 0 && (
                <div className="flex justify-between py-1 border-b border-slate-850">
                  <span className="text-amber-400">Unanswered Questions:</span>
                  <span className="font-semibold text-amber-300">
                    {selectedResult.unansweredCount}
                  </span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-slate-850">
                <span className="text-slate-400">Marks Obtained:</span>
                <span className="font-bold text-cyan-400">
                  {selectedResult.marksObtained} of {selectedResult.totalMarks} marks
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Grading Engine:</span>
                <span className="font-mono text-[11px] text-cyan-400">
                  Secure Server Cloud Verification
                </span>
              </div>
            </div>

            {/* Timestamps */}
            <div className="text-[11px] text-slate-500 space-y-1">
              <div>Submitted at: {formatDate(selectedResult.submittedAt)}</div>
              <div>Graded at: {formatDate(selectedResult.gradedAt)}</div>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setSelectedResult(null)}
              className="w-full py-2.5 text-xs sm:text-sm font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-xl transition-all shadow-md shadow-cyan-400/20"
            >
              Close Details
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
