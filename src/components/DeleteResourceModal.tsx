import { useState } from 'react';
import { AlertTriangle, Trash2, X, Loader2, HardDrive } from 'lucide-react';
import { Resource } from '../types';
import { formatFileSize } from '../utils/resourceValidation';

interface DeleteResourceModalProps {
  resource: Resource | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelete: (resource: Resource) => Promise<void>;
}

export function DeleteResourceModal({
  resource,
  isOpen,
  onClose,
  onConfirmDelete,
}: DeleteResourceModalProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !resource) return null;

  const isStorageFile = Boolean(resource.storagePath || resource.sourceType === 'file');

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      await onConfirmDelete(resource);
      onClose();
    } catch (err) {
      console.error('Failed to delete resource:', err);
      setError('Failed to remove this resource. Please verify your connection and permissions.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-resource-title"
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
            <h2 id="delete-resource-title" className="text-lg font-bold text-white">
              Remove Learning Resource?
            </h2>
            <p className="text-xs text-slate-400">This action cannot be undone</p>
          </div>
        </div>

        <p className="text-sm text-slate-300 mb-3 leading-relaxed">
          Are you sure you want to permanently delete the learning resource{' '}
          <strong className="text-white font-semibold">"{resource.title}"</strong>? It will no longer be accessible for students enrolled in this course.
        </p>

        {isStorageFile && (
          <div className="mb-4 p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
            <HardDrive className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-white">Storage File Cleanup:</span> The file{' '}
              <span className="font-mono text-cyan-300">{resource.fileName || 'uploaded file'}</span>{' '}
              ({formatFileSize(resource.fileSize)}) will also be permanently deleted from Firebase Storage.
            </div>
          </div>
        )}

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
                <span>Removing...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Yes, Delete Resource</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
