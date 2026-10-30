import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterCourses,
  filterAndSortCourses,
  parseDurationValue,
  getDurationCategory,
  extractCourseFilterOptions,
  validateContactForm,
} from './courseFilter';
import { SAMPLE_COURSES } from '../data/courses';

test('parseDurationValue normalizes duration strings into comparable numeric hours', () => {
  assert.equal(parseDurationValue('20 hours'), 20);
  assert.equal(parseDurationValue('15 hrs'), 15);
  assert.equal(parseDurationValue('4 weeks'), 40);
  assert.equal(parseDurationValue('2 months'), 80);
  assert.equal(parseDurationValue('5 days'), 20);
  assert.equal(parseDurationValue(''), 0);
  assert.equal(parseDurationValue(undefined), 0);
});

test('getDurationCategory categorizes into short, medium, and long', () => {
  assert.equal(getDurationCategory('12 hours'), 'short');
  assert.equal(getDurationCategory('15 hours'), 'short');
  assert.equal(getDurationCategory('18 hours'), 'medium');
  assert.equal(getDurationCategory('25 hours'), 'medium');
  assert.equal(getDurationCategory('30 hours'), 'long');
  assert.equal(getDurationCategory('4 weeks'), 'long'); // 40 hours
});

test('filterAndSortCourses returns all courses when criteria is empty', () => {
  const result = filterAndSortCourses(SAMPLE_COURSES, {});
  assert.equal(result.length, 6);
});

test('filterAndSortCourses searches case-insensitively and trims spaces', () => {
  const results = filterAndSortCourses(SAMPLE_COURSES, { searchQuery: '   python   ' });
  assert.equal(results.length, 1);
  assert.equal(results[0].title, 'Python for Beginners');

  const upperResults = filterAndSortCourses(SAMPLE_COURSES, { searchQuery: 'PYTHON' });
  assert.equal(upperResults.length, 1);
  assert.equal(upperResults[0].title, 'Python for Beginners');
});

test('filterAndSortCourses matches trainer name in search query', () => {
  const results = filterAndSortCourses(SAMPLE_COURSES, { searchQuery: 'Rajesh Sharma' });
  assert.equal(results.length, 1);
  assert.equal(results[0].title, 'Java Fundamentals');
});

test('filterAndSortCourses matches syllabus keywords and prerequisites in search query', () => {
  // Query "JVM" matches Java Fundamentals syllabus
  const jvmResults = filterAndSortCourses(SAMPLE_COURSES, { searchQuery: 'JVM' });
  assert.equal(jvmResults.length, 1);
  assert.equal(jvmResults[0].title, 'Java Fundamentals');

  // Query "normalization" matches SQL syllabus/description
  const normResults = filterAndSortCourses(SAMPLE_COURSES, { searchQuery: 'normalization' });
  assert.equal(normResults.length, 1);
  assert.equal(normResults[0].title, 'SQL and Database Fundamentals');
});

test('filterAndSortCourses filters by difficulty level', () => {
  const beginnerCourses = filterAndSortCourses(SAMPLE_COURSES, { level: 'Beginner' });
  assert.ok(beginnerCourses.length >= 3);
  assert.ok(beginnerCourses.every((c) => c.level === 'Beginner'));

  const intermediateCourses = filterAndSortCourses(SAMPLE_COURSES, { level: 'Intermediate' });
  assert.ok(intermediateCourses.length >= 1);
  assert.ok(intermediateCourses.every((c) => c.level === 'Intermediate'));
});

test('filterAndSortCourses filters by duration bucket', () => {
  const shortCourses = filterAndSortCourses(SAMPLE_COURSES, { duration: 'short' });
  assert.ok(shortCourses.length >= 1);
  assert.ok(shortCourses.every((c) => parseDurationValue(c.duration) <= 15));

  const mediumCourses = filterAndSortCourses(SAMPLE_COURSES, { duration: 'medium' });
  assert.ok(mediumCourses.length >= 1);
  assert.ok(mediumCourses.every((c) => {
    const val = parseDurationValue(c.duration);
    return val > 15 && val <= 25;
  }));
});

test('filterAndSortCourses filters by trainer specifically', () => {
  const anitaCourses = filterAndSortCourses(SAMPLE_COURSES, {
    trainerName: 'Prof. Anita Desai (Software Systems Lead)',
  });
  assert.equal(anitaCourses.length, 1);
  assert.equal(anitaCourses[0].title, 'Python for Beginners');
});

test('filterAndSortCourses combines multiple filters simultaneously', () => {
  // Level Beginner + Category Programming
  const combined = filterAndSortCourses(SAMPLE_COURSES, {
    category: 'Programming',
    level: 'Beginner',
  });
  assert.equal(combined.length, 2);

  // Level Beginner + Category Programming + Duration short (<= 15 hours) matches Python (15 hrs)
  const triple = filterAndSortCourses(SAMPLE_COURSES, {
    category: 'Programming',
    level: 'Beginner',
    duration: 'short',
  });
  assert.equal(triple.length, 1);
  assert.equal(triple[0].title, 'Python for Beginners');
});

test('filterAndSortCourses sorts title alphabetically A-Z and Z-A', () => {
  const asc = filterAndSortCourses(SAMPLE_COURSES, { sortBy: 'title_asc' });
  const desc = filterAndSortCourses(SAMPLE_COURSES, { sortBy: 'title_desc' });

  assert.equal(asc[0].title, 'Data Structures and Algorithms');
  assert.equal(desc[0].title, 'Web Development Basics');
});

test('filterAndSortCourses sorts by duration shortest and longest first', () => {
  const shortest = filterAndSortCourses(SAMPLE_COURSES, { sortBy: 'duration_asc' });
  const longest = filterAndSortCourses(SAMPLE_COURSES, { sortBy: 'duration_desc' });

  assert.ok(parseDurationValue(shortest[0].duration) <= parseDurationValue(shortest[1].duration));
  assert.ok(parseDurationValue(longest[0].duration) >= parseDurationValue(longest[1].duration));
});

test('extractCourseFilterOptions returns unique categories, levels, and trainers', () => {
  const options = extractCourseFilterOptions(SAMPLE_COURSES);
  assert.ok(options.categories.includes('Programming'));
  assert.ok(options.categories.includes('AI and ML'));
  assert.ok(options.levels.includes('Beginner'));
  assert.ok(options.trainers.length >= 5);
});

test('filterCourses backwards compatibility wrapper works as expected', () => {
  const result = filterCourses(SAMPLE_COURSES, 'python', 'All');
  assert.equal(result.length, 1);
  assert.equal(result[0].title, 'Python for Beginners');
});

test('validateContactForm flags missing required fields', () => {
  const emptyResult = validateContactForm({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  assert.equal(emptyResult.isValid, false);
  assert.ok(emptyResult.errors.name);
  assert.ok(emptyResult.errors.email);
  assert.ok(emptyResult.errors.subject);
  assert.ok(emptyResult.errors.message);
});

test('validateContactForm flags invalid email addresses', () => {
  const invalidEmailResult = validateContactForm({
    name: 'Aarav Gupta',
    email: 'not-an-email',
    subject: 'Course inquiry',
    message: 'I have a question about the Java course syllabus.',
  });

  assert.equal(invalidEmailResult.isValid, false);
  assert.ok(invalidEmailResult.errors.email);
  assert.equal(invalidEmailResult.errors.name, undefined);
});

test('validateContactForm succeeds with valid inputs', () => {
  const validResult = validateContactForm({
    name: 'Aarav Gupta',
    email: 'aarav.gupta@college.edu',
    subject: 'Inquiry regarding Python course',
    message: 'Hello, I am interested in joining the digital capacity portal for the summer session.',
  });

  assert.equal(validResult.isValid, true);
  assert.equal(Object.keys(validResult.errors).length, 0);
});
