import test from 'node:test';
import assert from 'node:assert/strict';
import { generateCourseRecommendations } from './courseRecommendations';
import { Course } from '../types';

const MOCK_COURSES: Course[] = [
  {
    id: 'c-py-1',
    title: 'Python Essentials',
    description: 'Learn Python basics',
    category: 'Programming',
    level: 'Beginner',
    status: 'published',
    duration: '15 hours',
    trainerId: 'tr-1',
    trainerName: 'Dr. Turing',
  },
  {
    id: 'c-py-2',
    title: 'Advanced Python Architecture',
    description: 'Master decorators and metaclasses',
    category: 'Programming',
    level: 'Intermediate',
    status: 'published',
    duration: '25 hours',
    trainerId: 'tr-1',
    trainerName: 'Dr. Turing',
  },
  {
    id: 'c-ai-1',
    title: 'Applied Machine Learning',
    description: 'Build predictive models',
    category: 'AI and ML',
    level: 'Intermediate',
    status: 'published',
    duration: '30 hours',
    trainerId: 'tr-2',
    trainerName: 'Prof. Lovelace',
  },
  {
    id: 'c-db-1',
    title: 'Relational Database Design',
    description: 'SQL and schema normalization',
    category: 'Database',
    level: 'Beginner',
    status: 'published',
    duration: '12 hours',
    trainerId: 'tr-3',
    trainerName: 'Dr. Codd',
  },
  {
    id: 'c-draft-1',
    title: 'Draft Unreleased Course',
    description: 'In progress course',
    category: 'Programming',
    level: 'Beginner',
    status: 'draft',
    duration: '10 hours',
    trainerId: 'tr-1',
    trainerName: 'Dr. Turing',
  },
  {
    id: 'c-archived-1',
    title: 'Archived Legacy Course',
    description: 'Old course',
    category: 'Web Development',
    level: 'Beginner',
    status: 'archived',
    duration: '10 hours',
    trainerId: 'tr-1',
    trainerName: 'Dr. Turing',
  },
];

test('generateCourseRecommendations excludes enrolled courses', () => {
  // User is enrolled in Python Essentials
  const recommendations = generateCourseRecommendations(MOCK_COURSES, ['c-py-1']);
  const recommendedIds = recommendations.map((r) => r.course.id);

  assert.ok(!recommendedIds.includes('c-py-1'), 'Enrolled course must not be recommended');
});

test('generateCourseRecommendations excludes draft and archived courses', () => {
  const recommendations = generateCourseRecommendations(MOCK_COURSES, []);
  const recommendedIds = recommendations.map((r) => r.course.id);

  assert.ok(!recommendedIds.includes('c-draft-1'), 'Draft course must be excluded');
  assert.ok(!recommendedIds.includes('c-archived-1'), 'Archived course must be excluded');
});

test('generateCourseRecommendations prioritizes matching category and progression level', () => {
  // Learner completed Beginner Python (c-py-1)
  const recommendations = generateCourseRecommendations(MOCK_COURSES, ['c-py-1']);

  assert.ok(recommendations.length > 0);
  // Highest recommended should be Advanced Python Architecture (Intermediate in Programming)
  const topRecommendation = recommendations[0];
  assert.equal(topRecommendation.course.id, 'c-py-2');
  assert.equal(topRecommendation.reasonType, 'level_progression');
  assert.ok(topRecommendation.reason.includes('Programming'));
  assert.ok(topRecommendation.reason.includes('Intermediate'));
});

test('generateCourseRecommendations supports Enrollment objects in enrollment history', () => {
  const mockEnrollment = {
    id: 'enr-1',
    courseId: 'c-py-1',
    traineeId: 'user-1',
    courseTitle: 'Python Essentials',
    trainerName: 'Dr. Turing',
    enrolledAt: new Date(),
    status: 'active' as const,
  };

  const recommendations = generateCourseRecommendations(MOCK_COURSES, [mockEnrollment]);
  assert.ok(!recommendations.some((r) => r.course.id === 'c-py-1'));
  assert.equal(recommendations[0].course.id, 'c-py-2');
});

test('generateCourseRecommendations falls back cleanly for new learners with zero enrollments', () => {
  const recommendations = generateCourseRecommendations(MOCK_COURSES, []);

  assert.ok(recommendations.length >= 3);
  assert.ok(recommendations.every((r) => r.course.status === 'published'));
  assert.equal(recommendations[0].reasonType, 'popular');
  assert.ok(recommendations[0].reason.length > 0);
});

test('generateCourseRecommendations returns empty array if trainee is enrolled in all published courses', () => {
  const allPublishedIds = ['c-py-1', 'c-py-2', 'c-ai-1', 'c-db-1'];
  const recommendations = generateCourseRecommendations(MOCK_COURSES, allPublishedIds);

  assert.equal(recommendations.length, 0);
});

test('generateCourseRecommendations respects limit option', () => {
  const recommendations = generateCourseRecommendations(MOCK_COURSES, [], { limit: 2 });
  assert.equal(recommendations.length, 2);
});

test('generateCourseRecommendations incorporates real average rating as a ranking boost', () => {
  const coursesWithRating: Course[] = [
    {
      ...MOCK_COURSES[0],
      id: 'c-rated-1',
      averageRating: 4.9,
      reviewCount: 15,
      createdAt: { seconds: 100 },
    },
    {
      ...MOCK_COURSES[1],
      id: 'c-unrated-2',
      averageRating: undefined,
      reviewCount: 0,
      createdAt: { seconds: 200 },
    },
  ];

  // For a new learner, the highly rated course should receive a score boost
  const recommendations = generateCourseRecommendations(coursesWithRating, []);
  assert.equal(recommendations[0].course.id, 'c-rated-1');
  assert.ok(recommendations[0].reason.includes('Top rated'));
});

