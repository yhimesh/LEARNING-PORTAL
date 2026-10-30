import { useState } from 'react';
import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react';
import { Assessment } from '../types';

interface DeleteAssessmentModalProps {
  assessment: Assessment | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelete: (assessment: Assessment) => Promise<void>;
}

export function DeleteAssessmentModal({
  assessment,
  isOpen,
  onClose,
  onConfirmDelete,
}: DeleteAssessmentModalProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !assessment) return null;

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      await onConfirmDelete(assessment);
      onClose();
    } catch (err: any) {
      console.error('Failed to delete assessment:', err);
      setError(err?.message || 'Failed to delete assessment. Please verify your permissions.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-quiz-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md bg-slate-900 border border-rose-900/40 rounded-2xl p-6 shadow-2xl text-slate-100">
        <button
          type="button"
          onClick={onClose}
          disabled={deleting}
          aria-label="Close dialog"
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-rose-950/80 border border-rose-800/60 flex items-center justify-center text-rose-400 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h2 id="delete-quiz-title" className="text-lg font-bold text-white">
              Delete Assessment?
            </h2>
            <p className="text-xs text-slate-400">This action cannot be undone</p>
          </div>
        </div>

        <p className="text-sm text-slate-300 mb-3 leading-relaxed">
          Are you sure you want to permanently delete{' '}
          <strong className="text-white font-semibold">"{assessment.title}"</strong> ({assessment.questionCount || assessment.questions?.length || 0} questions)?
          Its questions and corresponding answer keys will be permanently removed from Cloud Firestore.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/50 border border-rose-800/60 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-rose-600 hover:bg-rose-500 active:bg-rose-700 disabled:opacity-50 rounded-xl transition-colors flex items-center gap-1.5 shadow-md shadow-rose-950/40"
          >
            {deleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Yes, Delete Quiz</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
