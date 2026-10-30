import { useEffect, useState, useCallback } from 'react';
import { Course, AuthModalMode } from '../types';
import {
  X,
  Clock,
  User,
  ArrowLeft,
  CheckCircle2,
  BookOpen,
  Layers,
  ShieldCheck,
  AlertCircle,
  Loader2,
  GraduationCap,
  Sparkles,
  Star,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { checkIsEnrolled, enrollInCourse } from '../services/enrollmentService';
import { createNotification } from '../services/notificationService';
import { sendEmailNotification } from '../services/emailService';
import { CourseReviewsSection } from './CourseReviewsSection';

interface CourseModalProps {
  course: Course | null;
  onClose: () => void;
  onOpenAuth: (mode: AuthModalMode) => void;
  onEnrollmentSuccess?: () => void;
  onOpenClassroom?: (courseId: string) => void;
}

export function CourseModal({
  course,
  onClose,
  onOpenAuth,
  onEnrollmentSuccess,
  onOpenClassroom,
}: CourseModalProps) {

  const { currentUser, userProfile } = useAuth();

  const [isEnrolled, setIsEnrolled] = useState(false);
  const [checkingEnrollment, setCheckingEnrollment] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [enrollSuccessMessage, setEnrollSuccessMessage] = useState<string | null>(null);

  const isTrainee = userProfile?.requestedRole === 'Trainee';
  const isActive = userProfile?.accountStatus === 'active';
  const isTrainer = userProfile?.requestedRole === 'Trainer';

  // Check enrollment status when course opens
  const verifyEnrollment = useCallback(async () => {
    if (!currentUser || !course || !isTrainee) {
      setIsEnrolled(false);
      setCheckingEnrollment(false);
      return;
    }

    setCheckingEnrollment(true);
    setEnrollError(null);
    try {
      const enrolled = await checkIsEnrolled(currentUser.uid, course.id);
      setIsEnrolled(enrolled);
    } catch (err) {
      console.error('Error checking enrollment state:', err);
    } finally {
      setCheckingEnrollment(false);
    }
  }, [currentUser, course, isTrainee]);

  useEffect(() => {
    if (course) {
      setEnrollError(null);
      setEnrollSuccessMessage(null);
      verifyEnrollment();
    }
  }, [course, verifyEnrollment]);

  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (course) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [course, onClose]);

  if (!course) return null;

  const handleEnroll = async () => {
    if (!currentUser) {
      onOpenAuth('signin');
      return;
    }

    if (!isTrainee) {
      setEnrollError('Only Trainee accounts may enroll in courses. Trainers manage curriculum content.');
      return;
    }

    if (!isActive) {
      setEnrollError('Your account status is currently pending. Please wait for activation before enrolling.');
      return;
    }

    setEnrolling(true);
    setEnrollError(null);
    setEnrollSuccessMessage(null);

    try {
      await enrollInCourse({
        traineeId: currentUser.uid,
        courseId: course.id,
        courseTitle: course.title,
        trainerName: course.trainerName || 'Faculty Instructor',
      });

      setIsEnrolled(true);
      setEnrollSuccessMessage('You have successfully enrolled in this course! Check your dashboard under "My Courses".');
      if (onEnrollmentSuccess) {
        onEnrollmentSuccess();
      }

      // Trigger Trainee enrollment confirmation alert
      try {
        await createNotification({
          id: `enr_${currentUser.uid}_${course.id}`,
          recipientUid: currentUser.uid,
          type: 'enrollment_success',
          title: 'Course Enrollment Confirmed',
          message: `You have successfully enrolled in "${course.title}". Start exploring resources and checkpoints on your dashboard.`,
          relatedEntityId: course.id,
          relatedEntityType: 'course',
        });

        // Trigger Course Trainer notification if trainer exists
        if (course.trainerId && course.trainerId !== currentUser.uid) {
          await createNotification({
            id: `trenr_${currentUser.uid}_${course.id}`,
            recipientUid: course.trainerId,
            type: 'new_enrollment',
            title: 'New Trainee Enrolled',
            message: `${currentUser.displayName || currentUser.email?.split('@')[0] || 'A student'} enrolled in your course "${course.title}".`,
            relatedEntityId: course.id,
            relatedEntityType: 'course',
          });
        }

        // Trigger Trainee course enrollment confirmation email
        if (currentUser.email) {
          sendEmailNotification({
            eventType: 'course_enrolled',
            recipientEmail: currentUser.email,
            recipientName: currentUser.displayName || userProfile?.fullName || currentUser.email.split('@')[0],
            data: {
              courseId: course.id,
              courseTitle: course.title,
              trainerName: course.trainerName || 'Faculty Instructor',
              duration: course.duration,
              category: course.category,
            },
            idempotencyKey: `email_enr_${currentUser.uid}_${course.id}`,
          }).catch((emailErr) => console.warn('Notice: Non-critical email dispatch notice:', emailErr));
        }
      } catch (notifErr) {
        console.warn('Notice: Non-critical alert generation warning:', notifErr);
      }
    } catch (err: unknown) {
      console.error('Enrollment failure:', err);
      const msg = err instanceof Error ? err.message : 'Failed to complete course enrollment. Please verify your connection.';
      setEnrollError(msg);
    } finally {
      setEnrolling(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="course-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-950/80 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-8 text-slate-100 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-800 bg-slate-950/70">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-cyan-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-md px-1 py-0.5 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Courses</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Course Details modal"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          {/* Category & Duration */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <span className="font-semibold text-cyan-400 bg-cyan-950/60 px-2.5 py-1 rounded-md border border-cyan-800/60">
              {course.category}
            </span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <strong className="text-white">{course.duration}</strong> total duration
            </span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="text-slate-400">Level: {course.level}</span>

            {typeof course.averageRating === 'number' && course.averageRating > 0 && (
              <>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span className="flex items-center gap-1 text-amber-400 font-semibold bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-800/40">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  <span>{course.averageRating.toFixed(1)}</span>
                  {typeof course.reviewCount === 'number' && course.reviewCount > 0 && (
                    <span className="text-slate-400 font-normal">({course.reviewCount})</span>
                  )}
                </span>
              </>
            )}
          </div>

          {/* Title */}
          <h2 id="course-modal-title" className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {course.title}
          </h2>

          {/* Course Trainer */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-start sm:items-center gap-3 text-xs sm:text-sm">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-cyan-400 shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider">
                Assigned Instructor
              </div>
              <div className="text-slate-200 font-medium">
                {course.trainerName || 'Faculty Instructor'}
              </div>
            </div>
          </div>

          {/* Full Description */}
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Course Overview
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              {course.fullDescription || course.description}
            </p>
          </div>

          {/* Key Syllabus / Modules */}
          {course.syllabus && course.syllabus.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                <span>Curriculum & Syllabus Modules</span>
              </h3>
              <div className="space-y-2 mt-2">
                {course.syllabus.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-xs sm:text-sm text-slate-300 flex items-start gap-2.5"
                  >
                    <Layers className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Prerequisites */}
          {course.prerequisites && (
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Prerequisites
              </h3>
              <p className="text-xs sm:text-sm text-slate-300">
                {course.prerequisites}
              </p>
            </div>
          )}

          {/* Learning Outcomes */}
          {course.outcomes && course.outcomes.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>Key Competency Outcomes</span>
              </h3>
              <ul className="space-y-2">
                {course.outcomes.map((outcome, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    <span>{outcome}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Success or Error feedback banners */}
          {enrollSuccessMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-800/60 text-xs text-emerald-300 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              <span>{enrollSuccessMessage}</span>
            </div>
          )}

          {enrollError && (
            <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-800/60 text-xs text-rose-300 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
              <span>{enrollError}</span>
            </div>
          )}

          {/* Authentication & Role Info */}
          <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-800/40 text-xs text-cyan-200">
            {currentUser ? (
              <div className="flex items-start gap-2">
                <GraduationCap className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
                <div>
                  <strong>Logged in as:</strong> {userProfile?.fullName || currentUser.email} (
                  <span className="text-cyan-300 font-semibold">{userProfile?.requestedRole || 'Trainee'}</span>
                  ) ·{' '}
                  {isTrainee && isActive && (
                    <span>Account verified and eligible for course enrollment.</span>
                  )}
                  {isTrainer && (
                    <span>Trainer accounts manage course content and cannot register as trainees.</span>
                  )}
                </div>
              </div>
            ) : (
              <span>
                <strong>Trainee Enrollment:</strong> Please sign in with an active Trainee account to enroll in this course and track your learning progress.
              </span>
            )}
          </div>

          {/* Stage 8.3: Course Ratings & Reviews Section */}
          <CourseReviewsSection
            course={course}
            isEnrolled={isEnrolled}
            onOpenAuth={onOpenAuth}
            onReviewsUpdated={onEnrollmentSuccess}
          />
        </div>

        {/* Modal Footer Actions */}
        <div className="p-5 sm:p-6 border-t border-slate-800 bg-slate-950/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 cursor-pointer"
          >
            Back to Courses
          </button>

          {/* Conditional Action Buttons */}
          <div className="w-full sm:w-auto flex items-center justify-end">
            {!currentUser ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAuth('signin');
                }}
                className="w-full sm:w-auto px-5 py-2.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors shadow-md shadow-cyan-400/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Sign In to Enroll</span>
              </button>
            ) : isTrainer ? (
              <div className="text-xs text-amber-300 bg-amber-950/40 border border-amber-800/50 px-3.5 py-2 rounded-lg flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Trainer Account (Enrollment Disabled)</span>
              </div>
            ) : !isActive ? (
              <div className="text-xs text-amber-300 bg-amber-950/40 border border-amber-800/50 px-3.5 py-2 rounded-lg flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Account Pending Verification</span>
              </div>
            ) : checkingEnrollment ? (
              <button
                type="button"
                disabled
                className="w-full sm:w-auto px-5 py-2.5 text-xs font-semibold text-slate-400 bg-slate-800 rounded-lg flex items-center justify-center gap-2"
              >
                <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                <span>Checking Enrollment...</span>
              </button>
            ) : isEnrolled ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3.5 py-2 rounded-lg bg-emerald-950/70 border border-emerald-800/60 text-emerald-400 text-xs font-semibold flex items-center gap-1.5 shadow-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Enrolled</span>
                </span>
                {onOpenClassroom && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenClassroom(course.id);
                    }}
                    className="px-4 py-2 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-all shadow-md shadow-cyan-400/20 flex items-center gap-1.5 cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Go to Classroom & Materials</span>
                  </button>
                )}
              </div>
            ) : (

              <button
                type="button"
                onClick={handleEnroll}
                disabled={enrolling}
                className="w-full sm:w-auto px-6 py-2.5 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 rounded-lg transition-all shadow-lg shadow-cyan-400/25 flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 cursor-pointer disabled:opacity-60"
              >
                {enrolling ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Enrolling in Course...</span>
                  </>
                ) : (
                  <>
                    <GraduationCap className="w-4 h-4 text-slate-950" />
                    <span>Enroll Now</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
