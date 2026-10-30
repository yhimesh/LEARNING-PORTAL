import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Enrollment } from '../types';

/**
 * Generate a deterministic document ID for an enrollment to prevent duplicate registrations.
 * Pattern: `${traineeId}_${courseId}`
 */
export function getEnrollmentDocId(traineeId: string, courseId: string): string {
  if (!traineeId || !courseId) {
    throw new Error('Both traineeId and courseId are required to construct an enrollment key.');
  }
  return `${traineeId}_${courseId}`;
}

export interface EnrollCourseParams {
  traineeId: string;
  courseId: string;
  courseTitle: string;
  trainerName: string;
}

/**
 * Check whether a trainee is already enrolled in a given course
 */
export async function checkIsEnrolled(traineeId: string, courseId: string): Promise<boolean> {
  if (!traineeId || !courseId) return false;
  try {
    const docId = getEnrollmentDocId(traineeId, courseId);
    const docRef = doc(db, 'enrollments', docId);
    const snap = await getDoc(docRef);
    return snap.exists();
  } catch (error: any) {
    console.warn(`Failed to check enrollment for course ${courseId} (client may be offline):`, error?.message || error);
    return false;
  }
}

/**
 * Enroll a trainee into a published course.
 * Uses a deterministic document ID (`${traineeId}_${courseId}`) in the `enrollments` collection
 * to strictly prevent duplicate enrollments at the database layer.
 */
export async function enrollInCourse(params: EnrollCourseParams): Promise<Enrollment> {
  const { traineeId, courseId, courseTitle, trainerName } = params;

  if (!traineeId) throw new Error('Authentication required: trainee UID is missing.');
  if (!courseId) throw new Error('Course identifier is required.');
  if (!courseTitle) throw new Error('Course title is required.');
  if (!trainerName) throw new Error('Instructor name is required.');

  const docId = getEnrollmentDocId(traineeId, courseId);
  const docRef = doc(db, 'enrollments', docId);

  // Check if already enrolled
  const existingSnap = await getDoc(docRef);
  if (existingSnap.exists()) {
    const data = existingSnap.data();
    return {
      id: existingSnap.id,
      courseId: data.courseId,
      traineeId: data.traineeId,
      courseTitle: data.courseTitle || courseTitle,
      trainerName: data.trainerName || trainerName,
      enrolledAt: data.enrolledAt,
      status: data.status || 'active',
    };
  }

  // Build enrollment document payload adhering strictly to Firestore rules
  const payload = {
    courseId,
    traineeId,
    courseTitle: courseTitle.trim(),
    trainerName: trainerName.trim(),
    enrolledAt: serverTimestamp(),
    status: 'active' as const,
  };

  try {
    await setDoc(docRef, payload);

    return {
      id: docId,
      courseId,
      traineeId,
      courseTitle: payload.courseTitle,
      trainerName: payload.trainerName,
      enrolledAt: new Date(),
      status: 'active',
    };
  } catch (error) {
    console.error('Failed to create enrollment in Firestore:', error);
    handleFirestoreError(error, OperationType.CREATE, `enrollments/${docId}`);
  }
}

/**
 * Retrieve all active course enrollments for the current trainee from Firestore
 */
export async function getTraineeEnrollments(traineeId: string): Promise<Enrollment[]> {
  if (!traineeId) return [];

  try {
    const enrollmentsRef = collection(db, 'enrollments');
    const q = query(enrollmentsRef, where('traineeId', '==', traineeId));
    const snapshot = await getDocs(q);

    const list: Enrollment[] = snapshot.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        courseId: data.courseId,
        traineeId: data.traineeId,
        courseTitle: data.courseTitle || 'Untitled Course',
        trainerName: data.trainerName || 'Faculty Instructor',
        enrolledAt: data.enrolledAt,
        status: data.status || 'active',
      };
    });

    // Sort by enrolledAt descending if timestamp available
    list.sort((a, b) => {
      const timeA = a.enrolledAt?.toDate?.() ? a.enrolledAt.toDate().getTime() : 0;
      const timeB = b.enrolledAt?.toDate?.() ? b.enrolledAt.toDate().getTime() : 0;
      return timeB - timeA;
    });

    // Deduplicate by courseId and normalized title to prevent duplicate cards
    const seenCourseKeys = new Set<string>();
    const deduplicated: Enrollment[] = [];
    for (const item of list) {
      const key = `${item.courseId}_${item.courseTitle.toLowerCase().trim()}`;
      if (!seenCourseKeys.has(key)) {
        seenCourseKeys.add(key);
        deduplicated.push(item);
      }
    }

    return deduplicated;
  } catch (error: any) {
    console.warn('Notice: Failed to fetch trainee enrollments (client may be offline/reconnecting):', error?.message || error);
    return [];
  }
}
