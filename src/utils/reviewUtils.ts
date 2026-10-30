import { CourseReview, CourseRatingStats } from '../types';

/**
 * Deterministic review document ID enforcing one review per trainee per course.
 */
export function generateReviewDocId(courseId: string, traineeId: string): string {
  if (!courseId || !traineeId) {
    throw new Error('Both courseId and traineeId are required to generate review document ID');
  }
  return `${courseId}_${traineeId}`;
}

export interface ReviewValidationParams {
  rating: number;
  reviewText: string;
  isEnrolled?: boolean;
  courseStatus?: string;
  isCourseTrainer?: boolean;
  userRole?: string;
  isAuthenticated?: boolean;
}

export interface ReviewValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates review input and eligibility constraints.
 */
export function validateReviewInput(params: ReviewValidationParams): ReviewValidationResult {
  const {
    rating,
    reviewText,
    isEnrolled,
    courseStatus,
    isCourseTrainer,
    userRole,
    isAuthenticated = true,
  } = params;

  if (!isAuthenticated) {
    return { valid: false, error: 'You must be signed in to submit a course review.' };
  }

  if (userRole && userRole !== 'Trainee') {
    return { valid: false, error: 'Only Trainee accounts are eligible to submit course reviews.' };
  }

  if (isCourseTrainer) {
    return { valid: false, error: 'Trainers are strictly prohibited from reviewing their own courses.' };
  }

  if (courseStatus && courseStatus !== 'published') {
    return { valid: false, error: 'Reviews can only be submitted for published courses.' };
  }

  if (isEnrolled === false) {
    return { valid: false, error: 'You must be actively enrolled in this course to submit a review.' };
  }

  if (
    typeof rating !== 'number' ||
    !Number.isInteger(rating) ||
    rating < 1 ||
    rating > 5
  ) {
    return { valid: false, error: 'Rating must be a whole number between 1 and 5 stars.' };
  }

  if (typeof reviewText !== 'string' || reviewText.trim().length === 0) {
    return { valid: false, error: 'Please enter written feedback about the course.' };
  }

  if (reviewText.length > 500) {
    return {
      valid: false,
      error: `Review text exceeds the 500 character limit (${reviewText.length}/500).`,
    };
  }

  return { valid: true };
}

/**
 * Calculates aggregate rating statistics, average, and star distribution
 * directly from real review records.
 */
export function calculateRatingStats(reviews: CourseReview[]): CourseRatingStats {
  const defaultDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  if (!reviews || !Array.isArray(reviews) || reviews.length === 0) {
    return {
      averageRating: 0,
      totalReviews: 0,
      distribution: defaultDistribution,
    };
  }

  let totalValidReviews = 0;
  let totalRatingSum = 0;
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  for (const review of reviews) {
    if (!review) continue;
    const rating = Math.round(review.rating);
    if (rating >= 1 && rating <= 5) {
      distribution[rating as 1 | 2 | 3 | 4 | 5] = (distribution[rating as 1 | 2 | 3 | 4 | 5] || 0) + 1;
      totalRatingSum += rating;
      totalValidReviews += 1;
    }
  }

  if (totalValidReviews === 0) {
    return {
      averageRating: 0,
      totalReviews: 0,
      distribution,
    };
  }

  // Round to 1 decimal place (e.g. 4.7)
  const averageRating = Math.round((totalRatingSum / totalValidReviews) * 10) / 10;

  return {
    averageRating,
    totalReviews: totalValidReviews,
    distribution,
  };
}

/**
 * Formats a Firestore timestamp or Date object into human-readable date.
 */
export function formatReviewDate(timestamp: any): string {
  if (!timestamp) return 'Recently';

  try {
    let date: Date;
    if (timestamp instanceof Date) {
      date = timestamp;
    } else if (typeof timestamp.toDate === 'function') {
      date = timestamp.toDate();
    } else if (typeof timestamp.seconds === 'number') {
      date = new Date(timestamp.seconds * 1000);
    } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
      date = new Date(timestamp);
    } else {
      return 'Recently';
    }

    if (isNaN(date.getTime())) return 'Recently';

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return 'Recently';
  }
}
