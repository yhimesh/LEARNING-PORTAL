import { QuizQuestion, QuestionAnswer } from '../types';

/**
 * Generate a deterministic document ID for a trainee assessment attempt to strictly prevent duplicate attempts.
 * Pattern: `${traineeId}_${assessmentId}`
 */
export function getAttemptDocId(traineeId: string, assessmentId: string): string {
  if (!traineeId || !assessmentId) {
    throw new Error('Both traineeId and assessmentId are required to construct an attempt key.');
  }
  return `${traineeId}_${assessmentId}`;
}

export interface AttemptProgress {
  isComplete: boolean;
  answeredCount: number;
  totalCount: number;
  unansweredIndices: number[];
  percentage: number;
}

/**
 * Evaluates whether all questions in an assessment have been answered
 */
export function checkAttemptCompleteness(
  questions: QuizQuestion[],
  answers: QuestionAnswer[]
): AttemptProgress {
  if (!questions || questions.length === 0) {
    return {
      isComplete: false,
      answeredCount: 0,
      totalCount: 0,
      unansweredIndices: [],
      percentage: 0,
    };
  }

  const answerMap = new Map<string, number>();
  answers.forEach((ans) => {
    if (
      typeof ans.selectedOptionIndex === 'number' &&
      ans.selectedOptionIndex >= 0 &&
      ans.selectedOptionIndex <= 3 &&
      Number.isInteger(ans.selectedOptionIndex)
    ) {
      answerMap.set(ans.questionId, ans.selectedOptionIndex);
    }
  });

  const unansweredIndices: number[] = [];
  questions.forEach((q, idx) => {
    if (!answerMap.has(q.id)) {
      unansweredIndices.push(idx);
    }
  });

  const answeredCount = questions.length - unansweredIndices.length;
  const percentage = Math.round((answeredCount / questions.length) * 100);

  return {
    isComplete: unansweredIndices.length === 0,
    answeredCount,
    totalCount: questions.length,
    unansweredIndices,
    percentage,
  };
}

/**
 * Validates attempt submission payload before sending to Firestore
 */
export function validateAttemptSubmission(
  questions: QuizQuestion[],
  answers: QuestionAnswer[],
  traineeId: string,
  assessmentId: string
): { isValid: boolean; error?: string } {
  if (!traineeId || traineeId.trim().length === 0) {
    return { isValid: false, error: 'Authenticated trainee UID is required.' };
  }
  if (!assessmentId || assessmentId.trim().length === 0) {
    return { isValid: false, error: 'Assessment identifier is required.' };
  }
  if (!questions || questions.length === 0) {
    return { isValid: false, error: 'Cannot submit an attempt for a quiz with no questions.' };
  }

  const progress = checkAttemptCompleteness(questions, answers);
  if (!progress.isComplete) {
    const missing = progress.unansweredIndices.map((i) => i + 1).join(', ');
    return {
      isValid: false,
      error: `Please answer all questions before submitting. Unanswered: Question ${missing}`,
    };
  }

  return { isValid: true };
}
