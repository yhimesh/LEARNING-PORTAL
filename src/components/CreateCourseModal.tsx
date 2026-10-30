import { useState, useEffect } from 'react';
import { X, BookOpen, AlertCircle, Loader2, Plus, ArrowRight } from 'lucide-react';
import { CourseStatus } from '../types';
import { createCourse, CreateCourseInput } from '../services/courseService';
import { useAuth } from '../context/AuthContext';

interface CreateCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCourseCreated: () => void;
}

export function CreateCourseModal({ isOpen, onClose, onCourseCreated }: CreateCourseModalProps) {
  const { currentUser, userProfile } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fullDescription, setFullDescription] = useState('');
  const [category, setCategory] = useState('Programming');
  const [level, setLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Beginner');
  const [duration, setDuration] = useState('20 hours');
  const [status, setStatus] = useState<CourseStatus>('published');
  const [syllabusInput, setSyllabusInput] = useState('');
  const [prerequisites, setPrerequisites] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      setErrorMessage(null);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!currentUser) {
      setErrorMessage('You must be signed in to create a course.');
      return;
    }

    const trainerName = userProfile?.fullName || currentUser.displayName || 'Instructor';
    const trainerId = currentUser.uid;

    const syllabus = syllabusInput
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const input: CreateCourseInput = {
      title,
      description,
      fullDescription: fullDescription || description,
      category,
      level,
      duration,
      status,
      syllabus,
      prerequisites,
    };

    setSubmitting(true);
    try {
      await createCourse(input, trainerId, trainerName);
      // Reset form
      setTitle('');
      setDescription('');
      setFullDescription('');
      setSyllabusInput('');
      setPrerequisites('');
      onClose();
      onCourseCreated();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-course-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-sm overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 sm:p-7 text-slate-100 my-8 max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close create course modal"
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center text-cyan-400">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 id="create-course-modal-title" className="text-xl font-bold text-white tracking-tight">
              Create New Course
            </h2>
            <p className="text-xs text-slate-400">
              Publish a new capacity building module to Cloud Firestore
            </p>
          </div>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="mb-5 p-3.5 rounded-xl bg-rose-950/50 border border-rose-800/60 text-xs text-rose-300 flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label
              htmlFor="course-title"
              className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5"
            >
              Course Title <span className="text-rose-400">*</span>
            </label>
            <input
              id="course-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Cloud Computing & Microservices"
              required
              className="w-full px-3.5 py-2.5 bg-slate-950 rounded-xl text-sm text-white placeholder-slate-500 border border-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-400"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="course-category"
                className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5"
              >
                Category <span className="text-rose-400">*</span>
              </label>
              <select
                id="course-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 rounded-xl text-xs text-white border border-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                <option value="Programming">Programming</option>
                <option value="AI and ML">AI and ML</option>
                <option value="Web Development">Web Development</option>
                <option value="Database">Database</option>
                <option value="Computer Science">Computer Science</option>
                <option value="Cybersecurity">Cybersecurity</option>
                <option value="Cloud Systems">Cloud Systems</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="course-level"
                className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5"
              >
                Level <span className="text-rose-400">*</span>
              </label>
              <select
                id="course-level"
                value={level}
                onChange={(e) => setLevel(e.target.value as 'Beginner' | 'Intermediate' | 'Advanced')}
                className="w-full px-3 py-2 bg-slate-950 rounded-xl text-xs text-white border border-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="course-duration"
                className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5"
              >
                Duration <span className="text-rose-400">*</span>
              </label>
              <input
                id="course-duration"
                type="text"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="e.g. 20 hours"
                required
                className="w-full px-3.5 py-2 bg-slate-950 rounded-xl text-xs text-white placeholder-slate-500 border border-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              />
            </div>

            <div>
              <label
                htmlFor="course-status"
                className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5"
              >
                Publishing Status <span className="text-rose-400">*</span>
              </label>
              <select
                id="course-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as CourseStatus)}
                className="w-full px-3 py-2 bg-slate-950 rounded-xl text-xs text-white border border-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                <option value="published">Published (Visible in Catalogue)</option>
                <option value="draft">Draft (Visible only to you)</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="course-description"
              className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5"
            >
              Short Overview Description <span className="text-rose-400">*</span>
            </label>
            <textarea
              id="course-description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Concise 1-2 sentence description for course cards..."
              required
              className="w-full px-3.5 py-2 bg-slate-950 rounded-xl text-xs text-white placeholder-slate-500 border border-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-400"
            />
          </div>

          <div>
            <label
              htmlFor="course-full-description"
              className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5"
            >
              Full Course Curriculum Details
            </label>
            <textarea
              id="course-full-description"
              rows={3}
              value={fullDescription}
              onChange={(e) => setFullDescription(e.target.value)}
              placeholder="In-depth explanation of concepts, target audience, and methodologies..."
              className="w-full px-3.5 py-2 bg-slate-950 rounded-xl text-xs text-white placeholder-slate-500 border border-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-400"
            />
          </div>

          <div>
            <label
              htmlFor="course-syllabus"
              className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5"
            >
              Syllabus Modules (one per line)
            </label>
            <textarea
              id="course-syllabus"
              rows={3}
              value={syllabusInput}
              onChange={(e) => setSyllabusInput(e.target.value)}
              placeholder="Module 1: Introduction&#10;Module 2: Core Architecture&#10;Module 3: Hands-on Projects"
              className="w-full px-3.5 py-2 bg-slate-950 rounded-xl text-xs text-white placeholder-slate-500 border border-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-400"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 disabled:opacity-50 rounded-xl transition-all shadow-md shadow-cyan-400/20 flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving to Firestore...</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Course</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
