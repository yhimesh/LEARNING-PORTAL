import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getAttemptDocId,
  checkAttemptCompleteness,
  validateAttemptSubmission,
} from './attemptValidation';
import { QuizQuestion, QuestionAnswer } from '../types';

test('getAttemptDocId constructs deterministic key and throws on missing inputs', () => {
  assert.equal(getAttemptDocId('trainee_123', 'quiz_456'), 'trainee_123_quiz_456');
  assert.throws(() => getAttemptDocId('', 'quiz_456'), /Both traineeId and assessmentId/);
  assert.throws(() => getAttemptDocId('trainee_123', ''), /Both traineeId and assessmentId/);
});

test('checkAttemptCompleteness correctly identifies answered and unanswered questions', () => {
  const questions: QuizQuestion[] = [
    { id: 'q1', questionText: 'Q1', options: ['A', 'B', 'C', 'D'], correctOptionIndex: 0, points: 1 },
    { id: 'q2', questionText: 'Q2', options: ['A', 'B', 'C', 'D'], correctOptionIndex: 1, points: 1 },
    { id: 'q3', questionText: 'Q3', options: ['A', 'B', 'C', 'D'], correctOptionIndex: 2, points: 1 },
  ];

  const partialAnswers: QuestionAnswer[] = [
    { questionId: 'q1', selectedOptionIndex: 2 },
  ];

  const res1 = checkAttemptCompleteness(questions, partialAnswers);
  assert.equal(res1.isComplete, false);
  assert.equal(res1.answeredCount, 1);
  assert.equal(res1.totalCount, 3);
  assert.deepEqual(res1.unansweredIndices, [1, 2]); // q2, q3
  assert.equal(res1.percentage, 33);

  const fullAnswers: QuestionAnswer[] = [
    { questionId: 'q1', selectedOptionIndex: 0 },
    { questionId: 'q2', selectedOptionIndex: 3 },
    { questionId: 'q3', selectedOptionIndex: 1 },
  ];

  const res2 = checkAttemptCompleteness(questions, fullAnswers);
  assert.equal(res2.isComplete, true);
  assert.equal(res2.answeredCount, 3);
  assert.deepEqual(res2.unansweredIndices, []);
  assert.equal(res2.percentage, 100);
});

test('validateAttemptSubmission blocks incomplete submissions with question numbers', () => {
  const questions: QuizQuestion[] = [
    { id: 'q1', questionText: 'Q1', options: ['A', 'B', 'C', 'D'], correctOptionIndex: 0, points: 1 },
    { id: 'q2', questionText: 'Q2', options: ['A', 'B', 'C', 'D'], correctOptionIndex: 1, points: 1 },
  ];

  const incompleteAnswers: QuestionAnswer[] = [
    { questionId: 'q1', selectedOptionIndex: 1 },
  ];

  const invalidRes = validateAttemptSubmission(questions, incompleteAnswers, 'trainee_1', 'assessment_1');
  assert.equal(invalidRes.isValid, false);
  assert.match(invalidRes.error || '', /Question 2/);

  const completeAnswers: QuestionAnswer[] = [
    { questionId: 'q1', selectedOptionIndex: 1 },
    { questionId: 'q2', selectedOptionIndex: 0 },
  ];

  const validRes = validateAttemptSubmission(questions, completeAnswers, 'trainee_1', 'assessment_1');
  assert.equal(validRes.isValid, true);
  assert.equal(validRes.error, undefined);
});
