import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Course, CourseStatus } from '../types';
import { SAMPLE_COURSES } from '../data/courses';

export interface CreateCourseInput {
  title: string;
  description: string;
  fullDescription?: string;
  category: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  duration: string;
  status: CourseStatus;
  syllabus?: string[];
  prerequisites?: string;
  outcomes?: string[];
}

/**
 * Validates course input fields before sending to Firestore
 */
export function validateCoursePayload(
  input: CreateCourseInput,
  trainerId: string,
  trainerName: string
): { isValid: boolean; error?: string } {
  if (!input.title || input.title.trim().length < 2 || input.title.trim().length > 120) {
    return { isValid: false, error: 'Course title must be between 2 and 120 characters.' };
  }
  if (!input.description || input.description.trim().length < 10 || input.description.trim().length > 2000) {
    return { isValid: false, error: 'Course overview description must be between 10 and 2000 characters.' };
  }
  if (!input.category || input.category.trim().length < 2 || input.category.trim().length > 60) {
    return { isValid: false, error: 'Category is required (max 60 characters).' };
  }
  if (!['Beginner', 'Intermediate', 'Advanced'].includes(input.level)) {
    return { isValid: false, error: 'Level must be Beginner, Intermediate, or Advanced.' };
  }
  if (!input.duration || input.duration.trim().length < 1 || input.duration.trim().length > 50) {
    return { isValid: false, error: 'Duration is required (e.g. "20 hours").' };
  }
  if (!['draft', 'published', 'archived'].includes(input.status)) {
    return { isValid: false, error: 'Status must be draft, published, or archived.' };
  }
  if (!trainerId || !trainerName) {
    return { isValid: false, error: 'Authenticated trainer information is missing.' };
  }
  return { isValid: true };
}

/**
 * Retrieve all published courses for the public catalogue
 */
export async function getPublishedCourses(): Promise<Course[]> {
  try {
    const coursesRef = collection(db, 'courses');
    const q = query(coursesRef, where('status', '==', 'published'));
    const snapshot = await getDocs(q);

    const rawList = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        title: data.title || '',
        description: data.description || '',
        shortDescription: data.shortDescription || data.description || '',
        fullDescription: data.fullDescription || data.description || '',
        category: data.category || 'General',
        level: data.level || 'Beginner',
        duration: data.duration || '',
        durationHours: parseInt(data.duration, 10) || 0,
        trainerId: data.trainerId || '',
        trainerName: data.trainerName || 'Staff Instructor',
        status: data.status || 'published',
        syllabus: Array.isArray(data.syllabus) ? data.syllabus : [],
        prerequisites: data.prerequisites || '',
        outcomes: Array.isArray(data.outcomes) ? data.outcomes : [],
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      } as Course;
    });

    // Deduplicate by normalized title to prevent repeated cards in the catalogue
    const seenTitles = new Set<string>();
    const uniqueCourses: Course[] = [];
    for (const course of rawList) {
      const normalized = course.title.toLowerCase().trim();
      if (!seenTitles.has(normalized)) {
        seenTitles.add(normalized);
        uniqueCourses.push(course);
      }
    }

    if (uniqueCourses.length === 0) {
      return SAMPLE_COURSES;
    }

    return uniqueCourses;
  } catch (error) {
    console.warn('Notice: Firestore courses fetch fallback to local catalogue (client offline/reconnecting):', error);
    return SAMPLE_COURSES;
  }
}

/**
 * Retrieve courses created by a specific trainer
 */
export async function getTrainerCourses(trainerId: string): Promise<Course[]> {
  try {
    const coursesRef = collection(db, 'courses');
    const q = query(coursesRef, where('trainerId', '==', trainerId));
    const snapshot = await getDocs(q);

    const rawList = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        title: data.title || '',
        description: data.description || '',
        shortDescription: data.shortDescription || data.description || '',
        fullDescription: data.fullDescription || data.description || '',
        category: data.category || 'General',
        level: data.level || 'Beginner',
        duration: data.duration || '',
        durationHours: parseInt(data.duration, 10) || 0,
        trainerId: data.trainerId || '',
        trainerName: data.trainerName || 'Trainer',
        status: data.status || 'draft',
        syllabus: Array.isArray(data.syllabus) ? data.syllabus : [],
        prerequisites: data.prerequisites || '',
        outcomes: Array.isArray(data.outcomes) ? data.outcomes : [],
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      } as Course;
    });

    const seenTitles = new Set<string>();
    const uniqueCourses: Course[] = [];
    for (const course of rawList) {
      const normalized = course.title.toLowerCase().trim();
      if (!seenTitles.has(normalized)) {
        seenTitles.add(normalized);
        uniqueCourses.push(course);
      }
    }

    return uniqueCourses;
  } catch (error) {
    console.warn('Notice: Failed to fetch trainer courses (using local fallback if offline):', error);
    return SAMPLE_COURSES.filter((c) => c.trainerId === trainerId);
  }
}

/**
 * Fetch a single course by ID
 */
export async function getCourseById(courseId: string): Promise<Course | null> {
  try {
    const docRef = doc(db, 'courses', courseId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      const sample = SAMPLE_COURSES.find((c) => c.id === courseId);
      return sample || null;
    }

    const data = docSnap.data();
    return {
      id: docSnap.id,
      title: data.title || '',
      description: data.description || '',
      shortDescription: data.shortDescription || data.description || '',
      fullDescription: data.fullDescription || data.description || '',
      category: data.category || 'General',
      level: data.level || 'Beginner',
      duration: data.duration || '',
      durationHours: parseInt(data.duration, 10) || 0,
      trainerId: data.trainerId || '',
      trainerName: data.trainerName || 'Staff Instructor',
      status: data.status || 'published',
      syllabus: Array.isArray(data.syllabus) ? data.syllabus : [],
      prerequisites: data.prerequisites || '',
      outcomes: Array.isArray(data.outcomes) ? data.outcomes : [],
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    } as Course;
  } catch (error: any) {
    console.warn(`Course ${courseId} fetch notice (client offline/reconnecting):`, error?.message || error);
    const sample = SAMPLE_COURSES.find((c) => c.id === courseId);
    return sample || null;
  }
}

/**
 * Create a new course in Firestore
 */
export async function createCourse(
  input: CreateCourseInput,
  trainerId: string,
  trainerName: string
): Promise<string> {
  const validation = validateCoursePayload(input, trainerId, trainerName);
  if (!validation.isValid) {
    throw new Error(validation.error || 'Invalid course data');
  }

  const payload: Record<string, unknown> = {
    title: input.title.trim(),
    description: input.description.trim(),
    category: input.category.trim(),
    level: input.level,
    duration: input.duration.trim(),
    trainerId,
    trainerName: trainerName.trim(),
    status: input.status,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (input.fullDescription?.trim()) {
    payload.fullDescription = input.fullDescription.trim();
  }
  if (input.prerequisites?.trim()) {
    payload.prerequisites = input.prerequisites.trim();
  }
  if (Array.isArray(input.syllabus) && input.syllabus.length > 0) {
    payload.syllabus = input.syllabus.map((s) => s.trim()).filter(Boolean);
  }
  if (Array.isArray(input.outcomes) && input.outcomes.length > 0) {
    payload.outcomes = input.outcomes.map((o) => o.trim()).filter(Boolean);
  }

  try {
    const docRef = await addDoc(collection(db, 'courses'), payload);
    return docRef.id;
  } catch (error) {
    console.error('Failed to create course in Firestore:', error);
    handleFirestoreError(error, OperationType.CREATE, 'courses');
  }
}

/**
 * Update an existing course in Firestore
 */
export async function updateCourse(
  courseId: string,
  updates: Partial<CreateCourseInput>,
  trainerId: string,
  trainerName: string
): Promise<void> {
  const payload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if (updates.title) payload.title = updates.title.trim();
  if (updates.description) payload.description = updates.description.trim();
  if (updates.fullDescription !== undefined) payload.fullDescription = updates.fullDescription.trim();
  if (updates.category) payload.category = updates.category.trim();
  if (updates.level) payload.level = updates.level;
  if (updates.duration) payload.duration = updates.duration.trim();
  if (updates.status) payload.status = updates.status;
  if (updates.prerequisites !== undefined) payload.prerequisites = updates.prerequisites.trim();
  if (updates.syllabus) payload.syllabus = updates.syllabus;
  if (updates.outcomes) payload.outcomes = updates.outcomes;

  try {
    const docRef = doc(db, 'courses', courseId);
    await updateDoc(docRef, payload);
  } catch (error) {
    console.error(`Failed to update course ${courseId}:`, error);
    handleFirestoreError(error, OperationType.UPDATE, `courses/${courseId}`);
  }
}

/**
 * Delete a course from Firestore
 */
export async function deleteCourse(courseId: string): Promise<void> {
  try {
    const docRef = doc(db, 'courses', courseId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error(`Failed to delete course ${courseId}:`, error);
    handleFirestoreError(error, OperationType.DELETE, `courses/${courseId}`);
  }
}

/**
 * Seed initial foundation courses into Firestore for demonstration and testing.
 * Only callable by an approved trainer or administrator.
 */
export async function seedInitialCourses(trainerId: string, trainerName: string): Promise<number> {
  let createdCount = 0;
  // Check existing courses first to prevent duplicates
  const existingCourses = await getPublishedCourses();
  const existingTitles = new Set(existingCourses.map((c) => c.title.toLowerCase().trim()));

  for (const sample of SAMPLE_COURSES) {
    if (existingTitles.has(sample.title.toLowerCase().trim())) {
      // Course with this title already exists; skip to prevent duplication
      continue;
    }
    await createCourse(
      {
        title: sample.title,
        description: sample.description,
        fullDescription: sample.fullDescription,
        category: sample.category,
        level: sample.level,
        duration: sample.duration,
        status: 'published',
        syllabus: sample.syllabus,
        prerequisites: sample.prerequisites,
        outcomes: sample.outcomes,
      },
      trainerId,
      trainerName
    );
    createdCount++;
  }
  return createdCount;
}
