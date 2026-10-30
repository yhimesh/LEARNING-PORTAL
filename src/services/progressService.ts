import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { CourseProgress, ProgressStatus } from '../types';
import { getCourseProgressDocId, calculateCourseProgress } from '../utils/progress';

/**
 * Fetch progress record for a single trainee in a specific course
 */
export async function getTraineeCourseProgress(
  traineeId: string,
  courseId: string
): Promise<CourseProgress | null> {
  if (!traineeId || !courseId) return null;

  const docId = getCourseProgressDocId(traineeId, courseId);
  const docRef = doc(db, 'courseProgress', docId);

  try {
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;

    const data = snap.data();
    return {
      id: snap.id,
      traineeId: data.traineeId,
      courseId: data.courseId,
      traineeName: data.traineeName,
      traineeEmail: data.traineeEmail,
      courseTitle: data.courseTitle,
      completedResourceIds: Array.isArray(data.completedResourceIds) ? data.completedResourceIds : [],
      completedResourceCount: Number(data.completedResourceCount) || 0,
      totalResourceCount: Number(data.totalResourceCount) || 0,
      progressPercentage: Number(data.progressPercentage) || 0,
      status: (data.status as ProgressStatus) || 'not_started',
      lastCompletedResourceId: data.lastCompletedResourceId,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  } catch (error) {
    console.error(`Failed to get course progress for ${docId}:`, error);
    handleFirestoreError(error, OperationType.GET, `courseProgress/${docId}`);
    return null;
  }
}

/**
 * Fetch all course progress records for a logged-in trainee
 */
export async function getTraineeAllProgress(traineeId: string): Promise<Record<string, CourseProgress>> {
  if (!traineeId) return {};

  try {
    const progressRef = collection(db, 'courseProgress');
    const q = query(progressRef, where('traineeId', '==', traineeId));
    const snapshot = await getDocs(q);

    const progressMap: Record<string, CourseProgress> = {};
    snapshot.forEach((d) => {
      const data = d.data();
      progressMap[data.courseId] = {
        id: d.id,
        traineeId: data.traineeId,
        courseId: data.courseId,
        traineeName: data.traineeName,
        traineeEmail: data.traineeEmail,
        courseTitle: data.courseTitle,
        completedResourceIds: Array.isArray(data.completedResourceIds) ? data.completedResourceIds : [],
        completedResourceCount: Number(data.completedResourceCount) || 0,
        totalResourceCount: Number(data.totalResourceCount) || 0,
        progressPercentage: Number(data.progressPercentage) || 0,
        status: (data.status as ProgressStatus) || 'not_started',
        lastCompletedResourceId: data.lastCompletedResourceId,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
    });

    return progressMap;
  } catch (error) {
    console.error('Failed to get all trainee progress:', error);
    handleFirestoreError(error, OperationType.GET, `courseProgress/trainee/${traineeId}`);
    return {};
  }
}

/**
 * Toggle completion of a specific resource within an enrolled course.
 * Avoids marking complete automatically on click or download.
 * Validates resource ownership against the course resources list to prevent cross-course ID injections.
 */
export async function toggleResourceCompletion(params: {
  traineeId: string;
  traineeName?: string;
  traineeEmail?: string;
  courseId: string;
  courseTitle?: string;
  resourceId: string;
  validResourceIds: string[];
}): Promise<CourseProgress> {
  const {
    traineeId,
    traineeName,
    traineeEmail,
    courseId,
    courseTitle,
    resourceId,
    validResourceIds,
  } = params;

  if (!traineeId) throw new Error('Authentication required to update course progress.');
  if (!courseId) throw new Error('Course ID is required.');
  if (!resourceId) throw new Error('Resource ID is required.');

  // Validate that the resource belongs to this course
  if (!validResourceIds.includes(resourceId)) {
    throw new Error('Resource does not belong to the active course curriculum.');
  }

  const docId = getCourseProgressDocId(traineeId, courseId);
  const docRef = doc(db, 'courseProgress', docId);

  const existingSnap = await getDoc(docRef);
  let currentCompletedIds: string[] = [];

  if (existingSnap.exists()) {
    const data = existingSnap.data();
    currentCompletedIds = Array.isArray(data.completedResourceIds) ? data.completedResourceIds : [];
  }

  // Toggle resource in or out
  let updatedCompletedIds: string[];
  const isCurrentlyCompleted = currentCompletedIds.includes(resourceId);

  if (isCurrentlyCompleted) {
    // Unmark
    updatedCompletedIds = currentCompletedIds.filter((id) => id !== resourceId);
  } else {
    // Mark complete
    updatedCompletedIds = [...currentCompletedIds, resourceId];
  }

  // Calculate sanitized counts and percentages
  const calculation = calculateCourseProgress({
    completedResourceIds: updatedCompletedIds,
    validResourceIds,
  });

  const payload = {
    id: docId,
    traineeId,
    courseId,
    traineeName: traineeName || 'Trainee Learner',
    traineeEmail: traineeEmail || '',
    courseTitle: courseTitle || 'Enrolled Course',
    completedResourceIds: calculation.completedResourceIds,
    completedResourceCount: calculation.completedResourceCount,
    totalResourceCount: calculation.totalResourceCount,
    progressPercentage: calculation.progressPercentage,
    status: calculation.status,
    lastCompletedResourceId: isCurrentlyCompleted ? null : resourceId,
    updatedAt: serverTimestamp(),
  };

  try {
    if (existingSnap.exists()) {
      await updateDoc(docRef, {
        ...payload,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(docRef, {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    return {
      ...payload,
      lastCompletedResourceId: isCurrentlyCompleted ? undefined : resourceId,
      createdAt: existingSnap.exists() ? existingSnap.data().createdAt : new Date(),
      updatedAt: new Date(),
    };
  } catch (error) {
    console.error(`Failed to update resource progress for ${docId}:`, error);
    handleFirestoreError(error, OperationType.UPDATE, `courseProgress/${docId}`);
    throw error;
  }
}

/**
 * Fetch all trainee progress records across a course for the approved trainer dashboard
 */
export async function getCourseProgressForTrainer(
  courseId: string,
  _trainerId: string
): Promise<CourseProgress[]> {
  if (!courseId) return [];

  try {
    const progressRef = collection(db, 'courseProgress');
    const q = query(progressRef, where('courseId', '==', courseId));
    const snapshot = await getDocs(q);

    const list: CourseProgress[] = [];
    snapshot.forEach((d) => {
      const data = d.data();
      list.push({
        id: d.id,
        traineeId: data.traineeId,
        courseId: data.courseId,
        traineeName: data.traineeName || 'Enrolled Trainee',
        traineeEmail: data.traineeEmail || '',
        courseTitle: data.courseTitle || 'Course',
        completedResourceIds: Array.isArray(data.completedResourceIds) ? data.completedResourceIds : [],
        completedResourceCount: Number(data.completedResourceCount) || 0,
        totalResourceCount: Number(data.totalResourceCount) || 0,
        progressPercentage: Number(data.progressPercentage) || 0,
        status: (data.status as ProgressStatus) || 'not_started',
        lastCompletedResourceId: data.lastCompletedResourceId,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      });
    });

    return list;
  } catch (error) {
    console.error(`Failed to fetch course progress for trainer (${courseId}):`, error);
    handleFirestoreError(error, OperationType.GET, `courseProgress/course/${courseId}`);
    return [];
  }
}
