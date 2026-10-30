import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  UploadTask,
} from 'firebase/storage';
import { storage } from '../lib/firebase';
import {
  validateFileUpload,
  formatFileSize,
  mapFileToResourceType,
  FileValidationResult,
} from '../utils/resourceValidation';
import { ResourceType, ResourceStatus } from '../types';
import { createResource } from './resourceService';

export interface UploadFileOptions {
  file: File;
  courseId: string;
  trainerId: string;
  onProgress?: (percent: number) => void;
}

export interface UploadFileResult {
  downloadUrl: string;
  storagePath: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  detectedType: ResourceType;
}

export interface CreateFileResourcePayload {
  file: File;
  courseId: string;
  trainerId: string;
  title: string;
  description?: string;
  status?: ResourceStatus;
  onProgress?: (percent: number) => void;
}

/**
 * Uploads a local file to Firebase Storage under course-resources/{courseId}/{trainerId}/{timestamp}_{filename}
 */
export async function uploadResourceFile(options: UploadFileOptions): Promise<UploadFileResult> {
  const { file, courseId, trainerId, onProgress } = options;

  // 1. Client-side pure validation
  const validation: FileValidationResult = validateFileUpload({
    name: file.name,
    size: file.size,
    type: file.type,
  });

  if (!validation.isValid) {
    throw new Error(validation.error || 'Selected file is invalid.');
  }

  const sanitizedName = validation.sanitizedFileName || file.name.replace(/[^a-zA-Z0-9._\- ]/g, '_');
  const timestamp = Date.now();
  const storagePath = `course-resources/${courseId}/${trainerId}/${timestamp}_${sanitizedName}`;

  const storageRef = ref(storage, storagePath);
  const metadata = {
    contentType: file.type || 'application/octet-stream',
    customMetadata: {
      courseId,
      trainerId,
      originalName: file.name,
      uploadedAt: new Date().toISOString(),
    },
  };

  const uploadTask: UploadTask = uploadBytesResumable(storageRef, file, metadata);

  return new Promise<UploadFileResult>((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        if (onProgress && snapshot.totalBytes > 0) {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          onProgress(progress);
        }
      },
      (error) => {
        console.error('Firebase Storage upload error:', error);
        let userMessage = `Storage upload failed: ${error.message}`;

        if (
          error.code === 'storage/bucket-not-found' ||
          error.message.includes('storage/bucket-not-found') ||
          error.code === 'storage/retry-limit-exceeded' ||
          error.code === 'storage/unknown' ||
          error.message.includes('ERR_FAILED')
        ) {
          userMessage =
            "Firebase Storage is not yet enabled in your Firebase Console. Please open the Firebase Console for project 'protean-beacon-v3kqt', go to Build -> Storage, and click 'Get started' to activate your storage bucket. You can also use the 'External URL / Streaming Link' tab to attach materials immediately.";
        } else if (
          error.code === 'storage/unauthorized' ||
          error.message.includes('storage/unauthorized')
        ) {
          userMessage =
            'Permission Denied: Only approved course trainers can upload materials to Firebase Storage. Ensure your account is an active Trainer.';
        }

        reject(new Error(userMessage));
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({
            downloadUrl,
            storagePath,
            fileName: file.name,
            fileSize: file.size,
            contentType: file.type || 'application/octet-stream',
            detectedType: validation.detectedType || mapFileToResourceType(file.name, file.type),
          });
        } catch (urlErr) {
          console.error('Failed to obtain download URL from Firebase Storage:', urlErr);
          reject(new Error('Failed to retrieve file download URL from Firebase Storage.'));
        }
      }
    );

    // Safety timeout in case client network stalls without firing error callback
    const timeoutTimer = setTimeout(() => {
      try {
        uploadTask.cancel();
      } catch (cancelErr) {
        // ignore
      }
      reject(
        new Error(
          "Storage connection timed out. Firebase Storage may not be enabled yet in your Firebase Console for project 'protean-beacon-v3kqt' (Build -> Storage -> 'Get started'), or network preflight failed. You can use the 'External URL' tab in the meantime."
        )
      );
    }, 12000);

    uploadTask.then(
      () => clearTimeout(timeoutTimer),
      () => clearTimeout(timeoutTimer)
    );
  });
}

/**
 * Deletes an uploaded file from Firebase Storage
 */
export async function deleteResourceFile(storagePath: string): Promise<void> {
  if (!storagePath) return;

  try {
    const fileRef = ref(storage, storagePath);
    await deleteObject(fileRef);
  } catch (error: any) {
    // If the file was already deleted or doesn't exist, ignore 404 to avoid blocking cleanup
    if (error?.code === 'storage/object-not-found') {
      console.warn(`File at ${storagePath} already removed from Firebase Storage.`);
      return;
    }
    console.error(`Failed to delete file from Firebase Storage at ${storagePath}:`, error);
    // Don't throw fatal error if file is missing, but log warning
  }
}

/**
 * High-level orchestration: Uploads file to Firebase Storage then registers Firestore metadata.
 * Automatically cleans up the uploaded file if Firestore metadata creation fails (prevents orphaned files).
 */
export async function uploadAndCreateResource(
  payload: CreateFileResourcePayload
): Promise<{ resourceId: string; downloadUrl: string }> {
  const { file, courseId, trainerId, title, description, status, onProgress } = payload;

  // 1. Upload to Storage
  const uploadResult = await uploadResourceFile({
    file,
    courseId,
    trainerId,
    onProgress,
  });

  // 2. Register metadata in Firestore
  try {
    const resourceId = await createResource(
      {
        courseId,
        title: title.trim(),
        description: description?.trim(),
        type: uploadResult.detectedType,
        url: uploadResult.downloadUrl,
        status: status || 'published',
        sourceType: 'file',
        storagePath: uploadResult.storagePath,
        fileName: uploadResult.fileName,
        fileSize: uploadResult.fileSize,
        contentType: uploadResult.contentType,
      },
      trainerId
    );

    return { resourceId, downloadUrl: uploadResult.downloadUrl };
  } catch (firestoreError) {
    // Rollback uploaded storage object to prevent orphan leak
    console.warn('Firestore metadata write failed. Rolling back Storage file upload...', uploadResult.storagePath);
    try {
      await deleteResourceFile(uploadResult.storagePath);
    } catch (cleanupErr) {
      console.error('Rollback cleanup failed:', cleanupErr);
    }
    throw firestoreError;
  }
}

/**
 * Cleanly deletes a resource and its associated Firebase Storage file (if present)
 */
export async function deleteResourceWithStorage(
  resourceId: string,
  storagePath?: string
): Promise<void> {
  if (storagePath) {
    try {
      await deleteResourceFile(storagePath);
    } catch (err) {
      console.warn(`Storage file removal notice for ${storagePath}:`, err);
    }
  }
  const { deleteResource } = await import('./resourceService');
  await deleteResource(resourceId);
}
