import { QuizQuestion, AssessmentStatus } from '../types';

export interface AssessmentValidationInput {
  title: string;
  description: string;
  courseId: string;
  passingPercentage: number;
  status: AssessmentStatus;
  questions: QuizQuestion[];
  timeLimitMinutes?: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  totalMarks: number;
}

/**
 * Validates a single multiple-choice question in a quiz
 */
export function validateQuestion(
  q: Partial<QuizQuestion>,
  index: number
): { isValid: boolean; error?: string } {
  if (!q.questionText || q.questionText.trim().length < 3) {
    return {
      isValid: false,
      error: `Question ${index + 1}: Question text must be at least 3 characters.`,
    };
  }

  if (q.questionText.trim().length > 500) {
    return {
      isValid: false,
      error: `Question ${index + 1}: Question text cannot exceed 500 characters.`,
    };
  }

  if (!Array.isArray(q.options) || q.options.length !== 4) {
    return {
      isValid: false,
      error: `Question ${index + 1}: Must provide exactly 4 options.`,
    };
  }

  for (let i = 0; i < 4; i++) {
    const opt = q.options[i];
    if (typeof opt !== 'string' || opt.trim().length === 0) {
      const letter = String.fromCharCode(65 + i);
      return {
        isValid: false,
        error: `Question ${index + 1}: Option ${letter} cannot be empty.`,
      };
    }
    if (opt.trim().length > 200) {
      const letter = String.fromCharCode(65 + i);
      return {
        isValid: false,
        error: `Question ${index + 1}: Option ${letter} cannot exceed 200 characters.`,
      };
    }
  }

  if (
    typeof q.correctOptionIndex !== 'number' ||
    q.correctOptionIndex < 0 ||
    q.correctOptionIndex > 3 ||
    !Number.isInteger(q.correctOptionIndex)
  ) {
    return {
      isValid: false,
      error: `Question ${index + 1}: You must select exactly one correct option (A, B, C, or D).`,
    };
  }

  const points = Number(q.points);
  if (isNaN(points) || points < 1 || points > 100 || !Number.isInteger(points)) {
    return {
      isValid: false,
      error: `Question ${index + 1}: Points must be an integer between 1 and 100.`,
    };
  }

  return { isValid: true };
}

/**
 * Validates an entire assessment / quiz creation or edit payload
 */
export function validateAssessmentInput(
  input: AssessmentValidationInput,
  trainerId?: string,
  allowedCourseIds?: string[]
): ValidationResult {
  const errors: Record<string, string> = {};

  if (!input.title || input.title.trim().length < 2) {
    errors.title = 'Quiz title must be at least 2 characters long.';
  } else if (input.title.trim().length > 120) {
    errors.title = 'Quiz title cannot exceed 120 characters.';
  }

  if (!input.description || input.description.trim().length < 5) {
    errors.description = 'Quiz description must be at least 5 characters long.';
  } else if (input.description.trim().length > 1000) {
    errors.description = 'Quiz description cannot exceed 1000 characters.';
  }

  if (!input.courseId || input.courseId.trim().length === 0) {
    errors.courseId = 'Please select an associated course.';
  } else if (allowedCourseIds && allowedCourseIds.length > 0 && !allowedCourseIds.includes(input.courseId)) {
    errors.courseId = 'Selected course is not owned by your trainer profile.';
  }

  const passing = Number(input.passingPercentage);
  if (isNaN(passing) || passing < 1 || passing > 100) {
    errors.passingPercentage = 'Passing percentage must be between 1% and 100%.';
  }

  if (!['draft', 'published', 'archived'].includes(input.status)) {
    errors.status = 'Status must be draft, published, or archived.';
  }

  if (input.timeLimitMinutes !== undefined && input.timeLimitMinutes !== null) {
    const time = Number(input.timeLimitMinutes);
    if (isNaN(time) || time < 1 || time > 300) {
      errors.timeLimitMinutes = 'Time limit must be between 1 and 300 minutes.';
    }
  }

  if (!Array.isArray(input.questions) || input.questions.length === 0) {
    errors.questions = 'At least 1 question is required to create a quiz.';
  } else if (input.questions.length > 50) {
    errors.questions = 'A quiz can have at most 50 questions.';
  } else {
    for (let i = 0; i < input.questions.length; i++) {
      const qRes = validateQuestion(input.questions[i], i);
      if (!qRes.isValid) {
        errors[`question_${i}`] = qRes.error || `Question ${i + 1} is invalid.`;
        if (!errors.questions) {
          errors.questions = qRes.error || `Question ${i + 1} has errors.`;
        }
      }
    }
  }

  const totalMarks = Array.isArray(input.questions)
    ? input.questions.reduce((sum, q) => sum + (Number(q.points) || 1), 0)
    : 0;

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    totalMarks,
  };
}

/**
 * Creates a blank multiple-choice question template
 */
export function createEmptyQuestion(index: number): QuizQuestion {
  return {
    id: `q_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 7)}`,
    questionText: '',
    options: ['', '', '', ''],
    correctOptionIndex: 0,
    points: 1,
  };
}
