import {
  collection,
  doc,
  getDocs,
  query,
  where,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Resource, ResourceType, ResourceStatus } from '../types';
import { validateResourceInput } from '../utils/resourceValidation';
import { checkIsEnrolled } from './enrollmentService';

export interface CreateResourceInput {
  courseId: string;
  title: string;
  description?: string;
  type: ResourceType;
  url: string;
  status?: ResourceStatus;
  sourceType?: 'link' | 'file';
  storagePath?: string;
  fileName?: string;
  fileSize?: number;
  contentType?: string;
}

export interface UpdateResourceInput {
  title?: string;
  description?: string;
  type?: ResourceType;
  url?: string;
  status?: ResourceStatus;
  sourceType?: 'link' | 'file';
  storagePath?: string;
  fileName?: string;
  fileSize?: number;
  contentType?: string;
}


/**
 * Fetch all resources authored by a trainer for a given course
 */
export async function getTrainerCourseResources(
  trainerId: string,
  courseId: string
): Promise<Resource[]> {
  try {
    const resourcesRef = collection(db, 'resources');
    const q = query(
      resourcesRef,
      where('courseId', '==', courseId),
      where('trainerId', '==', trainerId)
    );
    const snapshot = await getDocs(q);

    const results = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        courseId: data.courseId,
        trainerId: data.trainerId,
        title: data.title || '',
        description: data.description || '',
        type: (data.type as ResourceType) || 'external_link',
        url: data.url || '',
        status: (data.status as ResourceStatus) || 'published',
        sourceType: data.sourceType || (data.storagePath ? 'file' : 'link'),
        storagePath: data.storagePath,
        fileName: data.fileName,
        fileSize: data.fileSize,
        contentType: data.contentType,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      } as Resource;
    });

    // Sort by createdAt descending in memory if available
    return results.sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return timeB - timeA;
    });
  } catch (error: any) {
    console.warn(`Notice: Failed to fetch resources for course ${courseId} (client offline/reconnecting):`, error?.message || error);
    return [];
  }
}

/**
 * Fetch all resources authored by a trainer across all their courses
 */
export async function getAllTrainerResources(trainerId: string): Promise<Resource[]> {
  try {
    const resourcesRef = collection(db, 'resources');
    const q = query(resourcesRef, where('trainerId', '==', trainerId));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        courseId: data.courseId,
        trainerId: data.trainerId,
        title: data.title || '',
        description: data.description || '',
        type: (data.type as ResourceType) || 'external_link',
        url: data.url || '',
        status: (data.status as ResourceStatus) || 'published',
        sourceType: data.sourceType || (data.storagePath ? 'file' : 'link'),
        storagePath: data.storagePath,
        fileName: data.fileName,
        fileSize: data.fileSize,
        contentType: data.contentType,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      } as Resource;
    });
  } catch (error: any) {
    console.warn(`Notice: Failed to fetch all resources for trainer ${trainerId} (client offline/reconnecting):`, error?.message || error);
    return [];
  }
}

/**
 * Fetch published learning resources for an enrolled course.
 * Verifies that the trainee is authenticated and has an active enrollment for the requested course.
 */
export async function getEnrolledCourseResources(
  traineeId: string,
  courseId: string
): Promise<Resource[]> {
  if (!traineeId || !courseId) {
    throw new Error('Authentication and course identification are required.');
  }

  // 1. Verify trainee has an active enrollment record for this course
  const isEnrolled = await checkIsEnrolled(traineeId, courseId);
  if (!isEnrolled) {
    throw new Error('Access Denied: You must be actively enrolled in this course to access its learning resources.');
  }

  try {
    const resourcesRef = collection(db, 'resources');
    const q = query(resourcesRef, where('courseId', '==', courseId));
    const snapshot = await getDocs(q);

    const list: Resource[] = snapshot.docs
      .map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          courseId: data.courseId,
          trainerId: data.trainerId,
          title: data.title || '',
          description: data.description || '',
          type: (data.type as ResourceType) || 'external_link',
          url: data.url || '',
          status: (data.status as ResourceStatus) || 'published',
          sourceType: data.sourceType || (data.storagePath ? 'file' : 'link'),
          storagePath: data.storagePath,
          fileName: data.fileName,
          fileSize: data.fileSize,
          contentType: data.contentType,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        } as Resource;
      })
      // Ensure private drafts are never exposed to trainees
      .filter((res) => !res.status || res.status === 'published');

    // Sort by createdAt descending
    return list.sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return timeB - timeA;
    });
  } catch (error: any) {
    console.warn(`Notice: Failed to fetch enrolled course resources for course ${courseId} (client offline/reconnecting):`, error?.message || error);
    return [];
  }
}

/**
 * Create a new learning resource in Firestore
 */
export async function createResource(
  input: CreateResourceInput,
  trainerId: string
): Promise<string> {
  const validation = validateResourceInput({
    title: input.title,
    description: input.description,
    type: input.type,
    url: input.url,
    courseId: input.courseId,
  });

  if (!validation.isValid) {
    const firstError = Object.values(validation.errors)[0] || 'Invalid resource data';
    throw new Error(firstError);
  }

  const payload: Record<string, unknown> = {
    courseId: input.courseId.trim(),
    trainerId,
    title: input.title.trim(),
    type: input.type,
    url: input.url.trim(),
    status: input.status || 'published',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (input.description && input.description.trim()) {
    payload.description = input.description.trim();
  }
  if (input.sourceType) {
    payload.sourceType = input.sourceType;
  }
  if (input.storagePath) {
    payload.storagePath = input.storagePath;
  }
  if (input.fileName) {
    payload.fileName = input.fileName;
  }
  if (input.fileSize !== undefined) {
    payload.fileSize = input.fileSize;
  }
  if (input.contentType) {
    payload.contentType = input.contentType;
  }

  try {
    const docRef = await addDoc(collection(db, 'resources'), payload);
    return docRef.id;
  } catch (error) {
    console.error('Failed to create resource in Firestore:', error);
    handleFirestoreError(error, OperationType.CREATE, 'resources');
  }
}


/**
 * Update an existing learning resource in Firestore
 */
export async function updateResource(
  resourceId: string,
  updates: UpdateResourceInput,
  existingResource: Resource
): Promise<void> {
  const validation = validateResourceInput({
    title: updates.title ?? existingResource.title,
    description: updates.description ?? existingResource.description,
    type: updates.type ?? existingResource.type,
    url: updates.url ?? existingResource.url,
    courseId: existingResource.courseId,
  });

  if (!validation.isValid) {
    const firstError = Object.values(validation.errors)[0] || 'Invalid resource update data';
    throw new Error(firstError);
  }

  const payload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if (updates.title !== undefined) payload.title = updates.title.trim();
  if (updates.description !== undefined) payload.description = updates.description.trim();
  if (updates.type !== undefined) payload.type = updates.type;
  if (updates.url !== undefined) payload.url = updates.url.trim();
  if (updates.status !== undefined) payload.status = updates.status;

  try {

    const docRef = doc(db, 'resources', resourceId);
    await updateDoc(docRef, payload);
  } catch (error) {
    console.error(`Failed to update resource ${resourceId}:`, error);
    handleFirestoreError(error, OperationType.UPDATE, `resources/${resourceId}`);
  }
}

/**
 * Delete a learning resource from Firestore
 */
export async function deleteResource(resourceId: string): Promise<void> {
  try {
    const docRef = doc(db, 'resources', resourceId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error(`Failed to delete resource ${resourceId}:`, error);
    handleFirestoreError(error, OperationType.DELETE, `resources/${resourceId}`);
  }
}
