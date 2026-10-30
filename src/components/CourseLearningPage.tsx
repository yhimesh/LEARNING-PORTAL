import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  BookOpen,
  FileText,
  Video,
  Presentation,
  FileCode,
  ExternalLink,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  GraduationCap,
  Calendar,
  Clock,
  Layers,
  Sparkles,
  RefreshCw,
  FolderOpen,
  Play,
  Download,
  HardDrive,
  Square,
  BarChart2,
  Award,
} from 'lucide-react';
import { Course, Resource, ResourceType, CourseProgress } from '../types';
import { RESOURCE_TYPE_CONFIG, formatFileSize } from '../utils/resourceValidation';
import { getEnrolledCourseResources } from '../services/resourceService';
import { checkIsEnrolled } from '../services/enrollmentService';
import { getTraineeCourseProgress, toggleResourceCompletion } from '../services/progressService';
import { useAuth } from '../context/AuthContext';

interface CourseLearningPageProps {
  course: Course;
  onBack: () => void;
  onExploreCourses: () => void;
}

export function CourseLearningPage({
  course,
  onBack,
  onExploreCourses,
}: CourseLearningPageProps) {
  const { currentUser, userProfile } = useAuth();

  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolled, setEnrolled] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | ResourceType>('all');
  const [courseProgress, setCourseProgress] = useState<CourseProgress | null>(null);
  const [togglingResourceId, setTogglingResourceId] = useState<string | null>(null);

  const role = userProfile?.requestedRole || 'Trainee';
  const status = userProfile?.accountStatus || 'active';
  const isAdmin =
    currentUser?.email === 'yhimeshc@gmail.com' ||
    currentUser?.email === 'admin@capacityconnect.edu';

  const loadResources = useCallback(async () => {
    if (!currentUser) {
      setLoading(false);
      setEnrolled(false);
      setErrorMessage('Authentication required: Please sign in to access course materials.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      // 1. Verify enrollment on client before querying resources
      const isEnrolled = isAdmin || (await checkIsEnrolled(currentUser.uid, course.id));
      setEnrolled(isEnrolled);

      if (!isEnrolled) {
        setLoading(false);
        setErrorMessage(
          'Access Denied: You must be actively enrolled in this course to access its learning resources and lecture materials.'
        );
        return;
      }

      // 2. Query published resources and trainee progress concurrently from Cloud Firestore
      const [data, progress] = await Promise.all([
        getEnrolledCourseResources(currentUser.uid, course.id),
        getTraineeCourseProgress(currentUser.uid, course.id),
      ]);
      setResources(data);
      setCourseProgress(progress);
    } catch (err) {
      console.error('Failed to load course learning resources or progress:', err);
      setErrorMessage(
        'Unable to load course materials from Cloud Firestore. Please verify your enrollment status or internet connection.'
      );
    } finally {
      setLoading(false);
    }
  }, [currentUser, course.id, isAdmin]);

  const handleToggleResource = async (resourceId: string) => {
    if (!currentUser) return;
    setTogglingResourceId(resourceId);
    try {
      const validResourceIds = resources.map((r) => r.id);
      const updated = await toggleResourceCompletion({
        traineeId: currentUser.uid,
        traineeName: userProfile?.fullName || currentUser.displayName || 'Trainee Learner',
        traineeEmail: currentUser.email || '',
        courseId: course.id,
        courseTitle: course.title,
        resourceId,
        validResourceIds,
      });
      setCourseProgress(updated);
    } catch (err: any) {
      console.error('Failed to toggle resource completion:', err);
    } finally {
      setTogglingResourceId(null);
    }
  };

  useEffect(() => {
    loadResources();
  }, [loadResources]);

  const getActionLabel = (type: ResourceType) => {
    switch (type) {
      case 'video':
        return 'Watch Lecture';
      case 'pdf':
        return 'View Document';
      case 'presentation':
        return 'Open Slides';
      case 'document':
        return 'Read Notes';
      case 'external_link':
        return 'Open Resource';
    }
  };

  const getActionIcon = (type: ResourceType) => {
    switch (type) {
      case 'video':
        return <Play className="w-3.5 h-3.5 fill-current" />;
      case 'pdf':
        return <Download className="w-3.5 h-3.5" />;
      default:
        return <ExternalLink className="w-3.5 h-3.5" />;
    }
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

  const filteredResources =
    activeTab === 'all' ? resources : resources.filter((r) => r.type === activeTab);

  const resourceCountsByType = resources.reduce(
    (acc, r) => {
      acc[r.type] = (acc[r.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <section className="bg-slate-950 text-slate-100 py-10 sm:py-14 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Navigation Breadcrumb & Back Action */}
        <div className="flex items-center justify-between gap-4 mb-8">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all cursor-pointer shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <ArrowLeft className="w-4 h-4 text-cyan-400" />
            <span>Back to My Courses</span>
          </button>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/70 border border-cyan-800/60 text-cyan-400 text-xs font-mono">
            <span>Trainee Learning Classroom</span>
          </div>
        </div>

        {/* Access Denied View */}
        {!loading && enrolled === false && (
          <div className="bg-slate-900 border border-rose-900/60 rounded-3xl p-8 sm:p-12 text-center max-w-2xl mx-auto shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-rose-950/80 border border-rose-800/80 flex items-center justify-center text-rose-400 mx-auto mb-4">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
              Enrollment Access Restricted
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6">
              {errorMessage ||
                'You do not have an active enrollment record in Cloud Firestore for this course. Access to proprietary lecture materials, slide decks, and code exercises is restricted to enrolled students.'}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={onBack}
                className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                Return to Dashboard
              </button>
              <button
                type="button"
                onClick={onExploreCourses}
                className="px-5 py-2 text-xs sm:text-sm font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-xl transition-all shadow-md shadow-cyan-400/20 cursor-pointer"
              >
                Browse Course Catalogue
              </button>
            </div>
          </div>
        )}

        {/* Authorized Course Classroom View */}
        {(loading || enrolled === true) && (
          <div className="space-y-8">
            {/* Course Header Banner */}
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 lg:p-10 shadow-2xl">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-24 -right-24 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl"
              />

              <div className="relative z-10">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-800/60 text-cyan-400 font-mono">
                    {course.category}
                  </span>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-950/80 border border-slate-800 text-slate-300">
                    {course.level}
                  </span>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-800/50 text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Enrolled Student</span>
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight mb-3">
                  {course.title}
                </h1>

                <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed mb-6">
                  {course.fullDescription || course.description}
                </p>

                {/* Course Metadata Strip */}
                <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-4 border-t border-slate-800/80 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-cyan-400" />
                    <span>
                      Faculty: <strong className="text-white font-medium">{course.trainerName}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-cyan-400" />
                    <span>
                      Duration: <strong className="text-white font-medium">{course.duration}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    <span>
                      Materials: <strong className="text-white font-medium">{resources.length} Available</strong>
                    </span>
                  </div>
                </div>

                {/* Course Completion Progress Strip */}
                <div className="mt-6 pt-5 border-t border-slate-800/80 bg-slate-950/70 rounded-2xl p-4 sm:p-5 border border-slate-850">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-2">
                      <BarChart2 className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs sm:text-sm font-bold text-white">Your Course Progress</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        (courseProgress?.progressPercentage || 0) === 100
                          ? 'bg-emerald-950/80 border-emerald-700/80 text-emerald-400'
                          : (courseProgress?.progressPercentage || 0) > 0
                          ? 'bg-cyan-950/80 border-cyan-800/80 text-cyan-300'
                          : 'bg-slate-900 border-slate-700 text-slate-400'
                      }`}>
                        {(courseProgress?.progressPercentage || 0) === 100
                          ? 'Completed 🎉'
                          : (courseProgress?.progressPercentage || 0) > 0
                          ? 'In Progress'
                          : 'Not Started'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400">
                      <strong className="text-cyan-400 font-semibold">{courseProgress?.completedResourceCount || 0}</strong> of{' '}
                      <strong className="text-white font-medium">{resources.length}</strong> resources completed ({courseProgress?.progressPercentage || 0}%)
                    </div>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${courseProgress?.progressPercentage || 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Learning Resources Header & Format Tabs */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center text-cyan-400 shrink-0">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                      <span>Curriculum Learning Materials</span>
                      {!loading && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-800/50 text-cyan-400">
                          {resources.length}
                        </span>
                      )}
                    </h2>
                    <p className="text-xs text-slate-400">
                      Official lecture slides, video tutorials, documentation, and reference links
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={loadResources}
                  disabled={loading}
                  aria-label="Refresh learning resources"
                  className="self-start sm:self-auto px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {/* Resource Filter Tabs */}
              {!loading && resources.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-6">
                  <button
                    type="button"
                    onClick={() => setActiveTab('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      activeTab === 'all'
                        ? 'bg-cyan-400 text-slate-950 shadow-md shadow-cyan-400/20'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    All Resources ({resources.length})
                  </button>
                  {(['video', 'pdf', 'presentation', 'document', 'external_link'] as ResourceType[]).map(
                    (t) => {
                      const count = resourceCountsByType[t] || 0;
                      if (count === 0) return null;
                      const conf = RESOURCE_TYPE_CONFIG[t];
                      const isSelected = activeTab === t;
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setActiveTab(t)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-cyan-400 text-slate-950 shadow-md shadow-cyan-400/20'
                              : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                          }`}
                        >
                          {getTypeIcon(t)}
                          <span>{conf.label.split(' / ')[0]} ({count})</span>
                        </button>
                      );
                    }
                  )}
                </div>
              )}

              {/* Resource Content States */}
              <div className="pt-6">
                {/* Loading State */}
                {loading && (
                  <div className="py-16 flex flex-col items-center justify-center text-center space-y-3">
                    <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                    <p className="text-xs sm:text-sm text-slate-400">
                      Loading learning resources from Cloud Firestore...
                    </p>
                  </div>
                )}

                {/* Query Error State */}
                {!loading && errorMessage && (
                  <div className="p-6 rounded-2xl bg-rose-950/40 border border-rose-800/60 text-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                      <div className="text-xs sm:text-sm">
                        <span className="font-semibold text-rose-300">Firestore Query Error: </span>
                        {errorMessage}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={loadResources}
                      className="px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-rose-400 hover:bg-rose-300 rounded-lg transition-colors shrink-0 cursor-pointer"
                    >
                      Retry
                    </button>
                  </div>
                )}

                {/* Empty State */}
                {!loading && !errorMessage && resources.length === 0 && (
                  <div className="p-10 rounded-2xl bg-slate-950/50 border border-dashed border-slate-800 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mx-auto">
                      <FolderOpen className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-bold text-white">No Learning Resources Added Yet</h3>
                    <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                      No learning resources have been published for this course yet. Your instructor is currently preparing curriculum notes, slide decks, and code references. Check back soon!
                    </p>
                  </div>
                )}

                {/* Filter Empty State */}
                {!loading && !errorMessage && resources.length > 0 && filteredResources.length === 0 && (
                  <div className="p-8 rounded-2xl bg-slate-950/40 border border-slate-800 text-center">
                    <p className="text-xs sm:text-sm text-slate-400">
                      No materials found under the selected format filter.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('all')}
                      className="mt-3 px-3 py-1.5 text-xs font-semibold text-cyan-400 hover:underline"
                    >
                      Show all resources
                    </button>
                  </div>
                )}

                {/* Populated Resources Grid */}
                {!loading && !errorMessage && filteredResources.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredResources.map((res) => {
                      const conf =
                        RESOURCE_TYPE_CONFIG[res.type] || RESOURCE_TYPE_CONFIG.external_link;
                      const isStorage = Boolean(res.storagePath || res.sourceType === 'file');
                      const isCompleted = courseProgress?.completedResourceIds.includes(res.id);

                      return (
                        <div
                          key={res.id}
                          className={`p-5 rounded-2xl border transition-all flex flex-col justify-between group shadow-sm hover:shadow-lg ${
                            isCompleted
                              ? 'bg-slate-950/90 border-emerald-800/60 shadow-emerald-950/20'
                              : 'bg-slate-950/70 border-slate-800 hover:border-cyan-800/50'
                          }`}
                        >
                          <div>
                            {/* Badges */}
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
                                    <span>Cloud File</span>
                                  </span>
                                )}

                                {isCompleted && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/90 border border-emerald-700/80 text-[10px] font-semibold text-emerald-400">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>Completed</span>
                                  </span>
                                )}
                              </div>

                              <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">
                                {res.type}
                              </span>
                            </div>

                            {/* Title */}
                            <h3 className="text-sm sm:text-base font-bold text-white mb-1.5 leading-snug group-hover:text-cyan-300 transition-colors">
                              {res.title}
                            </h3>

                            {/* File Name & Size info */}
                            {isStorage && (
                              <div className="mb-2.5 flex items-center gap-2 text-xs text-slate-400">
                                <span className="font-mono text-cyan-300 truncate max-w-[200px]">
                                  {res.fileName || 'learning-material'}
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
                              <p className="text-xs text-slate-400 line-clamp-3 mb-4 leading-relaxed">
                                {res.description}
                              </p>
                            )}
                          </div>

                          {/* Footer Action */}
                          <div className="pt-3 border-t border-slate-900 mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <span className="text-[11px] text-slate-500 font-mono truncate max-w-[180px]">
                              {isStorage ? (res.fileName || 'Storage File') : res.url.replace(/^https?:\/\//, '')}
                            </span>

                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleToggleResource(res.id)}
                                disabled={togglingResourceId === res.id}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer ${
                                  isCompleted
                                    ? 'bg-emerald-950/90 border-emerald-700/80 text-emerald-300 hover:bg-emerald-900/80'
                                    : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:border-slate-600'
                                }`}
                              >
                                {togglingResourceId === res.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : isCompleted ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Square className="w-3.5 h-3.5 text-slate-400" />
                                )}
                                <span>{isCompleted ? 'Completed' : 'Mark as Complete'}</span>
                              </button>

                              <a
                                href={res.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 rounded-xl transition-all shadow-md shadow-cyan-400/20 inline-flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                              >
                                {isStorage ? (
                                  <>
                                    <Download className="w-3.5 h-3.5" />
                                    <span>Download</span>
                                  </>
                                ) : (
                                  <>
                                    {getActionIcon(res.type)}
                                    <span>{getActionLabel(res.type)}</span>
                                  </>
                                )}
                              </a>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
