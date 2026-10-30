import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Course, Assessment, AssessmentAttempt } from '../types';
import { getTrainerCourses } from '../services/courseService';
import {
  User as UserIcon,
  CheckCircle2,
  Clock,
  BookOpen,
  LogOut,
  ShieldCheck,
  GraduationCap,
  Briefcase,
  AlertTriangle,
  Sparkles,
  Plus,
  Loader2,
  Database,
  Check,
  LifeBuoy,
} from 'lucide-react';
import { MyCourses } from './MyCourses';
import { TrainerResources } from './TrainerResources';
import { TrainerAssessments } from './TrainerAssessments';
import { TraineeAssessments } from './TraineeAssessments';
import { TraineeResults } from './TraineeResults';
import { TrainerResults } from './TrainerResults';
import { TrainerProgress } from './TrainerProgress';
import { TrainerAnalytics } from './TrainerAnalytics';
import { AdminAnalytics } from './AdminAnalytics';
import { RecommendedCoursesSection } from './RecommendedCoursesSection';
import { getTraineeEnrollments } from '../services/enrollmentService';
import { Enrollment } from '../types';

interface UserDashboardProps {
  allCourses?: Course[];
  onExploreCourses: () => void;
  onOpenCreateCourse?: () => void;
  onSeedCourses?: () => Promise<void>;
  onViewCourseDetails?: (courseId: string) => void;
  onOpenClassroom?: (courseId: string) => void;
  onStartQuiz?: (assessment: Assessment, attempt: AssessmentAttempt) => void;
  onOpenMyTickets?: () => void;
  refreshEnrollmentsTrigger?: number;
}

export function UserDashboard({
  allCourses,
  onExploreCourses,
  onOpenCreateCourse,
  onSeedCourses,
  onViewCourseDetails,
  onOpenClassroom,
  onStartQuiz,
  onOpenMyTickets,
  refreshEnrollmentsTrigger,
}: UserDashboardProps) {

  const { currentUser, userProfile, logoutUser } = useAuth();
  const [seeding, setSeeding] = useState(false);
  const [trainerCourses, setTrainerCourses] = useState<Course[]>([]);
  const [traineeEnrollments, setTraineeEnrollments] = useState<Enrollment[]>([]);

  const role = userProfile?.requestedRole || 'Trainee';
  const status = userProfile?.accountStatus || 'active';
  const displayName = userProfile?.fullName || currentUser?.displayName || 'Learner';
  const isAdmin =
    currentUser?.email === 'yhimeshc@gmail.com' ||
    currentUser?.email === 'admin@capacityconnect.edu';

  const isApprovedTrainerOrAdmin =
    (role === 'Trainer' && status === 'active') ||
    isAdmin;

  const loadTrainerCourses = useCallback(async () => {
    if (!currentUser || !isApprovedTrainerOrAdmin) return;
    try {
      const courses = await getTrainerCourses(currentUser.uid);
      setTrainerCourses(courses);
    } catch (err) {
      console.error('Failed to load trainer courses:', err);
    }
  }, [currentUser, isApprovedTrainerOrAdmin]);

  useEffect(() => {
    loadTrainerCourses();
  }, [loadTrainerCourses, refreshEnrollmentsTrigger]);

  // Load trainee enrollments for personalized course recommendations
  useEffect(() => {
    if (!currentUser || role !== 'Trainee') {
      setTraineeEnrollments([]);
      return;
    }
    let isMounted = true;
    getTraineeEnrollments(currentUser.uid)
      .then((enrollments) => {
        if (isMounted) {
          setTraineeEnrollments(enrollments);
        }
      })
      .catch((err) => {
        console.warn('Failed to load trainee enrollments for recommendations:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [currentUser, role, refreshEnrollmentsTrigger]);

  if (!currentUser) return null;


  const handleSeed = async () => {
    if (!onSeedCourses) return;
    setSeeding(true);
    try {
      await onSeedCourses();
      await loadTrainerCourses();
    } finally {
      setSeeding(false);
    }
  };



  return (
    <section id="dashboard" className="bg-slate-950 text-slate-100 py-12 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 lg:p-10 shadow-2xl relative overflow-hidden">
          {/* Subtle background ambient blur */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-20 -right-20 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl"
          />

          <div className="relative z-10">
            {/* Header Lockup */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-slate-800">
              <div className="flex items-start sm:items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center text-cyan-400 shrink-0 shadow-lg shadow-cyan-950/40">
                  {role === 'Trainer' ? (
                    <Briefcase className="w-7 h-7" />
                  ) : (
                    <GraduationCap className="w-7 h-7" />
                  )}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-cyan-950/70 border border-cyan-800/50 text-cyan-400 font-mono">
                      Role: {role}
                    </span>
                    {isAdmin && (
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-950/80 border border-indigo-700/60 text-indigo-300 flex items-center gap-1 font-mono">
                        <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Platform Administrator</span>
                      </span>
                    )}
                    {status === 'active' ? (
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-800/50 text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Active Account</span>
                      </span>
                    ) : (
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-950/70 border border-amber-800/50 text-amber-300 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>Pending Admin Approval</span>
                      </span>
                    )}
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    Welcome back, {displayName}!
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                    Logged in as <span className="text-slate-300">{currentUser.email}</span>
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-3">
                {isApprovedTrainerOrAdmin && onOpenCreateCourse && (
                  <button
                    type="button"
                    onClick={onOpenCreateCourse}
                    className="px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 rounded-xl transition-all shadow-md shadow-cyan-400/20 flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Course</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onExploreCourses}
                  className="px-4 py-2.5 text-xs sm:text-sm font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-xl transition-colors flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Browse Catalogue</span>
                </button>

                <button
                  type="button"
                  onClick={logoutUser}
                  className="px-4 py-2.5 text-xs sm:text-sm font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-xl transition-colors flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>

            {/* Pending Trainer Notice Banner if applicable */}
            {role === 'Trainer' && status === 'pending' && (
              <div className="mt-6 p-4 rounded-2xl bg-amber-950/40 border border-amber-800/60 text-slate-200 text-xs sm:text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-semibold text-amber-300">
                      Trainer Profile Verification Pending
                    </div>
                    <p className="text-slate-300 leading-relaxed">
                      Thank you for applying to be a trainer on CAPACITY CONNECT. Your account has been registered with status <span className="font-semibold text-amber-300">pending</span>. A designated portal administrator will review and verify your faculty credentials before granting curriculum authoring privileges.
                    </p>
                  </div>
                </div>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      document.getElementById('admin-analytics-section')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-colors shrink-0 shadow-md shadow-amber-950/40 flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Review in Admin Section</span>
                  </button>
                )}
              </div>
            )}


            {/* Approved Trainer Tool Banner */}
            {isApprovedTrainerOrAdmin && (
              <div className="mt-6 p-4 rounded-2xl bg-cyan-950/40 border border-cyan-800/60 text-slate-200 text-xs sm:text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-cyan-300">
                      Approved Trainer Privileges Active
                    </div>
                    <p className="text-slate-300 text-xs mt-0.5">
                      You have authorized permissions to publish courses directly to Cloud Firestore.
                    </p>
                  </div>
                </div>

                {onSeedCourses && (
                  <button
                    type="button"
                    onClick={handleSeed}
                    disabled={seeding}
                    className="px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
                  >
                    {seeding ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Seeding Courses...</span>
                      </>
                    ) : (
                      <>
                        <Database className="w-3.5 h-3.5" />
                        <span>Seed 6 Foundation Courses</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* Active Trainee Welcome Banner */}
            {role === 'Trainee' && status === 'active' && (
              <div className="mt-6 p-4 rounded-2xl bg-cyan-950/30 border border-cyan-800/50 text-slate-200 text-xs sm:text-sm flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-semibold text-cyan-300">
                    Trainee Account Active
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Your student learner profile is active. You can browse foundational disciplines from Cloud Firestore, explore detailed syllabi, and track your upcoming skill milestones.
                  </p>
                </div>
              </div>
            )}

            {/* Grid of Profile Information & Milestone Cards */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span className="font-semibold text-slate-300 uppercase tracking-wider">
                    Profile Data
                  </span>
                  <UserIcon className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="space-y-1.5 text-xs sm:text-sm">
                  <div className="text-white font-medium">{displayName}</div>
                  <div className="text-slate-400 truncate">{currentUser.email}</div>
                  <div className="text-[11px] text-cyan-400 font-mono pt-1">
                    UID: {currentUser.uid.slice(0, 12)}...
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span className="font-semibold text-slate-300 uppercase tracking-wider">
                    Security & Cloud Auth
                  </span>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="space-y-1 text-xs text-slate-300">
                  <div className="flex justify-between py-0.5">
                    <span className="text-slate-400">Auth Provider:</span>
                    <span className="font-mono text-cyan-300">password</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-slate-400">Firestore Rules:</span>
                    <span className="font-mono text-emerald-400">RBAC Enforced</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-slate-400">Database:</span>
                    <span className="text-emerald-400">Cloud Firestore</span>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span className="font-semibold text-slate-300 uppercase tracking-wider">
                    Enrollment Status
                  </span>
                  <BookOpen className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="text-xs text-slate-300 space-y-1.5">
                  <p>
                    Trainee Course Enrollment active with deterministic Firestore keys and duplicate enrollment protection.
                  </p>
                </div>
              </div>
            </div>

            {/* Stage 9.2: Support Ticket Desk Quick Access Banner */}
            <div className="mt-6 p-5 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center text-cyan-400 shrink-0">
                  <LifeBuoy className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Student & Faculty Support Desk</h4>
                  <p className="text-xs text-slate-400 mt-0.5 max-w-xl">
                    Need assistance with course enrollment, quiz submissions, or account verification? Submit inquiries and converse directly with faculty administrators.
                  </p>
                </div>
              </div>

              {onOpenMyTickets && (
                <button
                  type="button"
                  onClick={onOpenMyTickets}
                  className="px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-xl transition-colors shadow-md shadow-cyan-400/20 flex items-center gap-2 shrink-0 whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                >
                  <LifeBuoy className="w-3.5 h-3.5" />
                  <span>My Support Tickets</span>
                </button>
              )}
            </div>

            {/* Stage 4.1: Learning Resources for Approved Trainers */}
            {isApprovedTrainerOrAdmin && (
              <TrainerResources
                trainerId={currentUser.uid}
                trainerCourses={trainerCourses}
                onOpenCreateCourse={onOpenCreateCourse}
              />
            )}

            {/* Stage 5.1: Trainer Assessment and Quiz Creation */}
            {isApprovedTrainerOrAdmin && (
              <TrainerAssessments
                trainerId={currentUser.uid}
                trainerName={userProfile?.fullName || currentUser.displayName || 'Faculty Instructor'}
                trainerCourses={trainerCourses}
                onOpenCreateCourse={onOpenCreateCourse}
              />
            )}

            {/* Stage 5.3: Trainer Assessment Results & Gradebook */}
            {isApprovedTrainerOrAdmin && (
              <TrainerResults
                courses={trainerCourses}
                trainerId={currentUser.uid}
              />
            )}

            {/* Stage 6.1: Course Progress Tracking for Trainer */}
            {isApprovedTrainerOrAdmin && (
              <TrainerProgress
                courses={trainerCourses}
                trainerId={currentUser.uid}
              />
            )}

            {/* Stage 6.2: Trainer Analytics Dashboard */}
            {isApprovedTrainerOrAdmin && (
              <TrainerAnalytics
                trainerId={currentUser.uid}
                courses={trainerCourses}
                onOpenCreateCourse={onOpenCreateCourse}
                onViewCourseDetails={onViewCourseDetails}
              />
            )}

            {/* Stage 6.3: Admin Platform Analytics Dashboard */}
            {isAdmin && (
              <div id="admin-analytics-section">
                <AdminAnalytics
                  onViewCourseDetails={onViewCourseDetails}
                  onExploreCourses={onExploreCourses}
                  onOpenCreateCourse={onOpenCreateCourse}
                />
              </div>
            )}

            {/* My Courses Section for Trainees */}
            {role === 'Trainee' && (
              <MyCourses
                traineeId={currentUser.uid}
                onViewCourse={onViewCourseDetails || onExploreCourses}
                onOpenClassroom={onOpenClassroom}
                onExploreCatalogue={onExploreCourses}
                refreshTrigger={refreshEnrollmentsTrigger}
              />
            )}

            {/* Stage 8.2: Personalized Course Recommendations */}
            {role === 'Trainee' && (
              <RecommendedCoursesSection
                allCourses={allCourses || []}
                enrolledCoursesOrIds={traineeEnrollments}
                onViewCourse={(c) => {
                  if (onViewCourseDetails) {
                    onViewCourseDetails(c.id);
                  } else {
                    onExploreCourses();
                  }
                }}
              />
            )}

            {/* Stage 5.2: Quizzes & Checkpoints for Trainees */}
            {role === 'Trainee' && (
              <TraineeAssessments
                traineeId={currentUser.uid}
                traineeName={displayName}
                onStartQuiz={(assessment, attempt) => {
                  if (onStartQuiz) onStartQuiz(assessment, attempt);
                }}
                onExploreCourses={onExploreCourses}
                refreshTrigger={refreshEnrollmentsTrigger}
              />
            )}

            {/* Stage 5.3: Trainee Assessment Results */}
            {role === 'Trainee' && (
              <TraineeResults
                traineeId={currentUser.uid}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
