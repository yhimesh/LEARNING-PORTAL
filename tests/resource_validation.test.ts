import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidUrl,
  isValidResourceType,
  validateResourceInput,
  VALID_RESOURCE_TYPES,
  RESOURCE_TYPE_CONFIG,
  canTraineeAccessCourseResources,
} from '../src/utils/resourceValidation.js';


test('isValidUrl validates http and https URLs correctly', () => {
  // Valid URLs
  assert.equal(isValidUrl('https://example.com/syllabus.pdf'), true);
  assert.equal(isValidUrl('http://sub.domain.org/docs/page?id=123'), true);
  assert.equal(isValidUrl('https://docs.google.com/presentation/d/12345/edit'), true);
  assert.equal(isValidUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), true);
  assert.equal(isValidUrl('https://github.com/react/react'), true);

  // Invalid URLs
  assert.equal(isValidUrl(''), false);
  assert.equal(isValidUrl('ftp://example.com/file.pdf'), false);
  assert.equal(isValidUrl('javascript:alert(1)'), false);
  assert.equal(isValidUrl('not-a-url'), false);
  assert.equal(isValidUrl('www.missing-protocol.com'), false);
  assert.equal(isValidUrl('http:/incomplete.com'), false);
});

test('isValidResourceType checks all supported types', () => {
  for (const type of VALID_RESOURCE_TYPES) {
    assert.equal(isValidResourceType(type), true);
  }
  assert.equal(isValidResourceType('audio'), false);
  assert.equal(isValidResourceType('executable'), false);
  assert.equal(isValidResourceType(''), false);
});

test('RESOURCE_TYPE_CONFIG covers all valid resource types with metadata', () => {
  for (const type of VALID_RESOURCE_TYPES) {
    const config = RESOURCE_TYPE_CONFIG[type];
    assert.ok(config, `Missing config for ${type}`);
    assert.ok(config.label.length > 0);
    assert.ok(config.urlPlaceholder.length > 0);
    assert.ok(config.urlHint.length > 0);
    assert.ok(config.badgeColor.length > 0);
  }
});

test('validateResourceInput rejects missing or empty fields', () => {
  const result = validateResourceInput({});
  assert.equal(result.isValid, false);
  assert.ok(result.errors.title);
  assert.ok(result.errors.type);
  assert.ok(result.errors.url);
  assert.ok(result.errors.courseId);
});

test('validateResourceInput rejects invalid titles and URLs', () => {
  const shortTitle = validateResourceInput({
    title: 'a',
    courseId: 'course_123',
    type: 'pdf',
    url: 'https://valid.com/doc.pdf',
  });
  assert.equal(shortTitle.isValid, false);
  assert.ok(shortTitle.errors.title?.includes('at least 2 characters'));

  const badUrl = validateResourceInput({
    title: 'Valid Title',
    courseId: 'course_123',
    type: 'pdf',
    url: 'invalid-url',
  });
  assert.equal(badUrl.isValid, false);
  assert.ok(badUrl.errors.url?.includes('https:// or http://'));
});

test('validateResourceInput accepts completely valid input', () => {
  const result = validateResourceInput({
    title: 'Lecture 1: Architecture Overview & Setup',
    description: 'Detailed slides and walkthrough notes for session 1.',
    type: 'presentation',
    url: 'https://docs.google.com/presentation/d/abcdef123/edit',
    courseId: 'course_cloud_99',
  });
  assert.equal(result.isValid, true);
  assert.deepEqual(result.errors, {});
});

test('canTraineeAccessCourseResources enforces enrollment and active role boundaries', () => {
  const activeTrainee = {
    uid: 'trainee_456',
    role: 'Trainee',
    accountStatus: 'active',
  };

  // Case 1: Enrolled active trainee succeeds
  const allowed = canTraineeAccessCourseResources(activeTrainee, 'course_101', ['course_101', 'course_202']);
  assert.equal(allowed.canAccess, true);

  // Case 2: Not enrolled in this specific course
  const notEnrolled = canTraineeAccessCourseResources(activeTrainee, 'course_999', ['course_101']);
  assert.equal(notEnrolled.canAccess, false);
  assert.ok(notEnrolled.reason?.includes('not currently enrolled'));

  // Case 3: Pending trainee account
  const pendingTrainee = {
    uid: 'trainee_pending',
    role: 'Trainee',
    accountStatus: 'pending',
  };
  const pendingCheck = canTraineeAccessCourseResources(pendingTrainee, 'course_101', ['course_101']);
  assert.equal(pendingCheck.canAccess, false);
  assert.ok(pendingCheck.reason?.includes('not yet active'));

  // Case 4: Non-trainee role (e.g. Trainer trying to access trainee classroom)
  const trainer = {
    uid: 'trainer_123',
    role: 'Trainer',
    accountStatus: 'active',
  };
  const trainerCheck = canTraineeAccessCourseResources(trainer, 'course_101', ['course_101']);
  assert.equal(trainerCheck.canAccess, false);
  assert.ok(trainerCheck.reason?.includes('Only active Trainee accounts'));

  // Case 5: Unauthenticated visitor
  const anonCheck = canTraineeAccessCourseResources(null, 'course_101', ['course_101']);
  assert.equal(anonCheck.canAccess, false);
  assert.ok(anonCheck.reason?.includes('Authentication required'));

  // Case 6: Admin bypass
  const admin = {
    uid: 'admin_1',
    role: 'Trainer',
    accountStatus: 'active',
    isAdmin: true,
  };
  const adminCheck = canTraineeAccessCourseResources(admin, 'course_101', []);
  assert.equal(adminCheck.canAccess, true);
});

