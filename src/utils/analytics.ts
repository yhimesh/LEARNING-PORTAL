import {
  Course,
  CourseStatus,
  Enrollment,
  CourseProgress,
  Assessment,
  AssessmentResult,
  CourseAnalyticsItem,
  TrainerAnalyticsSummary,
} from '../types';

/**
 * Computes comprehensive analytics for a trainer's portfolio of courses.
 * Strictly respects course ownership, deduplicates learners across courses,
 * safely handles zero denominators, and excludes ungraded attempts from score averages.
 */
export function calculateTrainerAnalytics(params: {
  trainerId: string;
  courses: Course[];
  enrollments: Enrollment[];
  progressRecords: CourseProgress[];
  assessments: Assessment[];
  results: AssessmentResult[];
}): TrainerAnalyticsSummary {
  const { trainerId, courses, enrollments, progressRecords, assessments, results } = params;

  // Filter courses owned by this trainer
  const trainerCourses = courses.filter((c) => c && c.trainerId === trainerId);
  const courseIdSet = new Set(trainerCourses.map((c) => c.id));

  // Course status counts
  let publishedCoursesCount = 0;
  let draftCoursesCount = 0;
  let archivedCoursesCount = 0;

  for (const course of trainerCourses) {
    if (course.status === 'published') publishedCoursesCount++;
    else if (course.status === 'archived') archivedCoursesCount++;
    else draftCoursesCount++;
  }

  // Filter relevant records strictly by the trainer's course IDs
  const relevantEnrollments = enrollments.filter(
    (e) => e && e.courseId && courseIdSet.has(e.courseId)
  );
  const relevantProgress = progressRecords.filter(
    (p) => p && p.courseId && courseIdSet.has(p.courseId)
  );
  const relevantAssessments = assessments.filter(
    (a) => a && a.courseId && courseIdSet.has(a.courseId)
  );
  const relevantResults = results.filter(
    (r) =>
      r &&
      r.courseId &&
      courseIdSet.has(r.courseId) &&
      typeof r.percentage === 'number' &&
      !isNaN(r.percentage) &&
      (r.resultStatus === 'passed' || r.resultStatus === 'failed')
  );

  // Group enrollments by courseId and collect unique trainees
  const enrollmentsByCourse = new Map<string, Enrollment[]>();
  const allEnrolledTraineeIds = new Set<string>();

  for (const enrollment of relevantEnrollments) {
    if (enrollment.traineeId) {
      allEnrolledTraineeIds.add(enrollment.traineeId);
    }
    const list = enrollmentsByCourse.get(enrollment.courseId) || [];
    list.push(enrollment);
    enrollmentsByCourse.set(enrollment.courseId, list);
  }

  // Group progress records by courseId
  const progressByCourse = new Map<string, CourseProgress[]>();
  for (const p of relevantProgress) {
    const list = progressByCourse.get(p.courseId) || [];
    list.push(p);
    progressByCourse.set(p.courseId, list);
  }

  // Group assessments by courseId
  const assessmentsByCourse = new Map<string, Assessment[]>();
  for (const a of relevantAssessments) {
    const list = assessmentsByCourse.get(a.courseId) || [];
    list.push(a);
    assessmentsByCourse.set(a.courseId, list);
  }

  // Group results by courseId
  const resultsByCourse = new Map<string, AssessmentResult[]>();
  for (const r of relevantResults) {
    const list = resultsByCourse.get(r.courseId) || [];
    list.push(r);
    resultsByCourse.set(r.courseId, list);
  }

  // Aggregate progress metrics across all relevant progress records
  let sumProgressPercentages = 0;
  let completedLearnersCount = 0;
  let inProgressLearnersCount = 0;
  let notStartedLearnersCount = 0;

  for (const p of relevantProgress) {
    const pct = Math.min(100, Math.max(0, Number(p.progressPercentage) || 0));
    sumProgressPercentages += pct;

    if (p.status === 'completed' || pct >= 100) {
      completedLearnersCount++;
    } else if (p.status === 'in_progress' || pct > 0) {
      inProgressLearnersCount++;
    } else {
      notStartedLearnersCount++;
    }
  }

  // Also account for enrolled trainees who don't have a progress doc yet (not started)
  // If a trainee is enrolled in a course but no progress doc exists, count them as not started
  for (const [courseId, courseEnrollments] of enrollmentsByCourse.entries()) {
    const progressDocs = progressByCourse.get(courseId) || [];
    const traineesWithProgress = new Set(progressDocs.map((p) => p.traineeId));
    for (const enrollment of courseEnrollments) {
      if (!traineesWithProgress.has(enrollment.traineeId)) {
        notStartedLearnersCount++;
      }
    }
  }

  const totalProgressEntities = completedLearnersCount + inProgressLearnersCount + notStartedLearnersCount;
  const averageProgress =
    totalProgressEntities > 0
      ? Math.round((sumProgressPercentages / totalProgressEntities) * 10) / 10
      : 0;

  // Aggregate quiz results metrics
  let sumScorePercentages = 0;
  let passedSubmissionsCount = 0;
  let failedSubmissionsCount = 0;

  const scoreDistribution = {
    under50: 0,
    range50to69: 0,
    range70to84: 0,
    range85to100: 0,
  };

  for (const r of relevantResults) {
    const score = Math.min(100, Math.max(0, Number(r.percentage) || 0));
    sumScorePercentages += score;

    if (r.resultStatus === 'passed') {
      passedSubmissionsCount++;
    } else {
      failedSubmissionsCount++;
    }

    if (score < 50) scoreDistribution.under50++;
    else if (score < 70) scoreDistribution.range50to69++;
    else if (score < 85) scoreDistribution.range70to84++;
    else scoreDistribution.range85to100++;
  }

  const totalGradedSubmissions = relevantResults.length;
  const averageScore =
    totalGradedSubmissions > 0
      ? Math.round((sumScorePercentages / totalGradedSubmissions) * 10) / 10
      : null;

  const overallPassRate =
    totalGradedSubmissions > 0
      ? Math.round((passedSubmissionsCount / totalGradedSubmissions) * 100)
      : null;

  // Build course-by-course analytics item list
  const coursesAnalytics: CourseAnalyticsItem[] = trainerCourses.map((course) => {
    const courseEnrollments = enrollmentsByCourse.get(course.id) || [];
    const courseProgress = progressByCourse.get(course.id) || [];
    const courseAssessments = assessmentsByCourse.get(course.id) || [];
    const courseResults = resultsByCourse.get(course.id) || [];

    const courseUniqueTrainees = new Set(courseEnrollments.map((e) => e.traineeId));

    let courseSumProgress = 0;
    let courseCompleted = 0;
    let courseInProgress = 0;
    let courseNotStarted = 0;

    const progressTraineeIds = new Set<string>();
    for (const p of courseProgress) {
      progressTraineeIds.add(p.traineeId);
      const pct = Math.min(100, Math.max(0, Number(p.progressPercentage) || 0));
      courseSumProgress += pct;

      if (p.status === 'completed' || pct >= 100) {
        courseCompleted++;
      } else if (p.status === 'in_progress' || pct > 0) {
        courseInProgress++;
      } else {
        courseNotStarted++;
      }
    }

    // Account for enrolled trainees without progress docs
    for (const e of courseEnrollments) {
      if (!progressTraineeIds.has(e.traineeId)) {
        courseNotStarted++;
      }
    }

    const courseTotalTracked = courseCompleted + courseInProgress + courseNotStarted;
    const courseAvgProgress =
      courseTotalTracked > 0
        ? Math.round((courseSumProgress / courseTotalTracked) * 10) / 10
        : 0;

    let courseSumScore = 0;
    let coursePassed = 0;
    let courseFailed = 0;

    for (const r of courseResults) {
      courseSumScore += r.percentage;
      if (r.resultStatus === 'passed') coursePassed++;
      else courseFailed++;
    }

    const courseGradedCount = courseResults.length;
    const courseAvgScore =
      courseGradedCount > 0
        ? Math.round((courseSumScore / courseGradedCount) * 10) / 10
        : null;

    const coursePassRate =
      courseGradedCount > 0
        ? Math.round((coursePassed / courseGradedCount) * 100)
        : null;

    return {
      courseId: course.id,
      courseTitle: course.title,
      category: course.category,
      level: course.level,
      status: course.status,
      enrollmentCount: courseEnrollments.length,
      uniqueTraineesCount: courseUniqueTrainees.size,
      averageProgress: courseAvgProgress,
      completedCount: courseCompleted,
      inProgressCount: courseInProgress,
      notStartedCount: courseNotStarted,
      assessmentCount: courseAssessments.length,
      submissionCount: courseGradedCount,
      averageScore: courseAvgScore,
      passedCount: coursePassed,
      failedCount: courseFailed,
      passRate: coursePassRate,
    };
  });

  return {
    trainerId,
    totalCourses: trainerCourses.length,
    publishedCoursesCount,
    draftCoursesCount,
    archivedCoursesCount,
    totalEnrollments: relevantEnrollments.length,
    uniqueTraineesCount: allEnrolledTraineeIds.size,
    averageProgress,
    completedLearnersCount,
    inProgressLearnersCount,
    notStartedLearnersCount,
    totalAssessments: relevantAssessments.length,
    totalSubmissions: relevantResults.length,
    averageScore,
    passedSubmissionsCount,
    failedSubmissionsCount,
    overallPassRate,
    courses: coursesAnalytics,
    progressDistribution: {
      notStarted: notStartedLearnersCount,
      inProgress: inProgressLearnersCount,
      completed: completedLearnersCount,
    },
    scoreDistribution,
  };
}
