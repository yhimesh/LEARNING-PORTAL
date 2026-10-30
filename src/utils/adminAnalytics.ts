import {
  UserProfile,
  Course,
  Enrollment,
  Assessment,
  AssessmentResult,
  AdminPlatformAnalyticsSummary,
  CourseEnrollmentStat,
} from '../types';

export interface AdminAnalyticsParams {
  users: UserProfile[];
  courses: Course[];
  enrollments: Enrollment[];
  assessments: Assessment[];
  results: AssessmentResult[];
}

/**
 * Pure calculation logic for platform-wide Admin Analytics.
 * Deterministic, resilient to empty or missing data, and excludes ungraded attempts.
 */
export function calculateAdminPlatformAnalytics({
  users = [],
  courses = [],
  enrollments = [],
  assessments = [],
  results = [],
}: AdminAnalyticsParams): AdminPlatformAnalyticsSummary {
  // 1. User Role & Status Breakdown
  const totalUsers = users.length;
  let traineesCount = 0;
  let activeTraineesCount = 0;
  let totalTrainersCount = 0;
  let pendingTrainersCount = 0;
  let approvedTrainersCount = 0;
  let otherUsersCount = 0;

  for (const user of users) {
    if (user.requestedRole === 'Trainee') {
      traineesCount++;
      if (user.accountStatus === 'active') {
        activeTraineesCount++;
      }
    } else if (user.requestedRole === 'Trainer') {
      totalTrainersCount++;
      if (user.accountStatus === 'active') {
        approvedTrainersCount++;
      } else if (user.accountStatus === 'pending') {
        pendingTrainersCount++;
      }
    } else {
      otherUsersCount++;
    }
  }

  // 2. Course Status Breakdown
  const totalCourses = courses.length;
  let publishedCoursesCount = 0;
  let draftCoursesCount = 0;
  let archivedCoursesCount = 0;

  for (const c of courses) {
    if (c.status === 'published') {
      publishedCoursesCount++;
    } else if (c.status === 'draft') {
      draftCoursesCount++;
    } else if (c.status === 'archived') {
      archivedCoursesCount++;
    }
  }

  // Sort recent courses by creation timestamp descending
  const recentCourses = [...courses].sort((a, b) => {
    const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
    const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
    return timeB - timeA;
  }).slice(0, 5);

  // 3. Deduplicate Enrollments to avoid double-counting
  const seenEnrollments = new Set<string>();
  const uniqueEnrollments: Enrollment[] = [];
  const uniqueTraineeIds = new Set<string>();

  for (const enr of enrollments) {
    const key = `${enr.traineeId}_${enr.courseId}`;
    if (!seenEnrollments.has(key)) {
      seenEnrollments.add(key);
      uniqueEnrollments.push(enr);
      if (enr.traineeId) {
        uniqueTraineeIds.add(enr.traineeId);
      }
    }
  }

  const totalEnrollments = uniqueEnrollments.length;
  const uniqueEnrolledTraineesCount = uniqueTraineeIds.size;

  // 4. Group enrollments, assessments, and results by courseId
  const enrollmentsByCourse = new Map<string, number>();
  for (const enr of uniqueEnrollments) {
    enrollmentsByCourse.set(enr.courseId, (enrollmentsByCourse.get(enr.courseId) || 0) + 1);
  }

  const assessmentsByCourse = new Map<string, number>();
  for (const a of assessments) {
    assessmentsByCourse.set(a.courseId, (assessmentsByCourse.get(a.courseId) || 0) + 1);
  }

  const resultsByCourse = new Map<string, AssessmentResult[]>();
  for (const r of results) {
    if (!resultsByCourse.has(r.courseId)) {
      resultsByCourse.set(r.courseId, []);
    }
    resultsByCourse.get(r.courseId)!.push(r);
  }

  const courseEnrollmentStats: CourseEnrollmentStat[] = courses.map((c) => {
    const courseRes = resultsByCourse.get(c.id) || [];
    const validScores = courseRes
      .filter((r) => typeof r.percentage === 'number' && !isNaN(r.percentage))
      .map((r) => r.percentage);

    const avgScore = validScores.length > 0
      ? Math.round(validScores.reduce((acc, s) => acc + s, 0) / validScores.length)
      : null;

    return {
      courseId: c.id,
      courseTitle: c.title,
      category: c.category || 'General',
      trainerName: c.trainerName || 'Faculty Instructor',
      trainerId: c.trainerId || '',
      status: c.status,
      enrollmentCount: enrollmentsByCourse.get(c.id) || 0,
      assessmentCount: assessmentsByCourse.get(c.id) || 0,
      submissionCount: courseRes.length,
      averageScore: avgScore,
      createdAt: c.createdAt,
    };
  });

  // Top enrolled courses sorted descending by enrollmentCount
  const topEnrolledCourses = [...courseEnrollmentStats]
    .sort((a, b) => b.enrollmentCount - a.enrollmentCount)
    .slice(0, 10);

  // 5. Assessment Metrics & Score Distributions
  const totalAssessments = assessments.length;
  const totalSubmissions = results.length;

  let passedCount = 0;
  let failedCount = 0;
  const gradedScores: number[] = [];

  const scoreDistribution = {
    under50: 0,
    range50to69: 0,
    range70to84: 0,
    range85to100: 0,
  };

  for (const r of results) {
    if (r.resultStatus === 'passed') {
      passedCount++;
    } else if (r.resultStatus === 'failed') {
      failedCount++;
    }

    if (typeof r.percentage === 'number' && !isNaN(r.percentage)) {
      const p = Math.max(0, Math.min(100, Math.round(r.percentage)));
      gradedScores.push(p);

      if (p < 50) {
        scoreDistribution.under50++;
      } else if (p < 70) {
        scoreDistribution.range50to69++;
      } else if (p < 85) {
        scoreDistribution.range70to84++;
      } else {
        scoreDistribution.range85to100++;
      }
    }
  }

  const gradedAttemptsCount = gradedScores.length;
  const averageScore = gradedAttemptsCount > 0
    ? Math.round(gradedScores.reduce((acc, s) => acc + s, 0) / gradedAttemptsCount)
    : null;

  const overallPassRate = gradedAttemptsCount > 0
    ? Math.round((passedCount / gradedAttemptsCount) * 100)
    : null;

  return {
    totalUsers,
    traineesCount,
    activeTraineesCount,
    totalTrainersCount,
    pendingTrainersCount,
    approvedTrainersCount,
    otherUsersCount,

    totalCourses,
    publishedCoursesCount,
    draftCoursesCount,
    archivedCoursesCount,
    recentCourses,

    totalEnrollments,
    uniqueEnrolledTraineesCount,
    courseEnrollmentStats,
    topEnrolledCourses,

    totalAssessments,
    totalSubmissions,
    gradedAttemptsCount,
    averageScore,
    passedCount,
    failedCount,
    overallPassRate,

    userRoleDistribution: {
      trainees: traineesCount,
      approvedTrainers: approvedTrainersCount,
      pendingTrainers: pendingTrainersCount,
    },
    courseStatusDistribution: {
      published: publishedCoursesCount,
      draft: draftCoursesCount,
      archived: archivedCoursesCount,
    },
    scoreDistribution,
  };
}
