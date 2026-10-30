import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateQuestion,
  validateAssessmentInput,
  createEmptyQuestion,
} from './assessmentValidation';
import { QuizQuestion } from '../types';

test('createEmptyQuestion returns a valid template with 4 options and defaults', () => {
  const q = createEmptyQuestion(0);
  assert.ok(q.id.startsWith('q_'));
  assert.equal(q.questionText, '');
  assert.equal(q.options.length, 4);
  assert.equal(q.correctOptionIndex, 0);
  assert.equal(q.points, 1);
});

test('validateQuestion rejects questions with missing text', () => {
  const q: QuizQuestion = {
    id: 'q1',
    questionText: '',
    options: ['Opt A', 'Opt B', 'Opt C', 'Opt D'],
    correctOptionIndex: 0,
    points: 1,
  };
  const res = validateQuestion(q, 0);
  assert.equal(res.isValid, false);
  assert.match(res.error || '', /at least 3 characters/i);
});

test('validateQuestion rejects questions with empty options', () => {
  const q: QuizQuestion = {
    id: 'q1',
    questionText: 'What is Java Virtual Machine?',
    options: ['Interpreter', '', 'Compiler', 'Debugger'],
    correctOptionIndex: 0,
    points: 2,
  };
  const res = validateQuestion(q, 0);
  assert.equal(res.isValid, false);
  assert.match(res.error || '', /Option B cannot be empty/i);
});

test('validateQuestion rejects invalid correctOptionIndex', () => {
  const q: QuizQuestion = {
    id: 'q1',
    questionText: 'Which keyword defines a constant in Java?',
    options: ['static', 'final', 'const', 'immutable'],
    correctOptionIndex: 4, // Out of bounds!
    points: 1,
  };
  const res = validateQuestion(q, 0);
  assert.equal(res.isValid, false);
  assert.match(res.error || '', /exactly one correct option/i);
});

test('validateQuestion rejects non-positive or non-integer points', () => {
  const q: QuizQuestion = {
    id: 'q1',
    questionText: 'Which keyword defines a constant in Java?',
    options: ['static', 'final', 'const', 'immutable'],
    correctOptionIndex: 1,
    points: 0,
  };
  const res = validateQuestion(q, 0);
  assert.equal(res.isValid, false);
  assert.match(res.error || '', /Points must be an integer between 1 and 100/i);
});

test('validateQuestion accepts valid questions', () => {
  const q: QuizQuestion = {
    id: 'q1',
    questionText: 'Which keyword defines a constant in Java?',
    options: ['static', 'final', 'const', 'immutable'],
    correctOptionIndex: 1,
    points: 5,
  };
  const res = validateQuestion(q, 0);
  assert.equal(res.isValid, true);
  assert.equal(res.error, undefined);
});

test('validateAssessmentInput checks titles, passing percentage, course ownership and calculates total marks', () => {
  const validQuestion1: QuizQuestion = {
    id: 'q1',
    questionText: 'What is inheritance in OOP?',
    options: ['Reusability', 'Encapsulation', 'Polymorphism', 'Compilation'],
    correctOptionIndex: 0,
    points: 10,
  };
  const validQuestion2: QuizQuestion = {
    id: 'q2',
    questionText: 'Which operator is used for comparison?',
    options: ['=', '==', ':=', '<>'],
    correctOptionIndex: 1,
    points: 5,
  };

  const invalidRes = validateAssessmentInput({
    title: 'A', // too short
    description: 'abc', // too short
    courseId: 'unknown-course',
    passingPercentage: 150, // invalid
    status: 'published',
    questions: [],
  }, 'trainer-123', ['course-1', 'course-2']);

  assert.equal(invalidRes.isValid, false);
  assert.ok(invalidRes.errors.title);
  assert.ok(invalidRes.errors.description);
  assert.ok(invalidRes.errors.courseId);
  assert.ok(invalidRes.errors.passingPercentage);
  assert.ok(invalidRes.errors.questions);

  const validRes = validateAssessmentInput({
    title: 'Java OOP Master Quiz',
    description: 'Comprehensive quiz covering inheritance, polymorphism, and classes.',
    courseId: 'course-1',
    passingPercentage: 70,
    status: 'published',
    questions: [validQuestion1, validQuestion2],
    timeLimitMinutes: 30,
  }, 'trainer-123', ['course-1', 'course-2']);

  assert.equal(validRes.isValid, true);
  assert.equal(validRes.totalMarks, 15);
  assert.equal(Object.keys(validRes.errors).length, 0);
});
