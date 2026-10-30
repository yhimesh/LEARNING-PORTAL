import test from 'node:test';
import assert from 'node:assert/strict';
import { getCourseProgressDocId, calculateCourseProgress } from './progress';

test('getCourseProgressDocId returns deterministic document ID', () => {
  const docId = getCourseProgressDocId('trainee_123', 'course_456');
  assert.equal(docId, 'trainee_123_course_456');
});

test('calculateCourseProgress handles zero resources without division by zero', () => {
  const result = calculateCourseProgress({
    completedResourceIds: [],
    validResourceIds: [],
  });

  assert.equal(result.completedResourceCount, 0);
  assert.equal(result.totalResourceCount, 0);
  assert.equal(result.progressPercentage, 0);
  assert.equal(result.status, 'not_started');
});

test('calculateCourseProgress calculates correct completion percentages and deduplicates', () => {
  const validResources = ['res_1', 'res_2', 'res_3', 'res_4'];

  // Trainee completed 2 of 4, with duplicate submissions
  const result = calculateCourseProgress({
    completedResourceIds: ['res_1', 'res_2', 'res_1'],
    validResourceIds: validResources,
  });

  assert.equal(result.completedResourceCount, 2);
  assert.equal(result.totalResourceCount, 4);
  assert.equal(result.progressPercentage, 50);
  assert.equal(result.status, 'in_progress');
  assert.deepEqual(result.completedResourceIds.sort(), ['res_1', 'res_2']);
});

test('calculateCourseProgress ignores invalid or cross-course resource IDs', () => {
  const validResources = ['course_a_res1', 'course_a_res2'];

  const result = calculateCourseProgress({
    completedResourceIds: ['course_a_res1', 'malicious_foreign_course_res', 'random_id'],
    validResourceIds: validResources,
  });

  assert.equal(result.completedResourceCount, 1);
  assert.equal(result.totalResourceCount, 2);
  assert.equal(result.progressPercentage, 50);
  assert.deepEqual(result.completedResourceIds, ['course_a_res1']);
});

test('calculateCourseProgress marks 100% completed status correctly', () => {
  const validResources = ['r1', 'r2', 'r3'];

  const result = calculateCourseProgress({
    completedResourceIds: ['r1', 'r2', 'r3'],
    validResourceIds: validResources,
  });

  assert.equal(result.completedResourceCount, 3);
  assert.equal(result.totalResourceCount, 3);
  assert.equal(result.progressPercentage, 100);
  assert.equal(result.status, 'completed');
});
