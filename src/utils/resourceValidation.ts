import { ResourceType, ResourceStatus } from '../types';

export interface ResourceInput {
  title: string;
  description?: string;
  type: ResourceType;
  url: string;
  courseId: string;
  status?: ResourceStatus;
}

export interface TraineeAuthContext {
  uid?: string | null;
  role?: string | null;
  accountStatus?: string | null;
  isAdmin?: boolean;
}

/**
 * Pure authorization check for trainee course learning page access
 */
export function canTraineeAccessCourseResources(
  auth: TraineeAuthContext | null | undefined,
  courseId: string,
  enrolledCourseIds: string[]
): { canAccess: boolean; reason?: string } {
  if (!auth || !auth.uid) {
    return {
      canAccess: false,
      reason: 'Authentication required: Please sign in to access course learning materials.',
    };
  }

  // Admins bypass
  if (auth.isAdmin) {
    return { canAccess: true };
  }

  // Only Trainees are eligible for student learning pages
  if (auth.role !== 'Trainee') {
    return {
      canAccess: false,
      reason: 'Role restriction: Only active Trainee accounts can access student learning pages.',
    };
  }

  // Active status check
  if (auth.accountStatus !== 'active') {
    return {
      canAccess: false,
      reason: 'Account pending: Your trainee profile is not yet active.',
    };
  }

  // Course enrollment check
  if (!courseId || !enrolledCourseIds.includes(courseId)) {
    return {
      canAccess: false,
      reason: 'Enrollment required: You are not currently enrolled in this course.',
    };
  }

  return { canAccess: true };
}


export interface ResourceValidationResult {
  isValid: boolean;
  errors: {
    title?: string;
    description?: string;
    type?: string;
    url?: string;
    courseId?: string;
  };
}

export const VALID_RESOURCE_TYPES: readonly ResourceType[] = [
  'pdf',
  'video',
  'presentation',
  'document',
  'external_link',
] as const;

/**
 * Checks whether the given string is a valid HTTP/HTTPS URL
 */
export function isValidUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed.length < 8 || trimmed.length > 2048) return false;
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return false;

  try {
    const parsed = new URL(trimmed);
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}


/**
 * Type guard for ResourceType
 */
export function isValidResourceType(type: unknown): type is ResourceType {
  return typeof type === 'string' && VALID_RESOURCE_TYPES.includes(type as ResourceType);
}

/**
 * Validates a resource form/payload before submission to Firestore
 */
export function validateResourceInput(input: Partial<ResourceInput>): ResourceValidationResult {
  const errors: ResourceValidationResult['errors'] = {};

  // Title validation
  const title = input.title?.trim() || '';
  if (!title) {
    errors.title = 'Resource title is required.';
  } else if (title.length < 2) {
    errors.title = 'Title must be at least 2 characters.';
  } else if (title.length > 120) {
    errors.title = 'Title cannot exceed 120 characters.';
  }

  // Description validation (optional, max 1000)
  if (input.description && input.description.trim().length > 1000) {
    errors.description = 'Description cannot exceed 1000 characters.';
  }

  // Type validation
  if (!input.type || !isValidResourceType(input.type)) {
    errors.type = 'Please select a valid resource type (PDF, Video, Presentation, Document, or External Link).';
  }

  // URL validation
  const url = input.url?.trim() || '';
  if (!url) {
    errors.url = 'Resource URL is required.';
  } else if (!isValidUrl(url)) {
    errors.url = 'Please provide a valid web URL starting with https:// or http://';
  }

  // Course ID validation
  const courseId = input.courseId?.trim() || '';
  if (!courseId) {
    errors.courseId = 'Please select an associated course.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Human-readable metadata and placeholder guidance for each resource type
 */
export const RESOURCE_TYPE_CONFIG: Record<
  ResourceType,
  {
    label: string;
    description: string;
    urlPlaceholder: string;
    urlHint: string;
    badgeColor: string;
  }
> = {
  pdf: {
    label: 'PDF Document / Syllabus',
    description: 'Direct PDF URL or shared cloud PDF link (e.g. Google Drive, GitHub raw, university portal)',
    urlPlaceholder: 'https://example.org/materials/syllabus.pdf',
    urlHint: 'Ensure sharing permissions are set to anyone with the link can view.',
    badgeColor: 'bg-rose-950/70 text-rose-300 border-rose-800/60',
  },
  video: {
    label: 'Video Lecture / Tutorial',
    description: 'YouTube, Vimeo, Google Drive video or institutional lecture streaming link',
    urlPlaceholder: 'https://www.youtube.com/watch?v=... or lecture stream URL',
    urlHint: 'Link directly to the specific lecture video or playlist.',
    badgeColor: 'bg-red-950/70 text-red-300 border-red-800/60',
  },
  presentation: {
    label: 'Presentation / Slides',
    description: 'SlideShare, Google Slides, Speaker Deck, or PowerPoint cloud link',
    urlPlaceholder: 'https://docs.google.com/presentation/d/... or slide link',
    urlHint: 'Ensure presentation view permissions are public/accessible.',
    badgeColor: 'bg-amber-950/70 text-amber-300 border-amber-800/60',
  },
  document: {
    label: 'Document / Reading Notes',
    description: 'Google Docs, Notion public page, Markdown notes, or study guide',
    urlPlaceholder: 'https://docs.google.com/document/d/... or notes link',
    urlHint: 'Reference document for students to study alongside course lectures.',
    badgeColor: 'bg-blue-950/70 text-blue-300 border-blue-800/60',
  },
  external_link: {
    label: 'External Learning / Reference Link',
    description: 'Official documentation, GitHub repository, interactive playground, or article',
    urlPlaceholder: 'https://github.com/... or https://developer.mozilla.org/...',
    urlHint: 'Useful supplemental reference or interactive tool.',
    badgeColor: 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60',
  },
};

/**
 * Stage 4.3 Firebase Storage File Upload Constants & Pure Validation Logic
 */
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export const ALLOWED_FILE_EXTENSIONS = [
  '.pdf',
  '.docx',
  '.doc',
  '.pptx',
  '.ppt',
  '.txt',
] as const;

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
] as const;

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  detectedType?: ResourceType;
  sanitizedFileName?: string;
}

/**
 * Maps a file extension or MIME type to an existing ResourceType
 */
export function mapFileToResourceType(fileName: string, mimeType?: string): ResourceType {
  const ext = fileName.toLowerCase().slice(fileName.lastIndexOf('.'));
  if (ext === '.pdf' || mimeType === 'application/pdf') {
    return 'pdf';
  }
  if (
    ext === '.pptx' ||
    ext === '.ppt' ||
    mimeType === 'application/vnd.ms-powerpoint' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ) {
    return 'presentation';
  }
  return 'document';
}

/**
 * Formats byte size into human-readable representation
 */
export function formatFileSize(bytes?: number): string {
  if (bytes === undefined || bytes === null || isNaN(bytes) || bytes < 0) {
    return '0 B';
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Pure validation logic for uploaded files before initiating Firebase Storage transfer
 */
export function validateFileUpload(file: {
  name?: string;
  size?: number;
  type?: string;
}): FileValidationResult {
  if (!file || !file.name) {
    return {
      isValid: false,
      error: 'Please select a file to upload.',
    };
  }

  const trimmedName = file.name.trim();
  if (!trimmedName || trimmedName.length < 3) {
    return {
      isValid: false,
      error: 'File name is invalid or too short.',
    };
  }

  // Size limit check: max 10MB
  if (file.size === undefined || file.size <= 0) {
    return {
      isValid: false,
      error: 'Selected file is empty (0 bytes).',
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      isValid: false,
      error: `File size exceeds the 10 MB limit (${formatFileSize(file.size)}). Please choose a smaller file.`,
    };
  }

  // Extension check
  const lastDotIndex = trimmedName.lastIndexOf('.');
  if (lastDotIndex === -1) {
    return {
      isValid: false,
      error: 'File must have a valid extension (.pdf, .docx, .pptx, .ppt, .doc, or .txt).',
    };
  }

  const ext = trimmedName.slice(lastDotIndex).toLowerCase();
  const isExtensionAllowed = ALLOWED_FILE_EXTENSIONS.some((allowedExt) => allowedExt === ext);

  if (!isExtensionAllowed) {
    return {
      isValid: false,
      error: `Unsupported file extension (${ext}). Allowed formats: PDF, DOCX, DOC, PPTX, PPT, TXT.`,
    };
  }

  // MIME check (if provided by browser)
  if (file.type && file.type.length > 0) {
    const isMimeAllowed = ALLOWED_MIME_TYPES.some((allowedMime) => allowedMime === file.type);
    // Note: some browsers don't identify .docx or .pptx cleanly, so if extension is known, allow it
    if (!isMimeAllowed && !isExtensionAllowed) {
      return {
        isValid: false,
        error: `Unsupported file type (${file.type}). Allowed formats: PDF, Word, PowerPoint, or Text documents.`,
      };
    }
  }

  const detectedType = mapFileToResourceType(trimmedName, file.type);
  const sanitizedFileName = trimmedName.replace(/[^a-zA-Z0-9._\- ]/g, '_');

  return {
    isValid: true,
    detectedType,
    sanitizedFileName,
  };
}
