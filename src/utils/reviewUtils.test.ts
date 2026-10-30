import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateReviewDocId,
  validateReviewInput,
  calculateRatingStats,
  formatReviewDate,
} from './reviewUtils';
import { CourseReview } from '../types';

test('generateReviewDocId creates deterministic key from courseId and traineeId', () => {
  const docId = generateReviewDocId('course-123', 'trainee-abc');
  assert.equal(docId, 'course-123_trainee-abc');
});

test('generateReviewDocId throws error if missing courseId or traineeId', () => {
  assert.throws(() => generateReviewDocId('', 'trainee-abc'));
  assert.throws(() => generateReviewDocId('course-123', ''));
});

test('validateReviewInput approves valid enrolled trainee submission', () => {
  const result = validateReviewInput({
    rating: 5,
    reviewText: 'Outstanding course, covers the fundamentals comprehensively.',
    isEnrolled: true,
    courseStatus: 'published',
    isCourseTrainer: false,
    userRole: 'Trainee',
    isAuthenticated: true,
  });
  assert.equal(result.valid, true);
  assert.equal(result.error, undefined);
});

test('validateReviewInput rejects unauthenticated user', () => {
  const result = validateReviewInput({
    rating: 5,
    reviewText: 'Great!',
    isAuthenticated: false,
  });
  assert.equal(result.valid, false);
  assert.match(result.error!, /signed in/);
});

test('validateReviewInput rejects non-enrolled user', () => {
  const result = validateReviewInput({
    rating: 4,
    reviewText: 'Good content',
    isEnrolled: false,
    courseStatus: 'published',
    isAuthenticated: true,
    userRole: 'Trainee',
  });
  assert.equal(result.valid, false);
  assert.match(result.error!, /actively enrolled/);
});

test('validateReviewInput rejects non-trainee account role', () => {
  const result = validateReviewInput({
    rating: 5,
    reviewText: 'Trainer test review',
    isEnrolled: true,
    userRole: 'Trainer',
    isAuthenticated: true,
  });
  assert.equal(result.valid, false);
  assert.match(result.error!, /Trainee accounts/);
});

test('validateReviewInput rejects trainers reviewing their own course', () => {
  const result = validateReviewInput({
    rating: 5,
    reviewText: 'I created this course and it is great',
    isEnrolled: true,
    isCourseTrainer: true,
    isAuthenticated: true,
  });
  assert.equal(result.valid, false);
  assert.match(result.error!, /strictly prohibited from reviewing their own courses/);
});

test('validateReviewInput rejects non-published course reviews', () => {
  const result = validateReviewInput({
    rating: 4,
    reviewText: 'Review on draft course',
    isEnrolled: true,
    courseStatus: 'draft',
    isAuthenticated: true,
    userRole: 'Trainee',
  });
  assert.equal(result.valid, false);
  assert.match(result.error!, /published courses/);
});

test('validateReviewInput rejects invalid ratings outside 1-5 or non-integers', () => {
  assert.equal(
    validateReviewInput({
      rating: 0,
      reviewText: 'Zero stars',
      isEnrolled: true,
      courseStatus: 'published',
    }).valid,
    false
  );
  assert.equal(
    validateReviewInput({
      rating: 6,
      reviewText: 'Six stars',
      isEnrolled: true,
      courseStatus: 'published',
    }).valid,
    false
  );
  assert.equal(
    validateReviewInput({
      rating: 4.5,
      reviewText: 'Float rating',
      isEnrolled: true,
      courseStatus: 'published',
    }).valid,
    false
  );
});

test('validateReviewInput enforces 500-character limit on review feedback', () => {
  const longReview = 'A'.repeat(501);
  const result = validateReviewInput({
    rating: 5,
    reviewText: longReview,
    isEnrolled: true,
    courseStatus: 'published',
  });
  assert.equal(result.valid, false);
  assert.match(result.error!, /500 character limit/);

  // Exactly 500 characters passes
  const valid500 = 'A'.repeat(500);
  const passResult = validateReviewInput({
    rating: 5,
    reviewText: valid500,
    isEnrolled: true,
    courseStatus: 'published',
  });
  assert.equal(passResult.valid, true);
});

test('validateReviewInput rejects empty or whitespace-only review text', () => {
  const result = validateReviewInput({
    rating: 4,
    reviewText: '    ',
    isEnrolled: true,
    courseStatus: 'published',
  });
  assert.equal(result.valid, false);
  assert.match(result.error!, /written feedback/);
});

test('calculateRatingStats handles empty review list gracefully', () => {
  const stats = calculateRatingStats([]);
  assert.equal(stats.averageRating, 0);
  assert.equal(stats.totalReviews, 0);
  assert.deepEqual(stats.distribution, { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
});

test('calculateRatingStats computes accurate averages and distributions', () => {
  const sampleReviews: CourseReview[] = [
    {
      id: 'c1_t1',
      courseId: 'c1',
      traineeId: 't1',
      traineeName: 'Alice',
      rating: 5,
      reviewText: 'Superb',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'c1_t2',
      courseId: 'c1',
      traineeId: 't2',
      traineeName: 'Bob',
      rating: 4,
      reviewText: 'Very practical',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'c1_t3',
      courseId: 'c1',
      traineeId: 't3',
      traineeName: 'Charlie',
      rating: 5,
      reviewText: 'Loved the hands-on labs',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'c1_t4',
      courseId: 'c1',
      traineeId: 't4',
      traineeName: 'David',
      rating: 3,
      reviewText: 'Decent introductory overview',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const stats = calculateRatingStats(sampleReviews);
  assert.equal(stats.totalReviews, 4);
  // (5 + 4 + 5 + 3) / 4 = 17 / 4 = 4.25 -> rounded to 4.3
  assert.equal(stats.averageRating, 4.3);
  assert.deepEqual(stats.distribution, {
    1: 0,
    2: 0,
    3: 1,
    4: 1,
    5: 2,
  });
});

test('formatReviewDate formats date correctly', () => {
  const fixedDate = new Date('2026-05-15T10:00:00Z');
  const formatted = formatReviewDate(fixedDate);
  assert.match(formatted, /May 15, 2026/);
});
