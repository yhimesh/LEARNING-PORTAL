import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateQuizScore, ScoringPayload } from './scoring';

test('calculateQuizScore scores 100% when all answers are correct', () => {
  const payload: ScoringPayload = {
    passingPercentage: 70,
    questions: [
      { id: 'q1', points: 10 },
      { id: 'q2', points: 10 },
      { id: 'q3', points: 10 },
    ],
    answerKey: [
      { questionId: 'q1', correctOptionIndex: 0 },
      { questionId: 'q2', correctOptionIndex: 2 },
      { questionId: 'q3', correctOptionIndex: 1 },
    ],
    traineeAnswers: [
      { questionId: 'q1', selectedOptionIndex: 0 },
      { questionId: 'q2', selectedOptionIndex: 2 },
      { questionId: 'q3', selectedOptionIndex: 1 },
    ],
  };

  const res = calculateQuizScore(payload);
  assert.equal(res.totalQuestions, 3);
  assert.equal(res.correctAnswers, 3);
  assert.equal(res.incorrectAnswers, 0);
  assert.equal(res.totalMarks, 30);
  assert.equal(res.marksObtained, 30);
  assert.equal(res.percentage, 100);
  assert.equal(res.resultStatus, 'passed');
});

test('calculateQuizScore correctly handles incorrect and partial marks', () => {
  const payload: ScoringPayload = {
    passingPercentage: 70,
    questions: [
      { id: 'q1', points: 5 },
      { id: 'q2', points: 5 },
      { id: 'q3', points: 10 },
      { id: 'q4', points: 10 },
    ],
    answerKey: [
      { questionId: 'q1', correctOptionIndex: 1 }, // correct -> 5
      { questionId: 'q2', correctOptionIndex: 0 }, // wrong -> 0
      { questionId: 'q3', correctOptionIndex: 3 }, // correct -> 10
      { questionId: 'q4', correctOptionIndex: 2 }, // wrong -> 0
    ],
    traineeAnswers: [
      { questionId: 'q1', selectedOptionIndex: 1 },
      { questionId: 'q2', selectedOptionIndex: 3 }, // selected 3 instead of 0
      { questionId: 'q3', selectedOptionIndex: 3 },
      { questionId: 'q4', selectedOptionIndex: 1 }, // selected 1 instead of 2
    ],
  };

  const res = calculateQuizScore(payload);
  assert.equal(res.totalQuestions, 4);
  assert.equal(res.correctAnswers, 2);
  assert.equal(res.incorrectAnswers, 2);
  assert.equal(res.totalMarks, 30);
  assert.equal(res.marksObtained, 15);
  assert.equal(res.percentage, 50);
  assert.equal(res.resultStatus, 'failed'); // 50% < 70%
});

test('calculateQuizScore respects customized passing percentage thresholds', () => {
  // Score is 60%: should pass if threshold is 60%, fail if threshold is 75%
  const basePayload: ScoringPayload = {
    passingPercentage: 60,
    questions: [
      { id: 'q1', points: 1 },
      { id: 'q2', points: 1 },
      { id: 'q3', points: 1 },
      { id: 'q4', points: 1 },
      { id: 'q5', points: 1 },
    ],
    answerKey: [
      { questionId: 'q1', correctOptionIndex: 0 },
      { questionId: 'q2', correctOptionIndex: 0 },
      { questionId: 'q3', correctOptionIndex: 0 },
      { questionId: 'q4', correctOptionIndex: 0 },
      { questionId: 'q5', correctOptionIndex: 0 },
    ],
    traineeAnswers: [
      { questionId: 'q1', selectedOptionIndex: 0 },
      { questionId: 'q2', selectedOptionIndex: 0 },
      { questionId: 'q3', selectedOptionIndex: 0 },
      { questionId: 'q4', selectedOptionIndex: 1 },
      { questionId: 'q5', selectedOptionIndex: 1 },
    ],
  };

  const passRes = calculateQuizScore({ ...basePayload, passingPercentage: 60 });
  assert.equal(passRes.percentage, 60);
  assert.equal(passRes.resultStatus, 'passed');

  const failRes = calculateQuizScore({ ...basePayload, passingPercentage: 75 });
  assert.equal(failRes.percentage, 60);
  assert.equal(failRes.resultStatus, 'failed');
});

test('calculateQuizScore marks unanswered questions as incorrect', () => {
  const payload: ScoringPayload = {
    passingPercentage: 50,
    questions: [
      { id: 'q1', points: 10 },
      { id: 'q2', points: 10 },
    ],
    answerKey: [
      { questionId: 'q1', correctOptionIndex: 0 },
      { questionId: 'q2', correctOptionIndex: 1 },
    ],
    traineeAnswers: [
      { questionId: 'q1', selectedOptionIndex: 0 }, // q2 is missing
    ],
  };

  const res = calculateQuizScore(payload);
  assert.equal(res.unansweredCount, 1);
  assert.equal(res.correctAnswers, 1);
  assert.equal(res.incorrectAnswers, 1);
  assert.equal(res.marksObtained, 10);
  assert.equal(res.totalMarks, 20);
  assert.equal(res.percentage, 50);
  assert.equal(res.resultStatus, 'passed');
});
