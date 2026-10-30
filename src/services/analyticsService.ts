import {
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  Course,
  Enrollment,
  CourseProgress,
  Assessment,
  AssessmentResult,
  TrainerAnalyticsSummary,
} from '../types';
import { calculateTrainerAnalytics } from '../utils/analytics';
import { getTrainerCourses } from './courseService';

/**
 * Retrieves comprehensive analytics for an approved trainer directly from Firestore
 * using the authenticated client session.
 */
export async function fetchTrainerAnalytics(
  trainerId: string,
  cachedCourses?: Course[]
): Promise<TrainerAnalyticsSummary> {
  if (!trainerId) {
    throw new Error('Trainer UID is required to fetch analytics.');
  }
  try {
    const courses = cachedCourses && cachedCourses.length > 0
      ? cachedCourses
      : await getTrainerCourses(trainerId);

    if (!courses || courses.length === 0) {
      return calculateTrainerAnalytics({
        trainerId,
        courses: [],
        enrollments: [],
        progressRecords: [],
        assessments: [],
        results: [],
      });
    }

    const courseIds = courses.map((c) => c.id);

    // Fetch enrollments for trainer courses
    const enrollments: Enrollment[] = [];
    for (let i = 0; i < courseIds.length; i += 10) {
      const chunk = courseIds.slice(i, i + 10);
      try {
        const eq = query(collection(db, 'enrollments'), where('courseId', 'in', chunk));
        const esnap = await getDocs(eq);
        esnap.forEach((d) => {
          const data = d.data();
          enrollments.push({
            id: d.id,
            courseId: data.courseId,
            traineeId: data.traineeId,
            courseTitle: data.courseTitle || '',
            trainerName: data.trainerName || '',
            enrolledAt: data.enrolledAt,
            status: data.status || 'active',
          });
        });
      } catch (err) {
        console.warn('Notice: Error fetching enrollments chunk:', err);
      }
    }

    // Fetch progress records for trainer courses
    const progressRecords: CourseProgress[] = [];
    for (let i = 0; i < courseIds.length; i += 10) {
      const chunk = courseIds.slice(i, i + 10);
      try {
        const pq = query(collection(db, 'courseProgress'), where('courseId', 'in', chunk));
        const psnap = await getDocs(pq);
        psnap.forEach((d) => {
          const data = d.data();
          progressRecords.push({
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
            status: data.status || 'not_started',
          });
        });
      } catch (err) {
        console.warn('Notice: Error fetching progress chunk:', err);
      }
    }

    // Fetch assessments for trainer courses
    const assessments: Assessment[] = [];
    for (let i = 0; i < courseIds.length; i += 10) {
      const chunk = courseIds.slice(i, i + 10);
      try {
        const aq = query(collection(db, 'assessments'), where('courseId', 'in', chunk));
        const asnap = await getDocs(aq);
        asnap.forEach((d) => {
          const data = d.data();
          assessments.push({
            id: d.id,
            title: data.title || '',
            description: data.description || '',
            courseId: data.courseId,
            trainerId: data.trainerId,
            passingPercentage: Number(data.passingPercentage) || 70,
            status: data.status || 'published',
            totalMarks: Number(data.totalMarks) || 0,
            questionCount: Number(data.questionCount) || 0,
            questions: [],
          });
        });
      } catch (err) {
        console.warn('Notice: Error fetching assessments chunk:', err);
      }
    }

    // Fetch assessment results for trainer courses
    const results: AssessmentResult[] = [];
    for (let i = 0; i < courseIds.length; i += 10) {
      const chunk = courseIds.slice(i, i + 10);
      try {
        const rq = query(collection(db, 'assessmentResults'), where('courseId', 'in', chunk));
        const rsnap = await getDocs(rq);
        rsnap.forEach((d) => {
          const data = d.data();
          results.push({
            id: d.id,
            attemptId: data.attemptId || d.id,
            assessmentId: data.assessmentId,
            courseId: data.courseId,
            traineeId: data.traineeId,
            assessmentTitle: data.assessmentTitle || '',
            courseTitle: data.courseTitle || '',
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
          });
        });
      } catch (err) {
        console.warn('Notice: Error fetching results chunk:', err);
      }
    }

    return calculateTrainerAnalytics({
      trainerId,
      courses,
      enrollments,
      progressRecords,
      assessments,
      results,
    });
  } catch (error: any) {
    console.error('Failed to compile trainer analytics:', error);
    handleFirestoreError(error, OperationType.LIST, `analytics/trainers/${trainerId}`);
  }
}
