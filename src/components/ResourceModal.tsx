import { useState, useEffect, useRef } from 'react';
import {
  X,
  FileText,
  Video,
  Presentation,
  FileCode,
  ExternalLink,
  Loader2,
  AlertCircle,
  CheckCircle2,
  UploadCloud,
  FileCheck,
  HardDrive,
  Trash2,
} from 'lucide-react';
import { Course, Resource, ResourceType } from '../types';
import {
  validateResourceInput,
  validateFileUpload,
  formatFileSize,
  RESOURCE_TYPE_CONFIG,
  VALID_RESOURCE_TYPES,
  ALLOWED_FILE_EXTENSIONS,
} from '../utils/resourceValidation';
import { CreateResourceInput, UpdateResourceInput } from '../services/resourceService';
import { uploadAndCreateResource } from '../services/storageService';

interface ResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  trainerId: string;
  trainerCourses: Course[];
  selectedCourseId?: string;
  resourceToEdit?: Resource | null;
  onSaveResource: (
    data: CreateResourceInput | UpdateResourceInput,
    isEdit: boolean,
    resourceId?: string
  ) => Promise<void>;
  onResourceSaved?: () => Promise<void>;
}

type ResourceTab = 'file' | 'link';

export function ResourceModal({
  isOpen,
  onClose,
  trainerId,
  trainerCourses,
  selectedCourseId,
  resourceToEdit,
  onSaveResource,
  onResourceSaved,
}: ResourceModalProps) {
  const isEdit = Boolean(resourceToEdit);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<ResourceTab>('file');
  const [courseId, setCourseId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ResourceType>('pdf');
  const [url, setUrl] = useState('');

  // File upload states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (resourceToEdit) {
        setCourseId(resourceToEdit.courseId);
        setTitle(resourceToEdit.title);
        setDescription(resourceToEdit.description || '');
        setType(resourceToEdit.type);
        setUrl(resourceToEdit.url);
        setActiveTab(resourceToEdit.sourceType === 'file' ? 'file' : 'link');
        setSelectedFile(null);
      } else {
        setCourseId(selectedCourseId || (trainerCourses[0]?.id || ''));
        setTitle('');
        setDescription('');
        setType('pdf');
        setUrl('');
        setActiveTab('file');
        setSelectedFile(null);
      }
      setUploadProgress(null);
      setValidationErrors({});
      setSubmitError(null);
      setIsDragOver(false);
    }
  }, [isOpen, resourceToEdit, selectedCourseId, trainerCourses]);

  if (!isOpen) return null;

  const typeConfig = RESOURCE_TYPE_CONFIG[type] || RESOURCE_TYPE_CONFIG.external_link;

  const clearError = (field: string) => {
    setValidationErrors((prev) => {
      if (!prev[field]) return prev;
      const copy = { ...prev };
      delete copy[field];
      return copy;
    });
  };

  const handleTypeSelect = (selectedType: ResourceType) => {
    setType(selectedType);
    clearError('type');
  };

  const handleFileChange = (file: File | null) => {
    clearError('file');
    clearError('title');
    setSubmitError(null);

    if (!file) {
      setSelectedFile(null);
      return;
    }

    const check = validateFileUpload({
      name: file.name,
      size: file.size,
      type: file.type,
    });

    if (!check.isValid) {
      setValidationErrors((prev) => ({ ...prev, file: check.error || 'Invalid file' }));
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    if (check.detectedType) {
      setType(check.detectedType);
    }

    // Auto-fill title from clean filename if title is currently empty
    if (!title.trim()) {
      const cleanName = file.name
        .replace(/\.[^/.]+$/, '') // remove extension
        .replace(/[_-]+/g, ' ')
        .trim();
      setTitle(cleanName);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // If we're creating a new file upload resource
    if (!isEdit && activeTab === 'file') {
      const errs: Record<string, string> = {};

      if (!courseId) {
        errs.courseId = 'Please select a course.';
      }
      if (!title.trim()) {
        errs.title = 'Resource title is required.';
      } else if (title.trim().length < 2) {
        errs.title = 'Title must be at least 2 characters.';
      }

      if (!selectedFile) {
        errs.file = 'Please choose a file to upload from your device.';
      }

      if (Object.keys(errs).length > 0) {
        setValidationErrors(errs);
        return;
      }

      setSaving(true);
      setUploadProgress(0);

      try {
        await uploadAndCreateResource({
          file: selectedFile!,
          courseId,
          trainerId,
          title: title.trim(),
          description: description.trim(),
          status: 'published',
          onProgress: (pct) => setUploadProgress(pct),
        });

        if (onResourceSaved) {
          await onResourceSaved();
        }
        onClose();
      } catch (err) {
        console.error('File upload or resource creation failed:', err);
        setSubmitError(
          err instanceof Error
            ? err.message
            : 'Failed to upload file to Firebase Storage. Please verify your connection.'
        );
      } finally {
        setSaving(false);
      }
      return;
    }

    // Otherwise, link resource or updating existing resource
    const check = validateResourceInput({
      title,
      description,
      type,
      url: isEdit && resourceToEdit?.sourceType === 'file' ? resourceToEdit.url : url,
      courseId,
    });

    if (!check.isValid) {
      setValidationErrors(check.errors);
      return;
    }

    setSaving(true);
    try {
      if (isEdit && resourceToEdit) {
        await onSaveResource(
          {
            title: title.trim(),
            description: description.trim(),
            type,
            url: resourceToEdit.url,
            status: resourceToEdit.status || 'published',
          },
          true,
          resourceToEdit.id
        );
      } else {
        await onSaveResource(
          {
            courseId,
            title: title.trim(),
            description: description.trim(),
            type,
            url: url.trim(),
            sourceType: 'link',
          },
          false
        );
      }
      if (onResourceSaved) {
        await onResourceSaved();
      }
      onClose();
    } catch (err) {
      console.error('Failed to save resource:', err);
      setSubmitError(
        err instanceof Error
          ? err.message
          : 'Unable to save learning resource. Please verify your connection and permissions.'
      );
    } finally {
      setSaving(false);
    }
  };

  const getTypeIcon = (resType: ResourceType) => {
    switch (resType) {
      case 'pdf':
        return <FileText className="w-4 h-4 text-rose-400" />;
      case 'video':
        return <Video className="w-4 h-4 text-red-400" />;
      case 'presentation':
        return <Presentation className="w-4 h-4 text-amber-400" />;
      case 'document':
        return <FileCode className="w-4 h-4 text-blue-400" />;
      case 'external_link':
        return <ExternalLink className="w-4 h-4 text-emerald-400" />;
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="resource-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-sm overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-100 my-8 max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          aria-label="Close modal"
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/70 border border-cyan-800/60 text-cyan-400 text-xs font-semibold mb-2">
            <span>Firebase Storage File Uploads</span>
          </div>
          <h2 id="resource-modal-title" className="text-2xl font-extrabold text-white">
            {isEdit
              ? 'Edit Learning Resource'
              : 'Add Learning Resource'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Upload PDF lecture notes, slide decks, or attach reference learning links to your courses.
          </p>
        </div>

        {/* Tab Toggle for New Resources */}
        {!isEdit && (
          <div className="flex items-center p-1 bg-slate-950 border border-slate-800 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => {
                setActiveTab('file');
                setSubmitError(null);
                setValidationErrors({});
              }}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'file'
                  ? 'bg-cyan-400 text-slate-950 shadow-md shadow-cyan-400/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload File to Firebase Storage</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('link');
                setSubmitError(null);
                setValidationErrors({});
              }}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'link'
                  ? 'bg-cyan-400 text-slate-950 shadow-md shadow-cyan-400/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ExternalLink className="w-4 h-4" />
              <span>External URL / Streaming Link</span>
            </button>
          </div>
        )}

        {submitError && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-950/50 border border-rose-800/70 text-rose-300 text-xs sm:text-sm flex flex-col gap-2.5">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
              <div>
                <div className="font-semibold text-rose-200">Firebase Storage Notice</div>
                <p className="mt-1 leading-relaxed text-slate-300">{submitError}</p>
              </div>
            </div>
            {submitError.includes('Firebase Storage') && !isEdit && (
              <div className="pt-2 pl-7 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('link');
                    setSubmitError(null);
                  }}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors cursor-pointer"
                >
                  Switch to External URL / Link Mode
                </button>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Associated Course Selector */}
          <div>
            <label htmlFor="course-select" className="block text-xs font-semibold text-slate-300 mb-1.5">
              Associated Course <span className="text-cyan-400">*</span>
            </label>
            {isEdit ? (
              <div className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-slate-300 font-medium">
                {trainerCourses.find((c) => c.id === courseId)?.title || 'Selected Course'}
              </div>
            ) : (
              <select
                id="course-select"
                value={courseId}
                onChange={(e) => {
                  setCourseId(e.target.value);
                  if (validationErrors.courseId) {
                    setValidationErrors((prev) => ({ ...prev, courseId: undefined as any }));
                  }
                }}
                disabled={saving || trainerCourses.length === 0}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white focus:outline-none focus:border-cyan-400 transition-colors"
              >
                {trainerCourses.length === 0 ? (
                  <option value="">No authored courses found</option>
                ) : (
                  trainerCourses.map((c) => (
                    <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                      {c.title} ({c.level} • {c.status})
                    </option>
                  ))
                )}
              </select>
            )}
            {validationErrors.courseId && (
              <p className="mt-1 text-xs text-rose-400">{validationErrors.courseId}</p>
            )}
          </div>

          {/* FILE UPLOAD SECTION (When activeTab === 'file' on new uploads) */}
          {!isEdit && activeTab === 'file' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Select File to Upload <span className="text-cyan-400">*</span>
              </label>

              <input
                ref={fileInputRef}
                type="file"
                accept={ALLOWED_FILE_EXTENSIONS.join(',')}
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFileChange(e.target.files[0]);
                  }
                }}
                className="hidden"
                disabled={saving}
              />

              {!selectedFile ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-6 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all ${
                    isDragOver
                      ? 'border-cyan-400 bg-cyan-950/30 text-white'
                      : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 text-slate-400'
                  }`}
                >
                  <UploadCloud className="w-10 h-10 text-cyan-400 mx-auto mb-2 animate-pulse" />
                  <div className="text-sm font-semibold text-white mb-1">
                    Click to browse or drag and drop your document
                  </div>
                  <p className="text-xs text-slate-400">
                    Supports PDF, DOCX, DOC, PPTX, PPT, TXT (Maximum file size: 10 MB)
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-950 border border-cyan-800/60 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-800/80 flex items-center justify-center text-cyan-400 shrink-0">
                      <FileCheck className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white truncate">
                        {selectedFile.name}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                        <span className="font-mono text-cyan-300">
                          {formatFileSize(selectedFile.size)}
                        </span>
                        <span>•</span>
                        <span className="uppercase text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                          {type}
                        </span>
                      </div>
                    </div>
                  </div>

                  {!saving && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="p-2 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-900 transition-colors"
                      title="Choose a different file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}

              {validationErrors.file && (
                <p className="mt-1.5 text-xs text-rose-400">{validationErrors.file}</p>
              )}

              {/* Progress Indicator during upload */}
              {saving && uploadProgress !== null && (
                <div className="mt-4 p-4 rounded-2xl bg-cyan-950/40 border border-cyan-800/70 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-cyan-300 flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Uploading to Firebase Storage...
                    </span>
                    <span className="text-white font-mono">{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-cyan-300 transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* EDITING STATE ATTACHED FILE NOTICE */}
          {isEdit && resourceToEdit?.sourceType === 'file' && (
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <HardDrive className="w-4 h-4 text-cyan-400 shrink-0" />
                <div>
                  <span className="text-slate-400">Attached Storage File: </span>
                  <strong className="text-white font-mono">{resourceToEdit.fileName || 'file'}</strong>
                  {resourceToEdit.fileSize && (
                    <span className="text-slate-500 ml-1.5">({formatFileSize(resourceToEdit.fileSize)})</span>
                  )}
                </div>
              </div>
              <a
                href={resourceToEdit.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 hover:text-cyan-300 underline font-medium"
              >
                View File
              </a>
            </div>
          )}

          {/* Resource Title */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="resource-title" className="text-xs font-semibold text-slate-300">
                Resource Title <span className="text-cyan-400">*</span>
              </label>
              <span className="text-[11px] text-slate-500">{title.length}/120</span>
            </div>
            <input
              id="resource-title"
              type="text"
              value={title}
              maxLength={120}
              onChange={(e) => {
                setTitle(e.target.value);
                clearError('title');
              }}
              placeholder="e.g., Module 1 Lecture Slides & Annotated Notes"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
            />
            {validationErrors.title && (
              <p className="mt-1 text-xs text-rose-400">{validationErrors.title}</p>
            )}
          </div>

          {/* EXTERNAL URL TAB FIELDS (If activeTab === 'link') */}
          {(isEdit ? resourceToEdit?.sourceType !== 'file' : activeTab === 'link') && (
            <>
              {/* Resource Type Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Resource Format / Type <span className="text-cyan-400">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {VALID_RESOURCE_TYPES.map((resType) => {
                    const conf = RESOURCE_TYPE_CONFIG[resType];
                    const isSelected = type === resType;
                    return (
                      <button
                        key={resType}
                        type="button"
                        onClick={() => handleTypeSelect(resType)}
                        className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'bg-cyan-950/40 border-cyan-400 shadow-md shadow-cyan-950/50'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center">
                            {getTypeIcon(resType)}
                          </div>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-cyan-400" />}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white leading-snug">
                            {conf.label.split(' / ')[0]}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate mt-0.5">
                            {resType.toUpperCase()}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {validationErrors.type && (
                  <p className="mt-1.5 text-xs text-rose-400">{validationErrors.type}</p>
                )}
              </div>

              {/* Resource URL with Type Context */}
              <div>
                <label htmlFor="resource-url" className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Resource Access URL <span className="text-cyan-400">*</span>
                </label>
                <input
                  id="resource-url"
                  type="url"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    clearError('url');
                  }}
                  placeholder={typeConfig.urlPlaceholder}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors font-mono text-xs sm:text-sm"
                />
                <p className="mt-1 text-[11px] text-slate-400 flex items-center gap-1">
                  <span>Tip:</span> {typeConfig.urlHint}
                </p>
                {validationErrors.url && (
                  <p className="mt-1 text-xs text-rose-400">{validationErrors.url}</p>
                )}
              </div>
            </>
          )}

          {/* Description / Instructions */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="resource-desc" className="text-xs font-semibold text-slate-300">
                Resource Description & Study Guide <span className="text-slate-500">(Optional)</span>
              </label>
              <span className="text-[11px] text-slate-500">{description.length}/1000</span>
            </div>
            <textarea
              id="resource-desc"
              rows={3}
              value={description}
              maxLength={1000}
              onChange={(e) => {
                setDescription(e.target.value);
                if (validationErrors.description) {
                  setValidationErrors((prev) => ({ ...prev, description: undefined as any }));
                }
              }}
              placeholder="Provide context, required chapters, or tips for trainees studying this material..."
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors resize-none"
            />
            {validationErrors.description && (
              <p className="mt-1 text-xs text-rose-400">{validationErrors.description}</p>
            )}
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-5 py-2.5 text-xs sm:text-sm font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || (!isEdit && trainerCourses.length === 0)}
              className="px-5 py-2.5 text-xs sm:text-sm font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-md shadow-cyan-400/20 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>
                    {!isEdit && activeTab === 'file'
                      ? 'Uploading File...'
                      : 'Saving Resource...'}
                  </span>
                </>
              ) : (
                <span>
                  {isEdit
                    ? 'Update Resource'
                    : activeTab === 'file'
                    ? 'Upload & Publish to Storage'
                    : 'Save Learning Resource'}
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
