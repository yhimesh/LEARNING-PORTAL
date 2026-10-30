import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateTrainerAnalytics } from './analytics';
import { Course, Enrollment, CourseProgress, Assessment, AssessmentResult } from '../types';

test('calculateTrainerAnalytics handles empty inputs safely without division by zero', () => {
  const result = calculateTrainerAnalytics({
    trainerId: 'trainer-1',
    courses: [],
    enrollments: [],
    progressRecords: [],
    assessments: [],
    results: [],
  });

  assert.equal(result.totalCourses, 0);
  assert.equal(result.publishedCoursesCount, 0);
  assert.equal(result.draftCoursesCount, 0);
  assert.equal(result.archivedCoursesCount, 0);
  assert.equal(result.totalEnrollments, 0);
  assert.equal(result.uniqueTraineesCount, 0);
  assert.equal(result.averageProgress, 0);
  assert.equal(result.totalSubmissions, 0);
  assert.equal(result.averageScore, null);
  assert.equal(result.overallPassRate, null);
  assert.equal(result.courses.length, 0);
  assert.deepEqual(result.progressDistribution, { notStarted: 0, inProgress: 0, completed: 0 });
  assert.deepEqual(result.scoreDistribution, { under50: 0, range50to69: 0, range70to84: 0, range85to100: 0 });
});

test('calculateTrainerAnalytics filters strictly to courses owned by the trainer', () => {
  const courses: Course[] = [
    {
      id: 'course-1',
      title: 'Python Core',
      description: 'Intro to python',
      category: 'Programming',
      level: 'Beginner',
      duration: '10 hours',
      trainerId: 'trainer-1',
      trainerName: 'Trainer One',
      status: 'published',
    },
    {
      id: 'course-2',
      title: 'Other Trainer Course',
      description: 'Other description',
      category: 'Database',
      level: 'Intermediate',
      duration: '20 hours',
      trainerId: 'trainer-OTHER',
      trainerName: 'Other Trainer',
      status: 'published',
    },
  ];

  const enrollments: Enrollment[] = [
    {
      id: 't1_course-1',
      courseId: 'course-1',
      traineeId: 't1',
      courseTitle: 'Python Core',
      trainerName: 'Trainer One',
      enrolledAt: new Date(),
      status: 'active',
    },
    {
      id: 't2_course-2',
      courseId: 'course-2',
      traineeId: 't2',
      courseTitle: 'Other Trainer Course',
      trainerName: 'Other Trainer',
      enrolledAt: new Date(),
      status: 'active',
    },
  ];

  const result = calculateTrainerAnalytics({
    trainerId: 'trainer-1',
    courses,
    enrollments,
    progressRecords: [],
    assessments: [],
    results: [],
  });

  // Only course-1 should be included
  assert.equal(result.totalCourses, 1);
  assert.equal(result.publishedCoursesCount, 1);
  assert.equal(result.totalEnrollments, 1);
  assert.equal(result.uniqueTraineesCount, 1);
  assert.equal(result.courses.length, 1);
  assert.equal(result.courses[0].courseId, 'course-1');
});

test('calculateTrainerAnalytics deduplicates trainees enrolled across multiple courses', () => {
  const courses: Course[] = [
    {
      id: 'course-a',
      title: 'Web Dev',
      description: 'Web development intro',
      category: 'Web Development',
      level: 'Beginner',
      duration: '10 hours',
      trainerId: 'trainer-1',
      trainerName: 'Trainer One',
      status: 'published',
    },
    {
      id: 'course-b',
      title: 'Fullstack JS',
      description: 'Advanced JS',
      category: 'Web Development',
      level: 'Advanced',
      duration: '15 hours',
      trainerId: 'trainer-1',
      trainerName: 'Trainer One',
      status: 'draft',
    },
  ];

  // Learner 'trainee-alice' is enrolled in both courses, 'trainee-bob' only in course-a
  const enrollments: Enrollment[] = [
    {
      id: 'alice_course-a',
      courseId: 'course-a',
      traineeId: 'trainee-alice',
      courseTitle: 'Web Dev',
      trainerName: 'Trainer One',
      enrolledAt: new Date(),
      status: 'active',
    },
    {
      id: 'alice_course-b',
      courseId: 'course-b',
      traineeId: 'trainee-alice',
      courseTitle: 'Fullstack JS',
      trainerName: 'Trainer One',
      enrolledAt: new Date(),
      status: 'active',
    },
    {
      id: 'bob_course-a',
      courseId: 'course-a',
      traineeId: 'trainee-bob',
      courseTitle: 'Web Dev',
      trainerName: 'Trainer One',
      enrolledAt: new Date(),
      status: 'active',
    },
  ];

  const result = calculateTrainerAnalytics({
    trainerId: 'trainer-1',
    courses,
    enrollments,
    progressRecords: [],
    assessments: [],
    results: [],
  });

  // Total enrollments is 3, but unique trainees is 2 (Alice & Bob)
  assert.equal(result.totalEnrollments, 3);
  assert.equal(result.uniqueTraineesCount, 2);
  assert.equal(result.publishedCoursesCount, 1);
  assert.equal(result.draftCoursesCount, 1);
});

test('calculateTrainerAnalytics calculates progress distributions and averages correctly', () => {
  const courses: Course[] = [
    {
      id: 'course-c',
      title: 'Cloud Architecture',
      description: 'Cloud design patterns',
      category: 'Computer Science',
      level: 'Advanced',
      duration: '30 hours',
      trainerId: 'trainer-1',
      trainerName: 'Trainer One',
      status: 'published',
    },
  ];

  const enrollments: Enrollment[] = [
    { id: 'u1_c', courseId: 'course-c', traineeId: 'u1', courseTitle: 'Cloud Architecture', trainerName: 'Trainer One', enrolledAt: new Date(), status: 'active' },
    { id: 'u2_c', courseId: 'course-c', traineeId: 'u2', courseTitle: 'Cloud Architecture', trainerName: 'Trainer One', enrolledAt: new Date(), status: 'active' },
    { id: 'u3_c', courseId: 'course-c', traineeId: 'u3', courseTitle: 'Cloud Architecture', trainerName: 'Trainer One', enrolledAt: new Date(), status: 'active' },
  ];

  // u1 is 100% completed, u2 is 50% in progress, u3 has no progress record (0%)
  const progressRecords: CourseProgress[] = [
    {
      id: 'u1_course-c',
      courseId: 'course-c',
      traineeId: 'u1',
      completedResourceIds: ['r1', 'r2'],
      completedResourceCount: 2,
      totalResourceCount: 2,
      progressPercentage: 100,
      status: 'completed',
    },
    {
      id: 'u2_course-c',
      courseId: 'course-c',
      traineeId: 'u2',
      completedResourceIds: ['r1'],
      completedResourceCount: 1,
      totalResourceCount: 2,
      progressPercentage: 50,
      status: 'in_progress',
    },
  ];

  const result = calculateTrainerAnalytics({
    trainerId: 'trainer-1',
    courses,
    enrollments,
    progressRecords,
    assessments: [],
    results: [],
  });

  // u1: 100%, u2: 50%, u3: 0% -> sum: 150 / 3 = 50%
  assert.equal(result.averageProgress, 50);
  assert.equal(result.completedLearnersCount, 1);
  assert.equal(result.inProgressLearnersCount, 1);
  assert.equal(result.notStartedLearnersCount, 1);
  assert.deepEqual(result.progressDistribution, {
    notStarted: 1,
    inProgress: 1,
    completed: 1,
  });
});

test('calculateTrainerAnalytics handles graded quiz results and excludes invalid or other courses', () => {
  const courses: Course[] = [
    {
      id: 'course-q',
      title: 'DevOps Essentials',
      description: 'CI/CD pipeline and automation',
      category: 'Computer Science',
      level: 'Intermediate',
      duration: '12 hours',
      trainerId: 'trainer-1',
      trainerName: 'Trainer One',
      status: 'published',
    },
  ];

  const assessments: Assessment[] = [
    {
      id: 'quiz-1',
      title: 'CI/CD Checkpoint',
      description: 'Quiz 1',
      courseId: 'course-q',
      trainerId: 'trainer-1',
      passingPercentage: 70,
      status: 'published',
      totalMarks: 20,
      questionCount: 2,
      questions: [],
    },
  ];

  const results: AssessmentResult[] = [
    {
      id: 'u1_quiz-1',
      attemptId: 'u1_quiz-1',
      assessmentId: 'quiz-1',
      courseId: 'course-q',
      traineeId: 'u1',
      assessmentTitle: 'CI/CD Checkpoint',
      courseTitle: 'DevOps Essentials',
      totalQuestions: 2,
      correctAnswers: 2,
      incorrectAnswers: 0,
      unansweredCount: 0,
      totalMarks: 20,
      marksObtained: 20,
      percentage: 100,
      passingPercentage: 70,
      resultStatus: 'passed',
      submittedAt: new Date(),
      gradedAt: new Date(),
    },
    {
      id: 'u2_quiz-1',
      attemptId: 'u2_quiz-1',
      assessmentId: 'quiz-1',
      courseId: 'course-q',
      traineeId: 'u2',
      assessmentTitle: 'CI/CD Checkpoint',
      courseTitle: 'DevOps Essentials',
      totalQuestions: 2,
      correctAnswers: 1,
      incorrectAnswers: 1,
      unansweredCount: 0,
      totalMarks: 20,
      marksObtained: 10,
      percentage: 50,
      passingPercentage: 70,
      resultStatus: 'failed',
      submittedAt: new Date(),
      gradedAt: new Date(),
    },
  ];

  const summary = calculateTrainerAnalytics({
    trainerId: 'trainer-1',
    courses,
    enrollments: [],
    progressRecords: [],
    assessments,
    results,
  });

  assert.equal(summary.totalAssessments, 1);
  assert.equal(summary.totalSubmissions, 2);
  // (100 + 50) / 2 = 75
  assert.equal(summary.averageScore, 75);
  assert.equal(summary.passedSubmissionsCount, 1);
  assert.equal(summary.failedSubmissionsCount, 1);
  assert.equal(summary.overallPassRate, 50); // 1 passed out of 2 = 50%
  assert.equal(summary.scoreDistribution.range85to100, 1); // 100%
  assert.equal(summary.scoreDistribution.range50to69, 1); // 50%
});
