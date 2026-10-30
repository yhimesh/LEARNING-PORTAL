import test from 'node:test';
import assert from 'node:assert';
import { calculateAdminPlatformAnalytics } from './adminAnalytics';
import { UserProfile, Course, Enrollment, Assessment, AssessmentResult } from '../types';

test('calculateAdminPlatformAnalytics handles empty datasets safely without division by zero', () => {
  const result = calculateAdminPlatformAnalytics({
    users: [],
    courses: [],
    enrollments: [],
    assessments: [],
    results: [],
  });

  assert.strictEqual(result.totalUsers, 0);
  assert.strictEqual(result.traineesCount, 0);
  assert.strictEqual(result.activeTraineesCount, 0);
  assert.strictEqual(result.totalTrainersCount, 0);
  assert.strictEqual(result.pendingTrainersCount, 0);
  assert.strictEqual(result.approvedTrainersCount, 0);
  assert.strictEqual(result.totalCourses, 0);
  assert.strictEqual(result.totalEnrollments, 0);
  assert.strictEqual(result.uniqueEnrolledTraineesCount, 0);
  assert.strictEqual(result.averageScore, null);
  assert.strictEqual(result.overallPassRate, null);
  assert.strictEqual(result.topEnrolledCourses.length, 0);
});

test('calculateAdminPlatformAnalytics aggregates users by role and account status accurately', () => {
  const users: UserProfile[] = [
    { uid: 'u1', fullName: 'Alice Trainee', email: 'alice@example.com', requestedRole: 'Trainee', accountStatus: 'active' },
    { uid: 'u2', fullName: 'Bob Trainee', email: 'bob@example.com', requestedRole: 'Trainee', accountStatus: 'active' },
    { uid: 'u3', fullName: 'Charlie Pending Trainee', email: 'charlie@example.com', requestedRole: 'Trainee', accountStatus: 'pending' },
    { uid: 'u4', fullName: 'Dr. Dave Approved', email: 'dave@example.com', requestedRole: 'Trainer', accountStatus: 'active' },
    { uid: 'u5', fullName: 'Prof. Eve Pending', email: 'eve@example.com', requestedRole: 'Trainer', accountStatus: 'pending' },
  ];

  const result = calculateAdminPlatformAnalytics({
    users,
    courses: [],
    enrollments: [],
    assessments: [],
    results: [],
  });

  assert.strictEqual(result.totalUsers, 5);
  assert.strictEqual(result.traineesCount, 3);
  assert.strictEqual(result.activeTraineesCount, 2);
  assert.strictEqual(result.totalTrainersCount, 2);
  assert.strictEqual(result.approvedTrainersCount, 1);
  assert.strictEqual(result.pendingTrainersCount, 1);
  assert.strictEqual(result.userRoleDistribution.trainees, 3);
  assert.strictEqual(result.userRoleDistribution.approvedTrainers, 1);
  assert.strictEqual(result.userRoleDistribution.pendingTrainers, 1);
});

test('calculateAdminPlatformAnalytics deduplicates enrollments and identifies top courses', () => {
  const courses: Course[] = [
    {
      id: 'c1',
      title: 'Python for Beginners',
      description: 'Basics of Python programming',
      category: 'Software Engineering',
      level: 'Beginner',
      duration: '10 hours',
      trainerId: 't1',
      trainerName: 'Dr. Dave',
      status: 'published',
    },
    {
      id: 'c2',
      title: 'Advanced AI Architectures',
      description: 'Deep neural models',
      category: 'Artificial Intelligence',
      level: 'Advanced',
      duration: '40 hours',
      trainerId: 't1',
      trainerName: 'Dr. Dave',
      status: 'published',
    },
    {
      id: 'c3',
      title: 'Draft Cloud Course',
      description: 'Draft cloud computing',
      category: 'Cloud',
      level: 'Intermediate',
      duration: '15 hours',
      trainerId: 't1',
      trainerName: 'Dr. Dave',
      status: 'draft',
    },
  ];

  const enrollments: Enrollment[] = [
    { id: 'u1_c1', traineeId: 'u1', courseId: 'c1', courseTitle: 'Python for Beginners', trainerName: 'Dr. Dave', enrolledAt: new Date(), status: 'active' },
    // Duplicate enrollment attempt for u1 in c1 should be deduplicated
    { id: 'u1_c1_dup', traineeId: 'u1', courseId: 'c1', courseTitle: 'Python for Beginners', trainerName: 'Dr. Dave', enrolledAt: new Date(), status: 'active' },
    { id: 'u2_c1', traineeId: 'u2', courseId: 'c1', courseTitle: 'Python for Beginners', trainerName: 'Dr. Dave', enrolledAt: new Date(), status: 'active' },
    { id: 'u2_c2', traineeId: 'u2', courseId: 'c2', courseTitle: 'Advanced AI Architectures', trainerName: 'Dr. Dave', enrolledAt: new Date(), status: 'active' },
  ];

  const result = calculateAdminPlatformAnalytics({
    users: [],
    courses,
    enrollments,
    assessments: [],
    results: [],
  });

  assert.strictEqual(result.totalCourses, 3);
  assert.strictEqual(result.publishedCoursesCount, 2);
  assert.strictEqual(result.draftCoursesCount, 1);
  assert.strictEqual(result.archivedCoursesCount, 0);

  // 3 unique enrollments (u1-c1, u2-c1, u2-c2)
  assert.strictEqual(result.totalEnrollments, 3);
  assert.strictEqual(result.uniqueEnrolledTraineesCount, 2);

  // Top enrolled course is c1 with 2 enrollments
  assert.strictEqual(result.topEnrolledCourses[0].courseId, 'c1');
  assert.strictEqual(result.topEnrolledCourses[0].enrollmentCount, 2);
  assert.strictEqual(result.topEnrolledCourses[1].courseId, 'c2');
  assert.strictEqual(result.topEnrolledCourses[1].enrollmentCount, 1);
});

test('calculateAdminPlatformAnalytics calculates assessment scores, pass rate, and buckets correctly', () => {
  const results: AssessmentResult[] = [
    {
      id: 'r1',
      attemptId: 'a1',
      assessmentId: 'asm1',
      courseId: 'c1',
      traineeId: 'u1',
      assessmentTitle: 'Quiz 1',
      courseTitle: 'Python Course',
      unansweredCount: 0,
      totalQuestions: 10,
      correctAnswers: 9,
      incorrectAnswers: 1,
      totalMarks: 10,
      marksObtained: 9,
      percentage: 90,
      passingPercentage: 70,
      resultStatus: 'passed',
      submittedAt: new Date(),
      gradedAt: new Date(),
    },
    {
      id: 'r2',
      attemptId: 'a2',
      assessmentId: 'asm1',
      courseId: 'c1',
      traineeId: 'u2',
      assessmentTitle: 'Quiz 1',
      courseTitle: 'Python Course',
      unansweredCount: 0,
      totalQuestions: 10,
      correctAnswers: 6,
      incorrectAnswers: 4,
      totalMarks: 10,
      marksObtained: 6,
      percentage: 60,
      passingPercentage: 70,
      resultStatus: 'failed',
      submittedAt: new Date(),
      gradedAt: new Date(),
    },
    {
      id: 'r3',
      attemptId: 'a3',
      assessmentId: 'asm2',
      courseId: 'c2',
      traineeId: 'u3',
      assessmentTitle: 'Quiz 2',
      courseTitle: 'AI Course',
      unansweredCount: 0,
      totalQuestions: 10,
      correctAnswers: 4,
      incorrectAnswers: 6,
      totalMarks: 10,
      marksObtained: 4,
      percentage: 40,
      passingPercentage: 70,
      resultStatus: 'failed',
      submittedAt: new Date(),
      gradedAt: new Date(),
    },
  ];

  const result = calculateAdminPlatformAnalytics({
    users: [],
    courses: [],
    enrollments: [],
    assessments: [],
    results,
  });

  assert.strictEqual(result.totalSubmissions, 3);
  assert.strictEqual(result.gradedAttemptsCount, 3);
  // (90 + 60 + 40) / 3 = 190 / 3 = 63.33 -> 63
  assert.strictEqual(result.averageScore, 63);
  assert.strictEqual(result.passedCount, 1);
  assert.strictEqual(result.failedCount, 2);
  // 1 / 3 = 33%
  assert.strictEqual(result.overallPassRate, 33);

  // Distribution buckets
  assert.strictEqual(result.scoreDistribution.under50, 1); // 40
  assert.strictEqual(result.scoreDistribution.range50to69, 1); // 60
  assert.strictEqual(result.scoreDistribution.range70to84, 0);
  assert.strictEqual(result.scoreDistribution.range85to100, 1); // 90
});
