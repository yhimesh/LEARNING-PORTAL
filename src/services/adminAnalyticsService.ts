import {
  collection,
  getDocs,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  UserProfile,
  Course,
  Enrollment,
  Assessment,
  AssessmentResult,
  AdminPlatformAnalyticsSummary,
} from '../types';
import { calculateAdminPlatformAnalytics } from '../utils/adminAnalytics';

/**
 * Validates whether the currently signed-in user has authoritative administrative rights.
 */
export function checkIsAdminUser(): boolean {
  const user = auth.currentUser;
  if (!user || !user.email) return false;

  const email = user.email.toLowerCase().trim();
  return (
    email === 'yhimeshc@gmail.com' ||
    email === 'admin@capacityconnect.edu'
  );
}

export interface AdminAnalyticsData {
  summary: AdminPlatformAnalyticsSummary;
  users: UserProfile[];
  courses: Course[];
  enrollments: Enrollment[];
  results: AssessmentResult[];
}

/**
 * Authoritatively retrieves platform-wide analytics across all collections.
 * Enforces admin authorization both on client and via Firestore Security Rules.
 */
export async function fetchAdminPlatformAnalytics(): Promise<AdminAnalyticsData> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Authentication required: Please sign in as an authorized administrator.');
  }

  if (!checkIsAdminUser()) {
    throw new Error('Access denied: You do not possess administrative permissions to view platform analytics.');
  }

  try {
    // 1. Fetch Users
    const usersSnap = await getDocs(collection(db, 'users'));
    const users: UserProfile[] = usersSnap.docs.map((d) => {
      const data = d.data();
      return {
        uid: d.id,
        fullName: data.fullName || 'Registered User',
        email: data.email || '',
        requestedRole: data.requestedRole || 'Trainee',
        accountStatus: data.accountStatus || 'active',
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
    });

    // 2. Fetch Courses
    const coursesSnap = await getDocs(collection(db, 'courses'));
    const courses: Course[] = coursesSnap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        title: data.title || '',
        description: data.description || '',
        shortDescription: data.shortDescription || data.description || '',
        fullDescription: data.fullDescription || data.description || '',
        category: data.category || 'General',
        level: data.level || 'Beginner',
        duration: data.duration || '',
        trainerId: data.trainerId || '',
        trainerName: data.trainerName || 'Faculty Instructor',
        status: data.status || 'draft',
        syllabus: Array.isArray(data.syllabus) ? data.syllabus : [],
        prerequisites: data.prerequisites || '',
        outcomes: Array.isArray(data.outcomes) ? data.outcomes : [],
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
    });

    // 3. Fetch Enrollments
    const enrollmentsSnap = await getDocs(collection(db, 'enrollments'));
    const enrollments: Enrollment[] = enrollmentsSnap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        courseId: data.courseId,
        traineeId: data.traineeId,
        courseTitle: data.courseTitle || '',
        trainerName: data.trainerName || '',
        enrolledAt: data.enrolledAt,
        status: data.status || 'active',
      };
    });

    // 4. Fetch Assessments (without answer keys to maintain security)
    const assessmentsSnap = await getDocs(collection(db, 'assessments'));
    const assessments: Assessment[] = assessmentsSnap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        title: data.title || '',
        description: data.description || '',
        courseId: data.courseId,
        trainerId: data.trainerId,
        trainerName: data.trainerName,
        passingPercentage: Number(data.passingPercentage) || 70,
        status: data.status || 'published',
        totalMarks: Number(data.totalMarks) || 0,
        questionCount: Number(data.questionCount) || 0,
        questions: [],
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
    });

    // 5. Fetch Assessment Results
    const resultsSnap = await getDocs(collection(db, 'assessmentResults'));
    const results: AssessmentResult[] = resultsSnap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        attemptId: data.attemptId || d.id,
        assessmentId: data.assessmentId,
        courseId: data.courseId,
        traineeId: data.traineeId,
        traineeName: data.traineeName || 'Trainee Learner',
        traineeEmail: data.traineeEmail || '',
        assessmentTitle: data.assessmentTitle || 'Quiz',
        courseTitle: data.courseTitle || 'Course',
        totalQuestions: Number(data.totalQuestions) || 0,
        correctAnswers: Number(data.correctAnswers) || 0,
        incorrectAnswers: Number(data.incorrectAnswers) || 0,
        unansweredCount: Number(data.unansweredCount) || 0,
        totalMarks: Number(data.totalMarks) || 0,
        marksObtained: Number(data.marksObtained) || 0,
        percentage: Number(data.percentage) || 0,
        passingPercentage: Number(data.passingPercentage) || 70,
        resultStatus: data.resultStatus,
        submittedAt: data.submittedAt,
        gradedAt: data.gradedAt,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
    });

    const summary = calculateAdminPlatformAnalytics({
      users,
      courses,
      enrollments,
      assessments,
      results,
    });

    return {
      summary,
      users,
      courses,
      enrollments,
      results,
    };
  } catch (error: any) {
    console.error('Failed to fetch platform analytics from Firestore:', error);
    handleFirestoreError(error, OperationType.LIST, 'admin/analytics');
  }
}
