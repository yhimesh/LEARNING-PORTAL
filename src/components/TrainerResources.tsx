import { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Video,
  Presentation,
  FileCode,
  ExternalLink,
  Plus,
  Trash2,
  Edit3,
  Loader2,
  AlertCircle,
  FolderOpen,
  CheckCircle2,
  RefreshCw,
  BookOpen,
  HardDrive,
  Download,
  UploadCloud,
} from 'lucide-react';
import { Course, Resource, ResourceType } from '../types';
import { RESOURCE_TYPE_CONFIG, formatFileSize } from '../utils/resourceValidation';
import {
  getTrainerCourseResources,
  createResource,
  updateResource,
  CreateResourceInput,
  UpdateResourceInput,
} from '../services/resourceService';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { deleteResourceWithStorage } from '../services/storageService';
import { createNotification } from '../services/notificationService';
import { sendEmailNotification } from '../services/emailService';
import { ResourceModal } from './ResourceModal';
import { DeleteResourceModal } from './DeleteResourceModal';

interface TrainerResourcesProps {
  trainerId: string;
  trainerCourses: Course[];
  onOpenCreateCourse?: () => void;
}

export function TrainerResources({
  trainerId,
  trainerCourses,
  onOpenCreateCourse,
}: TrainerResourcesProps) {
  const [selectedCourseId, setSelectedCourseId] = useState<string>(
    trainerCourses[0]?.id || ''
  );
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(
    null
  );

  // Modal states
  const [resourceModalOpen, setResourceModalOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [resourceToDelete, setResourceToDelete] = useState<Resource | null>(null);

  // Sync selectedCourseId when trainerCourses updates
  useEffect(() => {
    if (trainerCourses.length > 0 && (!selectedCourseId || !trainerCourses.some((c) => c.id === selectedCourseId))) {
      setSelectedCourseId(trainerCourses[0].id);
    }
  }, [trainerCourses, selectedCourseId]);

  // Load resources for the currently selected course
  const loadResources = useCallback(async () => {
    if (!selectedCourseId || !trainerId) {
      setResources([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await getTrainerCourseResources(trainerId, selectedCourseId);
      setResources(data);
    } catch (err) {
      console.error('Failed to load resources:', err);
      setError('Unable to load resources from Cloud Firestore. Please check your network connection.');
    } finally {
      setLoading(false);
    }
  }, [trainerId, selectedCourseId]);

  useEffect(() => {
    loadResources();
  }, [loadResources]);

  // Auto-dismiss feedback message after 4 seconds
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const selectedCourse = trainerCourses.find((c) => c.id === selectedCourseId);

  const handleOpenAddModal = () => {
    setEditingResource(null);
    setResourceModalOpen(true);
  };

  const handleOpenEditModal = (res: Resource) => {
    setEditingResource(res);
    setResourceModalOpen(true);
  };

  const handleSaveResource = async (
    data: CreateResourceInput | UpdateResourceInput,
    isEdit: boolean,
    resourceId?: string
  ) => {
    if (isEdit && resourceId && editingResource) {
      await updateResource(resourceId, data as UpdateResourceInput, editingResource);
      setFeedback({ message: 'Resource updated successfully in Cloud Firestore!', type: 'success' });
    } else {
      await createResource(data as CreateResourceInput, trainerId);
      setFeedback({ message: 'Resource published successfully in Cloud Firestore!', type: 'success' });

      // Notify enrolled learners
      try {
        const enrQuery = query(collection(db, 'enrollments'), where('courseId', '==', selectedCourseId));
        const enrSnap = await getDocs(enrQuery);
        const courseTitle = trainerCourses.find((c) => c.id === selectedCourseId)?.title || 'Course';

        for (const d of enrSnap.docs) {
          const enrData = d.data();
          if (enrData.traineeId) {
            createNotification({
              id: `respub_${selectedCourseId}_${d.id}_${Date.now()}`,
              recipientUid: enrData.traineeId,
              type: 'new_resource',
              title: 'New Resource Published',
              message: `New resource "${data.title}" was added to your enrolled course "${courseTitle}".`,
              relatedEntityId: selectedCourseId,
              relatedEntityType: 'course',
            });

            // Fetch trainee profile to deliver email notification
            getDoc(doc(db, 'users', enrData.traineeId))
              .then((userSnap) => {
                if (userSnap.exists()) {
                  const userData = userSnap.data();
                  if (userData.email) {
                    sendEmailNotification({
                      eventType: 'new_resource',
                      recipientEmail: userData.email,
                      recipientName: userData.fullName || userData.email.split('@')[0],
                      data: {
                        courseId: selectedCourseId,
                        courseTitle,
                        resourceTitle: data.title,
                        resourceType: data.type,
                      },
                      idempotencyKey: `email_res_${selectedCourseId}_${data.title}_${enrData.traineeId}`,
                    }).catch((e) => console.warn('Notice: Non-critical email dispatch notice:', e));
                  }
                }
              })
              .catch((e) => console.warn('Notice: Non-critical trainee email lookup notice:', e));
          }
        }
      } catch (notifErr) {
        console.warn('Notice: Non-critical resource notification notice:', notifErr);
      }
    }
    await loadResources();
  };

  const handleConfirmDelete = async (resource: Resource) => {
    await deleteResourceWithStorage(resource.id, resource.storagePath);
    setFeedback({
      message: resource.storagePath
        ? 'Resource and attached Firebase Storage file deleted successfully.'
        : 'Resource deleted successfully.',
      type: 'success',
    });
    await loadResources();
  };

  const getTypeIcon = (type: ResourceType) => {
    switch (type) {
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
    <div className="mt-10 pt-8 border-t border-slate-800">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-cyan-950/70 border border-cyan-800/60 text-cyan-400 font-mono">
              Course Resources
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Learning Resources & Storage
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Upload course documents directly to Firebase Storage or link external reference materials.
          </p>
        </div>

        {trainerCourses.length > 0 && (
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={loadResources}
              disabled={loading}
              title="Refresh resources from Firestore"
              className="p-2.5 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 rounded-xl transition-all shadow-md shadow-cyan-400/20 flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Add / Upload Resource</span>
            </button>
          </div>
        )}
      </div>

      {/* Floating Feedback Alert */}
      {feedback && (
        <div
          role="status"
          className={`mb-6 p-3.5 rounded-2xl border text-xs sm:text-sm flex items-center gap-2.5 transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-800/70 text-emerald-300'
              : 'bg-rose-950/60 border-rose-800/70 text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Course Selection or Empty Warning */}
      {trainerCourses.length === 0 ? (
        <div className="p-8 rounded-2xl bg-slate-950/70 border border-slate-800 text-center space-y-3">
          <BookOpen className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No Authored Courses Found</h3>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
            You must have at least one course authored in Cloud Firestore to attach learning resources. Create a course or seed foundation courses first.
          </p>
          {onOpenCreateCourse && (
            <div className="pt-2">
              <button
                type="button"
                onClick={onOpenCreateCourse}
                className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-xl transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Your First Course</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Course Selector Bar */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1 w-full sm:w-auto">
              <label htmlFor="select-trainer-course" className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Select Course to Manage:
              </label>
              <select
                id="select-trainer-course"
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="w-full sm:w-80 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-xs sm:text-sm font-medium focus:outline-none focus:border-cyan-400 transition-colors"
              >
                {trainerCourses.map((c) => (
                  <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                    {c.title} ({c.status})
                  </option>
                ))}
              </select>
            </div>

            {selectedCourse && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                  Category: <span className="text-white font-medium">{selectedCourse.category}</span>
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                  Level: <span className="text-white font-medium">{selectedCourse.level}</span>
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-cyan-950/60 border border-cyan-800/60 text-cyan-300 font-medium">
                  {resources.length} {resources.length === 1 ? 'Resource' : 'Resources'}
                </span>
              </div>
            )}
          </div>

          {/* Resources List / State */}
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
              <p className="text-xs text-slate-400">Loading resources from Cloud Firestore...</p>
            </div>
          ) : error ? (
            <div className="p-6 rounded-2xl bg-rose-950/40 border border-rose-800/60 text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
              <div className="text-sm font-semibold text-rose-200">{error}</div>
              <button
                type="button"
                onClick={loadResources}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            </div>
          ) : resources.length === 0 ? (
            <div className="p-10 rounded-2xl bg-slate-950/50 border border-dashed border-slate-800 text-center space-y-3">
              <FolderOpen className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-sm font-bold text-white">No Learning Resources for this Course</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Help your trainees succeed by uploading lecture slides, code exercises, or PDF reading materials to Firebase Storage.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleOpenAddModal}
                  className="px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-xl transition-colors inline-flex items-center gap-1.5 shadow-sm shadow-cyan-400/20 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add First Resource</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {resources.map((res) => {
                const conf = RESOURCE_TYPE_CONFIG[res.type] || RESOURCE_TYPE_CONFIG.external_link;
                const isStorage = Boolean(res.storagePath || res.sourceType === 'file');

                return (
                  <div
                    key={res.id}
                    className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800/90 hover:border-slate-700/80 transition-all flex flex-col justify-between group shadow-sm hover:shadow-md"
                  >
                    <div>
                      {/* Top Badges and Action Icons */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold ${conf.badgeColor}`}
                          >
                            {getTypeIcon(res.type)}
                            <span>{conf.label.split(' / ')[0]}</span>
                          </span>

                          {isStorage && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-800/60 text-[10px] font-mono font-medium text-cyan-300">
                              <HardDrive className="w-3 h-3" />
                              <span>Firebase Storage</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(res)}
                            title="Edit Resource"
                            className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-900 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setResourceToDelete(res)}
                            title="Delete Resource"
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Title */}
                      <h4 className="text-sm sm:text-base font-bold text-white mb-1.5 leading-snug group-hover:text-cyan-300 transition-colors">
                        {res.title}
                      </h4>

                      {/* File Details if Storage */}
                      {isStorage && (
                        <div className="mb-2.5 flex items-center gap-2 text-xs text-slate-400">
                          <span className="font-mono text-cyan-300 truncate max-w-[200px]">
                            {res.fileName || 'document'}
                          </span>
                          {res.fileSize && (
                            <>
                              <span>•</span>
                              <span className="text-slate-500 font-mono">
                                {formatFileSize(res.fileSize)}
                              </span>
                            </>
                          )}
                        </div>
                      )}

                      {/* Description if present */}
                      {res.description && (
                        <p className="text-xs text-slate-400 line-clamp-3 mb-3 leading-relaxed">
                          {res.description}
                        </p>
                      )}
                    </div>

                    {/* URL Link and Footer */}
                    <div className="pt-3 border-t border-slate-900 mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="text-xs font-mono text-slate-400 flex items-center gap-1.5 truncate max-w-[240px]">
                        {isStorage ? (
                          <>
                            <HardDrive className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            <span className="truncate text-slate-400">{res.fileName || 'Storage Object'}</span>
                          </>
                        ) : (
                          <>
                            <ExternalLink className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            <span className="truncate text-cyan-400">{res.url}</span>
                          </>
                        )}
                      </div>

                      <a
                        href={res.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-1.5 text-xs font-semibold text-slate-200 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors inline-flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                      >
                        {isStorage ? (
                          <>
                            <Download className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Download File</span>
                          </>
                        ) : (
                          <>
                            <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Open Link</span>
                          </>
                        )}
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Resource Modal */}
      <ResourceModal
        isOpen={resourceModalOpen}
        onClose={() => {
          setResourceModalOpen(false);
          setEditingResource(null);
        }}
        trainerId={trainerId}
        trainerCourses={trainerCourses}
        selectedCourseId={selectedCourseId}
        resourceToEdit={editingResource}
        onSaveResource={handleSaveResource}
        onResourceSaved={loadResources}
      />

      {/* Delete Confirmation Modal */}
      <DeleteResourceModal
        isOpen={Boolean(resourceToDelete)}
        resource={resourceToDelete}
        onClose={() => setResourceToDelete(null)}
        onConfirmDelete={handleConfirmDelete}
      />
    </div>
  );
}
