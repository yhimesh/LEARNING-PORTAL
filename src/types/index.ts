/**
 * Type definitions for CAPACITY CONNECT
 * Stage 1: Frontend Architecture
 * Ready for Firebase Auth and Cloud Firestore in later stages
 */

export type CourseCategory =
  | 'All'
  | 'Programming'
  | 'AI and ML'
  | 'Web Development'
  | 'Database'
  | 'Computer Science';

export type CourseStatus = 'draft' | 'published' | 'archived';

export interface Course {
  id: string;
  title: string;
  description: string;
  shortDescription?: string;
  fullDescription?: string;
  category: string;
  duration: string;
  durationHours?: number;
  trainerId: string;
  trainerName: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  status: CourseStatus;
  averageRating?: number;
  reviewCount?: number;
  syllabus?: string[];
  prerequisites?: string;
  outcomes?: string[];
  createdAt?: any;
  updatedAt?: any;
}

export interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export interface ContactFormErrors {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
}

export type UserRole = 'Trainee' | 'Trainer' | 'Admin';
export type AccountStatus = 'active' | 'pending';

export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  requestedRole: 'Trainee' | 'Trainer';
  accountStatus: AccountStatus;
  createdAt?: any;
  updatedAt?: any;
}

export type AuthModalMode = 'signin' | 'register' | 'forgot-password';

export interface AuthModalState {
  isOpen: boolean;
  mode: AuthModalMode;
  initialRole?: 'Trainee' | 'Trainer';
}

export type EnrollmentStatus = 'active' | 'completed' | 'dropped';

export interface Enrollment {
  id: string; // Deterministic: `${traineeId}_${courseId}`
  courseId: string;
  traineeId: string;
  courseTitle: string;
  trainerName: string;
  enrolledAt: any;
  status: EnrollmentStatus;
}

export type ResourceType = 'pdf' | 'video' | 'presentation' | 'document' | 'external_link';
export type ResourceStatus = 'published' | 'draft';
export type ResourceSourceType = 'link' | 'file';

export interface Resource {
  id: string;
  courseId: string;
  trainerId: string;
  title: string;
  description?: string;
  type: ResourceType;
  url: string;
  status?: ResourceStatus;
  sourceType?: ResourceSourceType;
  storagePath?: string;
  fileName?: string;
  fileSize?: number;
  contentType?: string;
  createdAt?: any;
  updatedAt?: any;
}

export type AssessmentStatus = 'draft' | 'published' | 'archived';

export interface QuizQuestion {
  id: string;
  questionText: string;
  options: [string, string, string, string]; // Exactly 4 multiple choice options
  correctOptionIndex: number; // 0, 1, 2, or 3
  points: number; // Configurable mark value, min 1
  explanation?: string;
}

export interface Assessment {
  id: string;
  title: string;
  description: string;
  courseId: string;
  courseTitle?: string;
  trainerId: string;
  trainerName?: string;
  passingPercentage: number; // 1 to 100
  status: AssessmentStatus;
  totalMarks: number;
  questionCount: number;
  timeLimitMinutes?: number;
  questions: QuizQuestion[];
  createdAt?: any;
  updatedAt?: any;
}

export interface AssessmentAnswerKey {
  assessmentId: string;
  courseId: string;
  trainerId: string;
  answers: {
    questionId: string;
    correctOptionIndex: number;
  }[];
  updatedAt?: any;
}

export type AttemptStatus = 'in_progress' | 'submitted' | 'pending_grading';

export interface QuestionAnswer {
  questionId: string;
  selectedOptionIndex: number; // 0, 1, 2, or 3
  answeredAt?: any;
}

export interface AssessmentAttempt {
  id: string; // Deterministic: `${traineeId}_${assessmentId}`
  assessmentId: string;
  courseId: string;
  traineeId: string;
  traineeName?: string;
  assessmentTitle?: string;
  courseTitle?: string;
  answers: QuestionAnswer[];
  status: AttemptStatus;
  startedAt: any;
  submittedAt?: any;
  createdAt?: any;
  updatedAt?: any;
}

export type ResultStatus = 'passed' | 'failed';

export interface AssessmentResult {
  id: string; // Deterministic: `${traineeId}_${assessmentId}`
  attemptId: string;
  assessmentId: string;
  courseId: string;
  traineeId: string;
  traineeName?: string;
  traineeEmail?: string;
  assessmentTitle: string;
  courseTitle: string;
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  unansweredCount: number;
  totalMarks: number;
  marksObtained: number;
  percentage: number;
  passingPercentage: number;
  resultStatus: ResultStatus;
  submittedAt: any;
  gradedAt: any;
  createdAt?: any;
  updatedAt?: any;
}

export type ProgressStatus = 'not_started' | 'in_progress' | 'completed';

export interface CourseProgress {
  id: string; // Deterministic: `${traineeId}_${courseId}`
  traineeId: string;
  courseId: string;
  traineeName?: string;
  traineeEmail?: string;
  courseTitle?: string;
  completedResourceIds: string[];
  completedResourceCount: number;
  totalResourceCount: number;
  progressPercentage: number;
  status: ProgressStatus;
  lastCompletedResourceId?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface CourseAnalyticsItem {
  courseId: string;
  courseTitle: string;
  category: string;
  level: string;
  status: CourseStatus;
  enrollmentCount: number;
  uniqueTraineesCount: number;
  averageProgress: number; // 0 - 100
  completedCount: number;
  inProgressCount: number;
  notStartedCount: number;
  assessmentCount: number;
  submissionCount: number;
  averageScore: number | null; // null if no graded results
  passedCount: number;
  failedCount: number;
  passRate: number | null; // null if no graded results
}

export interface TrainerAnalyticsSummary {
  trainerId: string;
  totalCourses: number;
  publishedCoursesCount: number;
  draftCoursesCount: number;
  archivedCoursesCount: number;
  totalEnrollments: number;
  uniqueTraineesCount: number;
  averageProgress: number; // 0 - 100
  completedLearnersCount: number;
  inProgressLearnersCount: number;
  notStartedLearnersCount: number;
  totalAssessments: number;
  totalSubmissions: number;
  averageScore: number | null; // null if no graded results
  passedSubmissionsCount: number;
  failedSubmissionsCount: number;
  overallPassRate: number | null;
  courses: CourseAnalyticsItem[];
  progressDistribution: {
    notStarted: number;
    inProgress: number;
    completed: number;
  };
  scoreDistribution: {
    under50: number;
    range50to69: number;
    range70to84: number;
    range85to100: number;
  };
}

export interface CourseEnrollmentStat {
  courseId: string;
  courseTitle: string;
  category: string;
  trainerName: string;
  trainerId: string;
  status: CourseStatus;
  enrollmentCount: number;
  assessmentCount: number;
  submissionCount: number;
  averageScore: number | null;
  createdAt?: any;
}

export interface AdminPlatformAnalyticsSummary {
  totalUsers: number;
  traineesCount: number;
  activeTraineesCount: number;
  totalTrainersCount: number;
  pendingTrainersCount: number;
  approvedTrainersCount: number;
  otherUsersCount: number;

  totalCourses: number;
  publishedCoursesCount: number;
  draftCoursesCount: number;
  archivedCoursesCount: number;
  recentCourses: Course[];

  totalEnrollments: number;
  uniqueEnrolledTraineesCount: number;
  courseEnrollmentStats: CourseEnrollmentStat[];
  topEnrolledCourses: CourseEnrollmentStat[];

  totalAssessments: number;
  totalSubmissions: number;
  gradedAttemptsCount: number;
  averageScore: number | null;
  passedCount: number;
  failedCount: number;
  overallPassRate: number | null;

  userRoleDistribution: {
    trainees: number;
    approvedTrainers: number;
    pendingTrainers: number;
  };
  courseStatusDistribution: {
    published: number;
    draft: number;
    archived: number;
  };
  scoreDistribution: {
    under50: number;
    range50to69: number;
    range70to84: number;
    range85to100: number;
  };
}

export type NotificationType =
  | 'enrollment_success'
  | 'new_enrollment'
  | 'trainer_approved'
  | 'trainer_rejected'
  | 'trainer_pending_review'
  | 'assessment_result'
  | 'assessment_submitted'
  | 'new_resource'
  | 'system';

export interface AppNotification {
  id: string;
  recipientUid: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntityId?: string;
  relatedEntityType?: 'course' | 'assessment' | 'user' | 'resource' | 'attempt';
  isRead: boolean;
  createdAt: any;
  readAt?: any;
}

/**
 * Stage 8.3: Course Reviews & Ratings Data Models
 */
export interface CourseReview {
  id: string; // Deterministic: `${courseId}_${traineeId}`
  courseId: string;
  courseTitle?: string;
  traineeId: string;
  traineeName: string;
  rating: number; // 1-5 integer
  reviewText: string; // max 500 characters
  createdAt: any;
  updatedAt: any;
}

export interface CourseRatingStats {
  averageRating: number;
  totalReviews: number;
  distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

/**
 * Stage 9.2: Support Ticket Management Data Models
 */
export type SupportTicketStatus = 'open' | 'in_progress' | 'waiting_for_user' | 'resolved';

export type SupportTicketCategory =
  | 'general'
  | 'account'
  | 'enrollment'
  | 'course_content'
  | 'technical_issue'
  | 'billing_access';

export interface SupportTicket {
  id: string; // Document ID: e.g. "req_1729000000_abcd"
  requestId: string; // Deterministic or unique identifier matching doc id
  userId: string; // Firebase Auth UID of the submitting user
  userName: string; // Submitter's full name
  userEmail: string; // Submitter's email
  subject: string; // 3 - 150 chars
  category: SupportTicketCategory;
  message: string; // 10 - 2000 chars
  status: SupportTicketStatus;
  createdAt: any;
  updatedAt: any;
  lastResponseAt?: any;
  lastResponderRole?: 'admin' | 'user';
  lastResponderName?: string;
  ticketNumber?: string; // Formatted ticket code (e.g. TICK-7821)
}

export interface SupportReply {
  id: string; // Document ID
  ticketId: string; // Referenced SupportTicket ID
  authorUid: string; // Firebase Auth UID
  authorName: string;
  authorRole: 'admin' | 'user';
  message: string; // 2 - 1500 chars
  createdAt: any;
}

