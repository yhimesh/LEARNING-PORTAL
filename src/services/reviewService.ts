import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  setDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { CourseReview, CourseRatingStats } from '../types';
import { generateReviewDocId, calculateRatingStats } from '../utils/reviewUtils';

export interface SubmitReviewParams {
  courseId: string;
  courseTitle?: string;
  traineeId: string;
  traineeName: string;
  rating: number;
  reviewText: string;
}

/**
 * Fetch all published reviews for a specific course
 */
export async function getCourseReviews(courseId: string): Promise<CourseReview[]> {
  if (!courseId) return [];

  const path = 'courseReviews';
  try {
    const q = query(collection(db, path), where('courseId', '==', courseId));
    const snapshot = await getDocs(q);

    const reviews: CourseReview[] = [];
    snapshot.forEach((d) => {
      const data = d.data();
      reviews.push({
        id: d.id,
        courseId: data.courseId,
        courseTitle: data.courseTitle,
        traineeId: data.traineeId,
        traineeName: data.traineeName || 'Enrolled Learner',
        rating: data.rating,
        reviewText: data.reviewText,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      });
    });

    // Sort newest first
    reviews.sort((a, b) => {
      const timeA = a.updatedAt?.seconds || a.createdAt?.seconds || 0;
      const timeB = b.updatedAt?.seconds || b.createdAt?.seconds || 0;
      return timeB - timeA;
    });

    return reviews;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

/**
 * Fetch a trainee's existing review for a course (deterministic document ID lookup)
 */
export async function getTraineeReview(
  courseId: string,
  traineeId: string
): Promise<CourseReview | null> {
  if (!courseId || !traineeId) return null;

  const docId = generateReviewDocId(courseId, traineeId);
  const path = `courseReviews/${docId}`;

  try {
    const docRef = doc(db, 'courseReviews', docId);
    const snap = await getDoc(docRef);

    if (!snap.exists()) return null;

    const data = snap.data();
    return {
      id: snap.id,
      courseId: data.courseId,
      courseTitle: data.courseTitle,
      traineeId: data.traineeId,
      traineeName: data.traineeName || 'Enrolled Learner',
      rating: data.rating,
      reviewText: data.reviewText,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

/**
 * Submit or edit a course review.
 * Tries the authoritative server-side endpoint first (which validates eligibility and updates
 * aggregate course rating fields atomically), and falls back to direct authenticated Firestore write.
 */
export async function submitCourseReview(params: SubmitReviewParams): Promise<CourseReview> {
  const { courseId, courseTitle, traineeId, traineeName, rating, reviewText } = params;

  if (!courseId || !traineeId) {
    throw new Error('Course and Trainee IDs are required to submit a review.');
  }

  // 1. Attempt authoritative backend API call
  try {
    const response = await fetch(`/api/courses/${courseId}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        courseId,
        courseTitle,
        traineeId,
        traineeName,
        rating,
        reviewText,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.review;
    }
    // If backend returned a 4xx validation error, bubble it up to user
    if (response.status >= 400 && response.status < 500) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || 'Review submission failed eligibility checks.');
    }
  } catch (err: any) {
    // If it's an explicit validation error from backend, rethrow it
    if (err?.message && !err.message.includes('fetch') && !err.message.includes('NetworkError')) {
      throw err;
    }
    // Otherwise fallback to client Firestore SDK
    console.warn('Backend endpoint unavailable, using direct Firestore mutation:', err);
  }

  // 2. Client-side fallback using Firestore SDK with deterministic key
  const docId = generateReviewDocId(courseId, traineeId);
  const path = `courseReviews/${docId}`;
  const docRef = doc(db, 'courseReviews', docId);

  try {
    const existingSnap = await getDoc(docRef);
    const isUpdate = existingSnap.exists();

    const payload: any = {
      id: docId,
      courseId,
      traineeId,
      traineeName: traineeName.trim(),
      rating,
      reviewText: reviewText.trim(),
      updatedAt: serverTimestamp(),
    };

    if (courseTitle) payload.courseTitle = courseTitle;

    if (!isUpdate) {
      payload.createdAt = serverTimestamp();
    } else {
      payload.createdAt = existingSnap.data()?.createdAt || serverTimestamp();
    }

    await setDoc(docRef, payload, { merge: true });

    return {
      ...payload,
      createdAt: isUpdate ? existingSnap.data()?.createdAt : new Date(),
      updatedAt: new Date(),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

/**
 * Delete a trainee's review.
 * Tries server-side authoritative endpoint first, falls back to direct Firestore deletion.
 */
export async function deleteCourseReview(courseId: string, traineeId: string): Promise<void> {
  if (!courseId || !traineeId) return;

  // 1. Attempt authoritative backend API call
  try {
    const response = await fetch(`/api/courses/${courseId}/reviews/${traineeId}`, {
      method: 'DELETE',
    });
    if (response.ok) return;
  } catch (err) {
    console.warn('Backend review deletion unavailable, using direct Firestore deletion:', err);
  }

  // 2. Direct Firestore deletion
  const docId = generateReviewDocId(courseId, traineeId);
  const path = `courseReviews/${docId}`;
  try {
    const docRef = doc(db, 'courseReviews', docId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Real-time listener for reviews on a specific course.
 */
export function subscribeToCourseReviews(
  courseId: string,
  onReviewsUpdate: (reviews: CourseReview[], stats: CourseRatingStats) => void
): () => void {
  if (!courseId) return () => {};

  const path = 'courseReviews';
  const q = query(collection(db, path), where('courseId', '==', courseId));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const reviews: CourseReview[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        reviews.push({
          id: d.id,
          courseId: data.courseId,
          courseTitle: data.courseTitle,
          traineeId: data.traineeId,
          traineeName: data.traineeName || 'Enrolled Learner',
          rating: data.rating,
          reviewText: data.reviewText,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
      });

      // Sort newest first
      reviews.sort((a, b) => {
        const timeA = a.updatedAt?.seconds || a.createdAt?.seconds || 0;
        const timeB = b.updatedAt?.seconds || b.createdAt?.seconds || 0;
        return timeB - timeA;
      });

      const stats = calculateRatingStats(reviews);
      onReviewsUpdate(reviews, stats);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );

  return unsubscribe;
}
