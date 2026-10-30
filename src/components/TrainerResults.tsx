import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  CheckCircle2,
  XCircle,
  Calendar,
  Users,
  Search,
  Filter,
  BarChart3,
  Eye,
  Loader2,
  X,
  FileSpreadsheet,
  AlertCircle,
  ArrowUpDown,
} from 'lucide-react';
import { Course, AssessmentResult } from '../types';
import { getCourseResultsForTrainer } from '../services/assessmentService';

interface TrainerResultsProps {
  courses: Course[];
  trainerId: string;
}

export function TrainerResults({ courses, trainerId }: TrainerResultsProps) {
  const [selectedCourseId, setSelectedCourseId] = useState<string>(
    courses[0]?.id || ''
  );
  const [results, setResults] = useState<AssessmentResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'passed' | 'failed'>('all');
  const [selectedResult, setSelectedResult] = useState<AssessmentResult | null>(null);

  // Auto-select first course when courses load
  useEffect(() => {
    if (!selectedCourseId && courses.length > 0) {
      setSelectedCourseId(courses[0].id);
    }
  }, [courses, selectedCourseId]);

  // Load results whenever selected course changes
  const fetchResults = async () => {
    if (!selectedCourseId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getCourseResultsForTrainer(selectedCourseId, trainerId);
      // Sort newest first
      data.sort((a, b) => {
        const timeA = a.submittedAt?.toMillis ? a.submittedAt.toMillis() : new Date(a.submittedAt || 0).getTime();
        const timeB = b.submittedAt?.toMillis ? b.submittedAt.toMillis() : new Date(b.submittedAt || 0).getTime();
        return timeB - timeA;
      });
      setResults(data);
    } catch (err: any) {
      console.error('Failed to load course gradebook:', err);
      setError(err?.message || 'Could not load quiz submissions for this course.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCourseId) {
      fetchResults();
    }
  }, [selectedCourseId]);

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);

  // Aggregated Stats
  const totalSubmissions = results.length;
  const passCount = results.filter((r) => r.resultStatus === 'passed').length;
  const failCount = results.filter((r) => r.resultStatus === 'failed').length;
  const averagePercentage =
    totalSubmissions > 0
      ? Math.round(results.reduce((acc, r) => acc + r.percentage, 0) / totalSubmissions)
      : 0;
  const passRate = totalSubmissions > 0 ? Math.round((passCount / totalSubmissions) * 100) : 0;

  // Filtered List
  const filteredResults = results.filter((res) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (res.traineeName || '').toLowerCase().includes(q) ||
      (res.traineeEmail || '').toLowerCase().includes(q) ||
      res.assessmentTitle.toLowerCase().includes(q);
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

  if (courses.length === 0) {
    return (
      <div className="p-8 rounded-3xl bg-slate-900/60 border border-dashed border-slate-800 text-center">
        <GraduationCap className="w-10 h-10 text-slate-500 mx-auto mb-2" />
        <h3 className="text-base font-semibold text-white">No Courses Available</h3>
        <p className="text-xs text-slate-400 mt-1">
          Create and publish courses to start tracking trainee assessments and quiz scores.
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
            <GraduationCap className="w-6 h-6 text-cyan-400" />
            <span>Assessment Results & Gradebook</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Track trainee submissions, verified marks, and pass/fail metrics across your courses.
          </p>
        </div>

        {/* Course Dropdown */}
        <div className="flex items-center gap-2">
          <label htmlFor="course-select" className="text-xs text-slate-400 whitespace-nowrap">
            Select Course:
          </label>
          <select
            id="course-select"
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

      {/* Course Summary Analytics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Submissions</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white">{totalSubmissions}</div>
          <span className="text-[10px] text-slate-500">Total graded attempts</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Pass Rate</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">{passRate}%</div>
          <span className="text-[10px] text-slate-500">
            {passCount} passed / {failCount} failed
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Average Score</span>
            <BarChart3 className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-purple-300">{averagePercentage}%</div>
          <span className="text-[10px] text-slate-500">Across all quizzes</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Course Status</span>
            <FileSpreadsheet className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-base font-bold text-white truncate">
            {selectedCourse?.title || 'Selected Course'}
          </div>
          <span className="text-[10px] text-cyan-400 font-mono">
            Trainer Owned
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by trainee name, email, or quiz..."
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

          <button
            type="button"
            onClick={fetchResults}
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
          <p className="text-xs text-slate-400">Loading course gradebook submissions...</p>
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
          <GraduationCap className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white mb-1">No Submissions Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {results.length === 0
              ? 'No trainees have submitted quizzes for this course yet.'
              : 'No submissions match your active filter criteria.'}
          </p>
        </div>
      )}

      {/* Gradebook Table */}
      {!loading && filteredResults.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table aria-label="Trainee assessment gradebook and quiz submissions" className="w-full text-left text-xs sm:text-sm min-w-[680px]">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th scope="col" className="py-3.5 px-4">Trainee</th>
                  <th scope="col" className="py-3.5 px-4">Quiz Title</th>
                  <th scope="col" className="py-3.5 px-4 text-center">Score</th>
                  <th scope="col" className="py-3.5 px-4 text-center">Marks</th>
                  <th scope="col" className="py-3.5 px-4 text-center">Status</th>
                  <th scope="col" className="py-3.5 px-4">Date Submitted</th>
                  <th scope="col" className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-slate-300">
                {filteredResults.map((res) => {
                  const passed = res.resultStatus === 'passed';
                  return (
                    <tr
                      key={res.id}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Trainee Details */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">
                          {res.traineeName || 'Trainee Learner'}
                        </div>
                        {res.traineeEmail && (
                          <div className="text-[11px] text-slate-500 font-mono">
                            {res.traineeEmail}
                          </div>
                        )}
                      </td>

                      {/* Quiz Title */}
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-white line-clamp-1 max-w-[220px]">
                          {res.assessmentTitle}
                        </span>
                      </td>

                      {/* Percentage */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-bold text-white">{res.percentage}%</span>
                      </td>

                      {/* Marks Obtained */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-semibold text-cyan-400">
                          {res.marksObtained}/{res.totalMarks}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider ${
                            passed
                              ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/80'
                              : 'bg-rose-950/80 text-rose-400 border border-rose-800/80'
                          }`}
                        >
                          {passed ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <XCircle className="w-3 h-3" />
                          )}
                          <span>{passed ? 'Passed' : 'Failed'}</span>
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-slate-400 text-xs">
                        {formatDate(res.submittedAt)}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedResult(res)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-medium inline-flex items-center gap-1 transition-colors"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Modal */}
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
                <p className="text-xs text-slate-400 mt-1">
                  Submission from <span className="text-white font-medium">{selectedResult.traineeName}</span>
                </p>
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
              <div>
                <span className="text-xs uppercase font-bold tracking-wider block">
                  {selectedResult.resultStatus === 'passed' ? 'Passed' : 'Failed'}
                </span>
                <span className="text-xs opacity-80">
                  Required passing threshold: {selectedResult.passingPercentage}%
                </span>
              </div>
              <div className="text-2xl font-black">{selectedResult.percentage}%</div>
            </div>

            {/* Metrics Breakdown */}
            <div className="space-y-2 p-4 rounded-2xl bg-slate-950/90 border border-slate-800 text-xs sm:text-sm">
              <div className="flex justify-between py-1 border-b border-slate-850">
                <span className="text-slate-400">Trainee Email:</span>
                <span className="font-mono text-white text-xs">
                  {selectedResult.traineeEmail || 'Not recorded'}
                </span>
              </div>
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
              <div className="flex justify-between py-1 border-b border-slate-850">
                <span className="text-slate-400">Marks Obtained:</span>
                <span className="font-bold text-cyan-400">
                  {selectedResult.marksObtained} of {selectedResult.totalMarks} marks
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Grading Engine:</span>
                <span className="font-mono text-[11px] text-cyan-400">
                  Cloud Backend Evaluator
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
