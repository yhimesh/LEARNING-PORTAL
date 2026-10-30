import { useState, useEffect, useMemo, useCallback } from 'react';
import { Course, CourseReview, CourseRatingStats, AuthModalMode } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  getCourseReviews,
  getTraineeReview,
  submitCourseReview,
  deleteCourseReview,
  subscribeToCourseReviews,
} from '../services/reviewService';
import {
  calculateRatingStats,
  formatReviewDate,
  validateReviewInput,
} from '../utils/reviewUtils';
import {
  Star,
  MessageSquare,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Trash2,
  Edit3,
  User,
  GraduationCap,
  ShieldAlert,
} from 'lucide-react';

interface CourseReviewsSectionProps {
  course: Course;
  isEnrolled: boolean;
  onOpenAuth?: (mode: AuthModalMode) => void;
  onReviewsUpdated?: () => void;
}

export function CourseReviewsSection({
  course,
  isEnrolled,
  onOpenAuth,
  onReviewsUpdated,
}: CourseReviewsSectionProps) {
  const { currentUser, userProfile } = useAuth();

  const [reviews, setReviews] = useState<CourseReview[]>([]);
  const [stats, setStats] = useState<CourseRatingStats>({
    averageRating: course.averageRating || 0,
    totalReviews: course.reviewCount || 0,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  });
  const [loading, setLoading] = useState(true);

  // Trainee's existing review state
  const [existingReview, setExistingReview] = useState<CourseReview | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form input state
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [reviewText, setReviewText] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isTrainee = userProfile?.requestedRole === 'Trainee';
  const isActiveTrainee = isTrainee && userProfile?.accountStatus === 'active';
  const isCourseTrainer = Boolean(currentUser && course.trainerId === currentUser.uid);
  const isPublished = course.status === 'published';

  // Can this user submit a review?
  const canSubmitReview = Boolean(
    currentUser &&
    isActiveTrainee &&
    isEnrolled &&
    isPublished &&
    !isCourseTrainer
  );

  // Subscribe to real-time reviews for this course
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const unsubscribe = subscribeToCourseReviews(course.id, (incomingReviews, incomingStats) => {
      if (!isMounted) return;
      setReviews(incomingReviews);
      setStats(incomingStats);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [course.id]);

  // Load trainee's existing review if authenticated
  const loadTraineeExistingReview = useCallback(async () => {
    if (!currentUser || !isActiveTrainee) {
      setExistingReview(null);
      setIsEditing(false);
      return;
    }

    try {
      const myReview = await getTraineeReview(course.id, currentUser.uid);
      setExistingReview(myReview);
      if (myReview) {
        setRating(myReview.rating);
        setReviewText(myReview.reviewText);
      } else {
        setRating(5);
        setReviewText('');
      }
    } catch (err) {
      console.warn('Notice loading trainee review:', err);
    }
  }, [course.id, currentUser, isActiveTrainee]);

  useEffect(() => {
    loadTraineeExistingReview();
  }, [loadTraineeExistingReview]);

  // Handle Review Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      if (onOpenAuth) onOpenAuth('signin');
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    // Validate inputs
    const validation = validateReviewInput({
      rating,
      reviewText,
      isEnrolled,
      courseStatus: course.status,
      isCourseTrainer,
      userRole: userProfile?.requestedRole,
      isAuthenticated: Boolean(currentUser),
    });

    if (!validation.valid) {
      setErrorMessage(validation.error || 'Please correct the highlighted issues.');
      return;
    }

    setSubmitting(true);
    try {
      const displayName = userProfile?.fullName || currentUser.displayName || 'Enrolled Learner';
      const saved = await submitCourseReview({
        courseId: course.id,
        courseTitle: course.title,
        traineeId: currentUser.uid,
        traineeName: displayName,
        rating,
        reviewText: reviewText.trim(),
      });

      setExistingReview(saved);
      setIsEditing(false);
      setSuccessMessage(
        existingReview ? 'Your review has been updated.' : 'Thank you! Your review has been published.'
      );
      if (onReviewsUpdated) onReviewsUpdated();

      // Clear success alert after 4 seconds
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Failed to submit review:', err);
      setErrorMessage(err?.message || 'Unable to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Review Deletion
  const handleDelete = async () => {
    if (!currentUser || !existingReview) return;

    setDeleting(true);
    setErrorMessage(null);
    try {
      await deleteCourseReview(course.id, currentUser.uid);
      setExistingReview(null);
      setIsEditing(false);
      setRating(5);
      setReviewText('');
      setShowDeleteConfirm(false);
      setSuccessMessage('Your review has been removed.');
      if (onReviewsUpdated) onReviewsUpdated();

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Failed to delete review:', err);
      setErrorMessage(err?.message || 'Failed to delete review.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 pt-6 border-t border-slate-800">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-cyan-400" />
            <span>Course Ratings & Reviews</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Real feedback and ratings submitted by enrolled trainees who have taken this module.
          </p>
        </div>

        {stats.totalReviews > 0 && (
          <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
            <div className="flex items-center gap-1 text-amber-400">
              <Star className="w-4 h-4 fill-amber-400" />
              <span className="text-base font-extrabold text-white">{stats.averageRating.toFixed(1)}</span>
            </div>
            <span className="text-xs text-slate-400">
              ({stats.totalReviews} {stats.totalReviews === 1 ? 'review' : 'reviews'})
            </span>
          </div>
        )}
      </div>

      {/* Ratings Overview & Star Distribution Card */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
        {/* Left Column: Big Average Score */}
        <div className="md:col-span-5 flex flex-col items-center justify-center p-4 border-b md:border-b-0 md:border-r border-slate-800 text-center">
          <div className="text-4xl sm:text-5xl font-black text-white tracking-tight">
            {stats.totalReviews > 0 ? stats.averageRating.toFixed(1) : '—'}
          </div>
          <div className="flex items-center gap-1 my-2">
            {[1, 2, 3, 4, 5].map((starIdx) => {
              const isFilled = stats.totalReviews > 0 && starIdx <= Math.round(stats.averageRating);
              return (
                <Star
                  key={starIdx}
                  className={`w-4 h-4 ${
                    isFilled ? 'text-amber-400 fill-amber-400' : 'text-slate-700'
                  }`}
                />
              );
            })}
          </div>
          <p className="text-xs font-medium text-slate-400">
            {stats.totalReviews === 0
              ? 'No ratings yet'
              : `Based on ${stats.totalReviews} student ${stats.totalReviews === 1 ? 'review' : 'reviews'}`}
          </p>
        </div>

        {/* Right Column: 1-5 Star Distribution Bars */}
        <div className="md:col-span-7 flex flex-col justify-center space-y-1.5">
          {[5, 4, 3, 2, 1].map((starLevel) => {
            const count = stats.distribution[starLevel as 1 | 2 | 3 | 4 | 5] || 0;
            const percentage = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;

            return (
              <div key={starLevel} className="flex items-center gap-3 text-xs">
                <span className="w-10 text-slate-400 font-medium flex items-center justify-end gap-1">
                  <span>{starLevel}</span>
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                </span>

                <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-amber-300 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                <span className="w-8 text-right text-slate-400 text-[11px] font-mono">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Trainee Review Form or Eligibility Notice */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5">
        {!currentUser ? (
          /* Unauthenticated state */
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-950/60 border border-cyan-800/60 flex items-center justify-center text-cyan-400 shrink-0">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Share Your Experience</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Sign in with an active Trainee account to rate and review this course.
                </p>
              </div>
            </div>
            {onOpenAuth && (
              <button
                type="button"
                onClick={() => onOpenAuth('signin')}
                className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-xl transition-colors shadow-md shadow-cyan-400/20 shrink-0 cursor-pointer"
              >
                Sign In to Review
              </button>
            )}
          </div>
        ) : isCourseTrainer ? (
          /* Trainer cannot review own course */
          <div className="flex items-start gap-3 py-1 text-xs text-amber-300/90">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white">Course Faculty Instructor Notice</p>
              <p className="text-slate-400 mt-0.5">
                Trainers are restricted from rating or reviewing courses they instruct to maintain impartial course evaluations.
              </p>
            </div>
          </div>
        ) : !isEnrolled ? (
          /* Non-enrolled user */
          <div className="flex items-start gap-3 py-1 text-xs text-slate-300">
            <AlertCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white">Enrollment Required to Review</p>
              <p className="text-slate-400 mt-0.5">
                Only students actively enrolled in this course can rate and submit feedback. Enroll above to unlock course reviews.
              </p>
            </div>
          </div>
        ) : !isPublished ? (
          /* Unpublished course */
          <div className="flex items-start gap-3 py-1 text-xs text-slate-400">
            <AlertCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <p>Reviews are disabled because this course is currently not published.</p>
          </div>
        ) : existingReview && !isEditing ? (
          /* Trainee has already reviewed and is viewing their review */
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Your Review</span>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>

                {!showDeleteConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                    title="Delete your review"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 bg-rose-950/60 border border-rose-800/80 px-2.5 py-1 rounded-lg">
                    <span className="text-[11px] text-rose-300 font-medium">Delete?</span>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={deleting}
                      className="text-[11px] font-bold text-rose-400 hover:text-rose-300 underline disabled:opacity-50"
                    >
                      {deleting ? 'Deleting...' : 'Yes'}
                    </button>
                    <span className="text-slate-600">·</span>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="text-[11px] text-slate-400 hover:text-slate-200"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((starIdx) => (
                <Star
                  key={starIdx}
                  className={`w-4 h-4 ${
                    starIdx <= existingReview.rating
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-slate-700'
                  }`}
                />
              ))}
              <span className="text-xs font-semibold text-white ml-1">
                {existingReview.rating} out of 5
              </span>
              <span className="text-slate-600 mx-1">·</span>
              <span className="text-xs text-slate-400">
                {formatReviewDate(existingReview.updatedAt || existingReview.createdAt)}
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/70">
              {existingReview.reviewText}
            </p>
          </div>
        ) : (
          /* Write / Edit Review Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>{existingReview ? 'Edit Your Course Review' : 'Rate & Review This Course'}</span>
              </h4>

              {isEditing && (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    if (existingReview) {
                      setRating(existingReview.rating);
                      setReviewText(existingReview.reviewText);
                    }
                  }}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
              )}
            </div>

            {/* Interactive Star Selector */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Your Rating (1 to 5 stars)
              </label>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1" role="radiogroup" aria-label="Course rating selection">
                  {[1, 2, 3, 4, 5].map((starIdx) => {
                    const activeLevel = hoverRating || rating;
                    const isFilled = starIdx <= activeLevel;

                    return (
                      <button
                        key={starIdx}
                        type="button"
                        role="radio"
                        aria-checked={rating === starIdx}
                        onClick={() => setRating(starIdx)}
                        onMouseEnter={() => setHoverRating(starIdx)}
                        onMouseLeave={() => setHoverRating(0)}
                        aria-label={`Rate ${starIdx} star${starIdx > 1 ? 's' : ''}`}
                        className="p-1 rounded-md hover:bg-slate-800 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                      >
                        <Star
                          className={`w-6 h-6 transition-transform ${
                            isFilled
                              ? 'text-amber-400 fill-amber-400 scale-110'
                              : 'text-slate-600 hover:text-slate-400'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
                <span className="text-xs font-semibold text-slate-300 ml-2">
                  {rating === 1 && '1 Star · Needs Improvement'}
                  {rating === 2 && '2 Stars · Fair'}
                  {rating === 3 && '3 Stars · Good'}
                  {rating === 4 && '4 Stars · Very Good'}
                  {rating === 5 && '5 Stars · Excellent'}
                </span>
              </div>
            </div>

            {/* Written Review Textarea */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="course-review-input" className="text-xs font-semibold text-slate-300">
                  Written Feedback
                </label>
                <span
                  className={`text-[11px] font-mono ${
                    reviewText.length > 480
                      ? 'text-rose-400 font-bold'
                      : reviewText.length > 400
                      ? 'text-amber-400'
                      : 'text-slate-500'
                  }`}
                >
                  {reviewText.length}/500
                </span>
              </div>
              <textarea
                id="course-review-input"
                rows={3}
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value.slice(0, 500))}
                placeholder="What did you think of the material, instructor explanations, pacing, and practical exercises? Help prospective learners understand what to expect..."
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent resize-y"
              />
            </div>

            {/* Error & Success alerts */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-xs text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-xs text-emerald-300 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Action Bar */}
            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 disabled:opacity-50 rounded-xl transition-all shadow-md shadow-cyan-400/20 flex items-center gap-1.5 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving Review...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{existingReview ? 'Update Review' : 'Submit Review'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Reviews Feed */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Learner Reviews ({reviews.length})
          </h4>
          <span className="text-[11px] text-slate-500">Sorted by newest</span>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <Loader2 className="w-5 h-5 text-cyan-400 animate-spin mx-auto" />
            <p className="text-xs text-slate-400 mt-2">Loading course reviews...</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-10 px-4 bg-slate-900/40 rounded-2xl border border-slate-800/70 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 mx-auto">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h5 className="text-sm font-bold text-white">No reviews yet</h5>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
              Be the first enrolled trainee to share feedback and help other learners decide on this course!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((rev) => {
              const isMyReview = Boolean(currentUser && rev.traineeId === currentUser.uid);

              return (
                <div
                  key={rev.id}
                  className={`p-4 rounded-xl border transition-colors ${
                    isMyReview
                      ? 'bg-slate-900/90 border-cyan-800/60 shadow-sm shadow-cyan-950/30'
                      : 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700/80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 text-xs font-bold shrink-0">
                        {rev.traineeName ? rev.traineeName.charAt(0).toUpperCase() : <User className="w-3.5 h-3.5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-white">
                            {rev.traineeName || 'Enrolled Learner'}
                          </span>
                          {isMyReview && (
                            <span className="text-[10px] font-bold text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded-full border border-cyan-800/60">
                              You
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {formatReviewDate(rev.updatedAt || rev.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Star Rating Badge */}
                    <div className="flex items-center gap-1 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 shrink-0">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      <span className="text-xs font-bold text-white">{rev.rating}</span>
                      <span className="text-[10px] text-slate-500">/ 5</span>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-300 mt-2.5 leading-relaxed break-words">
                    {rev.reviewText}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
