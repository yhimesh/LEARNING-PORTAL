export interface ScorableQuestion {
  id: string;
  points?: number;
}

export interface ScorableAnswerKeyItem {
  questionId: string;
  correctOptionIndex: number;
}

export interface ScorableTraineeAnswer {
  questionId: string;
  selectedOptionIndex: number;
}

export interface ScoringPayload {
  passingPercentage: number;
  questions: ScorableQuestion[];
  answerKey: ScorableAnswerKeyItem[];
  traineeAnswers: ScorableTraineeAnswer[];
}

export interface ScoreSummary {
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  unansweredCount: number;
  totalMarks: number;
  marksObtained: number;
  percentage: number;
  passingPercentage: number;
  resultStatus: 'passed' | 'failed';
}

/**
 * Authoritative, pure function to calculate quiz scores and pass/fail status.
 * Evaluates points question-by-question against the protected answer key.
 */
export function calculateQuizScore(payload: ScoringPayload): ScoreSummary {
  const { passingPercentage, questions, answerKey, traineeAnswers } = payload;

  const totalQuestions = questions ? questions.length : 0;
  if (totalQuestions === 0) {
    return {
      totalQuestions: 0,
      correctAnswers: 0,
      incorrectAnswers: 0,
      unansweredCount: 0,
      totalMarks: 0,
      marksObtained: 0,
      percentage: 0,
      passingPercentage: Math.max(1, Math.min(100, Number(passingPercentage) || 70)),
      resultStatus: 'failed',
    };
  }

  // Build answer key lookup map
  const keyMap = new Map<string, number>();
  if (Array.isArray(answerKey)) {
    answerKey.forEach((item) => {
      if (item && typeof item.questionId === 'string') {
        keyMap.set(item.questionId, Number(item.correctOptionIndex));
      }
    });
  }

  // Build trainee answer lookup map
  const traineeMap = new Map<string, number>();
  if (Array.isArray(traineeAnswers)) {
    traineeAnswers.forEach((ans) => {
      if (ans && typeof ans.questionId === 'string' && typeof ans.selectedOptionIndex === 'number') {
        traineeMap.set(ans.questionId, ans.selectedOptionIndex);
      }
    });
  }

  let correctAnswers = 0;
  let incorrectAnswers = 0;
  let unansweredCount = 0;
  let totalMarks = 0;
  let marksObtained = 0;

  questions.forEach((q) => {
    const questionPoints = Math.max(1, Math.min(100, Number(q.points) || 1));
    totalMarks += questionPoints;

    const correctOption = keyMap.get(q.id);
    const selectedOption = traineeMap.get(q.id);

    if (selectedOption === undefined) {
      unansweredCount++;
      incorrectAnswers++;
    } else if (correctOption !== undefined && selectedOption === correctOption) {
      correctAnswers++;
      marksObtained += questionPoints;
    } else {
      incorrectAnswers++;
    }
  });

  const percentage = totalMarks > 0 ? Math.round((marksObtained / totalMarks) * 100) : 0;
  const targetThreshold = Math.max(1, Math.min(100, Number(passingPercentage) || 70));
  const resultStatus: 'passed' | 'failed' = percentage >= targetThreshold ? 'passed' : 'failed';

  return {
    totalQuestions,
    correctAnswers,
    incorrectAnswers,
    unansweredCount,
    totalMarks,
    marksObtained,
    percentage,
    passingPercentage: targetThreshold,
    resultStatus,
  };
}
