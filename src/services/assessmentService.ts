import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  Assessment,
  AssessmentStatus,
  QuizQuestion,
  AssessmentAnswerKey,
  AssessmentAttempt,
  QuestionAnswer,
  AttemptStatus,
  AssessmentResult,
  ResultStatus,
} from '../types';
import { validateAssessmentInput } from '../utils/assessmentValidation';
import { getAttemptDocId, validateAttemptSubmission } from '../utils/attemptValidation';

export interface CreateAssessmentInput {
  title: string;
  description: string;
  courseId: string;
  courseTitle?: string;
  passingPercentage: number;
  status: AssessmentStatus;
  questions: QuizQuestion[];
  timeLimitMinutes?: number;
}

export interface UpdateAssessmentInput {
  title?: string;
  description?: string;
  courseId?: string;
  courseTitle?: string;
  passingPercentage?: number;
  status?: AssessmentStatus;
  questions?: QuizQuestion[];
  timeLimitMinutes?: number;
}

/**
 * Strips correctOptionIndex from questions before saving to the trainee-accessible /assessments collection.
 * This guarantees trainee network requests never receive the answer key, satisfying the Phase 5 Red Team requirement.
 */
function sanitizeQuestionsForPublicCollection(questions: QuizQuestion[]) {
  return questions.map((q) => ({
    id: q.id,
    questionText: q.questionText.trim(),
    options: q.options.map((opt) => opt.trim()) as [string, string, string, string],
    points: Number(q.points) || 1,
    explanation: q.explanation?.trim() || '',
  }));
}

/**
 * Extracts answer key mappings from questions to be saved exclusively in the secure /assessmentAnswerKeys collection.
 */
function extractAnswerKeys(questions: QuizQuestion[], assessmentId: string, courseId: string, trainerId: string) {
  return {
    assessmentId,
    courseId,
    trainerId,
    answers: questions.map((q) => ({
      questionId: q.id,
      correctOptionIndex: q.correctOptionIndex,
    })),
    updatedAt: serverTimestamp(),
  };
}

/**
 * Retrieve assessments for a specific course created by the trainer.
 * Recombines the secure answer key from /assessmentAnswerKeys so the trainer can view and edit correct options.
 */
export async function getTrainerCourseAssessments(
  trainerId: string,
  courseId: string
): Promise<Assessment[]> {
  try {
    const assessmentsRef = collection(db, 'assessments');
    const q = query(
      assessmentsRef,
      where('courseId', '==', courseId),
      where('trainerId', '==', trainerId)
    );
    const snapshot = await getDocs(q);

    // Fetch matching answer keys for this trainer
    const answerKeyRef = collection(db, 'assessmentAnswerKeys');
    const keyQuery = query(
      answerKeyRef,
      where('courseId', '==', courseId),
      where('trainerId', '==', trainerId)
    );
    const keySnapshot = await getDocs(keyQuery);
    const keyMap = new Map<string, Map<string, number>>();
    keySnapshot.docs.forEach((docSnap) => {
      const data = docSnap.data();
      const questionMap = new Map<string, number>();
      if (Array.isArray(data.answers)) {
        data.answers.forEach((ans: { questionId: string; correctOptionIndex: number }) => {
          questionMap.set(ans.questionId, ans.correctOptionIndex);
        });
      }
      keyMap.set(docSnap.id, questionMap);
    });

    const results: Assessment[] = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      const questionMap = keyMap.get(docSnap.id) || new Map<string, number>();

      const rawQuestions = Array.isArray(data.questions) ? data.questions : [];
      const questionsWithKeys: QuizQuestion[] = rawQuestions.map((q: any) => ({
        id: q.id,
        questionText: q.questionText || '',
        options: q.options || ['', '', '', ''],
        correctOptionIndex: questionMap.has(q.id) ? questionMap.get(q.id)! : (q.correctOptionIndex ?? 0),
        points: q.points || 1,
        explanation: q.explanation || '',
      }));

      return {
        id: docSnap.id,
        title: data.title || '',
        description: data.description || '',
        courseId: data.courseId,
        courseTitle: data.courseTitle || '',
        trainerId: data.trainerId,
        trainerName: data.trainerName || 'Faculty Instructor',
        passingPercentage: data.passingPercentage || 70,
        status: (data.status as AssessmentStatus) || 'draft',
        totalMarks: data.totalMarks || questionsWithKeys.reduce((s, item) => s + item.points, 0),
        questionCount: data.questionCount || questionsWithKeys.length,
        timeLimitMinutes: data.timeLimitMinutes,
        questions: questionsWithKeys,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
    });

    return results.sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return timeB - timeA;
    });
  } catch (error: any) {
    console.warn(`Notice: Failed to fetch assessments for course ${courseId} (offline or syncing):`, error?.message || error);
    return [];
  }
}

/**
 * Retrieve all assessments authored by a trainer across all courses.
 */
export async function getAllTrainerAssessments(trainerId: string): Promise<Assessment[]> {
  try {
    const assessmentsRef = collection(db, 'assessments');
    const q = query(assessmentsRef, where('trainerId', '==', trainerId));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      const rawQuestions = Array.isArray(data.questions) ? data.questions : [];
      return {
        id: docSnap.id,
        title: data.title || '',
        description: data.description || '',
        courseId: data.courseId,
        courseTitle: data.courseTitle || '',
        trainerId: data.trainerId,
        trainerName: data.trainerName || 'Faculty Instructor',
        passingPercentage: data.passingPercentage || 70,
        status: (data.status as AssessmentStatus) || 'draft',
        totalMarks: data.totalMarks || 0,
        questionCount: data.questionCount || rawQuestions.length,
        timeLimitMinutes: data.timeLimitMinutes,
        questions: rawQuestions,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      } as Assessment;
    });
  } catch (error: any) {
    console.warn('Notice: Failed to fetch all trainer assessments (offline or syncing):', error?.message || error);
    return [];
  }
}

/**
 * Create a new assessment and store answer keys into the protected /assessmentAnswerKeys collection.
 */
export async function createAssessment(
  input: CreateAssessmentInput,
  trainerId: string,
  trainerName: string,
  ownedCourseIds?: string[]
): Promise<string> {
  const validation = validateAssessmentInput(input, trainerId, ownedCourseIds);
  if (!validation.isValid) {
    const firstErr = Object.values(validation.errors)[0] || 'Invalid assessment inputs';
    throw new Error(firstErr);
  }

  // Generate deterministic/unique document id
  const assessmentCol = collection(db, 'assessments');
  const assessmentRef = doc(assessmentCol);
  const assessmentId = assessmentRef.id;

  // Sanitize questions to avoid leaking answer keys in the public collection
  const sanitizedQuestions = sanitizeQuestionsForPublicCollection(input.questions);

  const assessmentDocData = {
    title: input.title.trim(),
    description: input.description.trim(),
    courseId: input.courseId,
    courseTitle: input.courseTitle?.trim() || '',
    trainerId,
    trainerName: trainerName.trim(),
    passingPercentage: Number(input.passingPercentage),
    status: input.status,
    totalMarks: validation.totalMarks,
    questionCount: sanitizedQuestions.length,
    ...(input.timeLimitMinutes ? { timeLimitMinutes: Number(input.timeLimitMinutes) } : {}),
    questions: sanitizedQuestions,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const answerKeyDocData = {
    assessmentId,
    courseId: input.courseId,
    trainerId,
    answers: input.questions.map((q) => ({
      questionId: q.id,
      correctOptionIndex: q.correctOptionIndex,
    })),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    // 1. Write public assessment document
    await setDoc(assessmentRef, assessmentDocData);

    // 2. Write protected answer key document
    const answerKeyRef = doc(db, 'assessmentAnswerKeys', assessmentId);
    await setDoc(answerKeyRef, answerKeyDocData);

    return assessmentId;
  } catch (error) {
    console.error('Failed to create assessment in Cloud Firestore:', error);
    handleFirestoreError(error, OperationType.CREATE, `assessments/${assessmentId}`);
  }
}

/**
 * Update an existing assessment and update the answer keys.
 */
export async function updateAssessment(
  assessmentId: string,
  input: UpdateAssessmentInput,
  trainerId: string,
  ownedCourseIds?: string[]
): Promise<void> {
  if (!assessmentId) throw new Error('Assessment ID is required for update.');

  if (input.questions && input.title && input.description && input.courseId && input.passingPercentage && input.status) {
    const validation = validateAssessmentInput(
      {
        title: input.title,
        description: input.description,
        courseId: input.courseId,
        passingPercentage: input.passingPercentage,
        status: input.status,
        questions: input.questions,
        timeLimitMinutes: input.timeLimitMinutes,
      },
      trainerId,
      ownedCourseIds
    );
    if (!validation.isValid) {
      const firstErr = Object.values(validation.errors)[0] || 'Invalid assessment inputs';
      throw new Error(firstErr);
    }
  }

  const assessmentRef = doc(db, 'assessments', assessmentId);
  const payload: Record<string, any> = {
    updatedAt: serverTimestamp(),
  };

  if (input.title !== undefined) payload.title = input.title.trim();
  if (input.description !== undefined) payload.description = input.description.trim();
  if (input.courseId !== undefined) payload.courseId = input.courseId;
  if (input.courseTitle !== undefined) payload.courseTitle = input.courseTitle.trim();
  if (input.passingPercentage !== undefined) payload.passingPercentage = Number(input.passingPercentage);
  if (input.status !== undefined) payload.status = input.status;
  if (input.timeLimitMinutes !== undefined) payload.timeLimitMinutes = Number(input.timeLimitMinutes);

  if (input.questions) {
    payload.questions = sanitizeQuestionsForPublicCollection(input.questions);
    payload.questionCount = input.questions.length;
    payload.totalMarks = input.questions.reduce((sum, q) => sum + (Number(q.points) || 1), 0);
  }

  try {
    await updateDoc(assessmentRef, payload);

    if (input.questions && input.courseId) {
      const answerKeyRef = doc(db, 'assessmentAnswerKeys', assessmentId);
      await setDoc(
        answerKeyRef,
        {
          assessmentId,
          courseId: input.courseId,
          trainerId,
          answers: input.questions.map((q) => ({
            questionId: q.id,
            correctOptionIndex: q.correctOptionIndex,
          })),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }
  } catch (error) {
    console.error(`Failed to update assessment ${assessmentId}:`, error);
    handleFirestoreError(error, OperationType.UPDATE, `assessments/${assessmentId}`);
  }
}

/**
 * Quick toggle status for an assessment (e.g. draft -> published, or -> archived)
 */
export async function updateAssessmentStatus(
  assessmentId: string,
  newStatus: AssessmentStatus
): Promise<void> {
  if (!assessmentId) throw new Error('Assessment ID required');
  try {
    const assessmentRef = doc(db, 'assessments', assessmentId);
    await updateDoc(assessmentRef, {
      status: newStatus,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error(`Failed to update assessment status for ${assessmentId}:`, error);
    handleFirestoreError(error, OperationType.UPDATE, `assessments/${assessmentId}`);
  }
}

/**
 * Remove an assessment and its associated answer keys
 */
export async function deleteAssessment(
  assessmentId: string
): Promise<void> {
  if (!assessmentId) throw new Error('Assessment ID required');
  try {
    await deleteDoc(doc(db, 'assessments', assessmentId));
    await deleteDoc(doc(db, 'assessmentAnswerKeys', assessmentId)).catch(() => {});
  } catch (error) {
    console.error(`Failed to delete assessment ${assessmentId}:`, error);
    handleFirestoreError(error, OperationType.DELETE, `assessments/${assessmentId}`);
  }
}

/**
 * Retrieve published assessments linked to courses the logged-in trainee is enrolled in.
 */
export async function getEnrolledCourseAssessments(
  enrolledCourseIds: string[]
): Promise<Assessment[]> {
  if (!enrolledCourseIds || enrolledCourseIds.length === 0) return [];

  try {
    const assessmentsRef = collection(db, 'assessments');
    const q = query(assessmentsRef, where('status', '==', 'published'));
    const snapshot = await getDocs(q);

    const published = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      const rawQuestions = Array.isArray(data.questions) ? data.questions : [];
      return {
        id: docSnap.id,
        title: data.title || '',
        description: data.description || '',
        courseId: data.courseId,
        courseTitle: data.courseTitle || '',
        trainerId: data.trainerId,
        trainerName: data.trainerName || 'Faculty Instructor',
        passingPercentage: data.passingPercentage || 70,
        status: (data.status as AssessmentStatus) || 'published',
        totalMarks: data.totalMarks || 0,
        questionCount: data.questionCount || rawQuestions.length,
        timeLimitMinutes: data.timeLimitMinutes,
        questions: rawQuestions,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      } as Assessment;
    });

    // Only return quizzes belonging to courses the trainee has enrolled in
    return published.filter((a) => enrolledCourseIds.includes(a.courseId));
  } catch (error: any) {
    console.warn('Notice: Failed to fetch enrolled course assessments (offline or syncing):', error?.message || error);
    return [];
  }
}

/**
 * Retrieve all assessment attempts for a trainee
 */
export async function getTraineeAttempts(traineeId: string): Promise<AssessmentAttempt[]> {
  if (!traineeId) return [];

  try {
    const attemptsRef = collection(db, 'assessmentAttempts');
    const q = query(attemptsRef, where('traineeId', '==', traineeId));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        assessmentId: data.assessmentId,
        courseId: data.courseId,
        traineeId: data.traineeId,
        traineeName: data.traineeName,
        assessmentTitle: data.assessmentTitle,
        courseTitle: data.courseTitle,
        answers: Array.isArray(data.answers) ? data.answers : [],
        status: (data.status as AttemptStatus) || 'in_progress',
        startedAt: data.startedAt,
        submittedAt: data.submittedAt,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
    });
  } catch (error: any) {
    console.warn('Notice: Failed to fetch trainee attempts (offline or syncing):', error?.message || error);
    return [];
  }
}

/**
 * Fetch a trainee's specific attempt for an assessment
 */
export async function getTraineeAttempt(
  traineeId: string,
  assessmentId: string
): Promise<AssessmentAttempt | null> {
  if (!traineeId || !assessmentId) return null;
  const docId = getAttemptDocId(traineeId, assessmentId);

  try {
    const docRef = doc(db, 'assessmentAttempts', docId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;

    const data = snap.data();
    return {
      id: snap.id,
      assessmentId: data.assessmentId,
      courseId: data.courseId,
      traineeId: data.traineeId,
      traineeName: data.traineeName,
      assessmentTitle: data.assessmentTitle,
      courseTitle: data.courseTitle,
      answers: Array.isArray(data.answers) ? data.answers : [],
      status: (data.status as AttemptStatus) || 'in_progress',
      startedAt: data.startedAt,
      submittedAt: data.submittedAt,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  } catch (error: any) {
    console.warn(`Notice: Failed to fetch attempt for ${docId}:`, error?.message || error);
    return null;
  }
}

/**
 * Start or resume a trainee attempt using the deterministic document ID pattern
 * `${traineeId}_${assessmentId}` to eliminate race conditions and enforce one attempt per quiz.
 */
export async function startOrResumeAttempt(params: {
  traineeId: string;
  traineeName?: string;
  assessmentId: string;
  courseId: string;
  assessmentTitle?: string;
  courseTitle?: string;
}): Promise<AssessmentAttempt> {
  const { traineeId, traineeName, assessmentId, courseId, assessmentTitle, courseTitle } = params;
  if (!traineeId) throw new Error('Authentication required to start an assessment attempt.');
  if (!assessmentId) throw new Error('Assessment identifier is required.');
  if (!courseId) throw new Error('Course identifier is required.');

  const docId = getAttemptDocId(traineeId, assessmentId);
  const docRef = doc(db, 'assessmentAttempts', docId);

  // Check if an attempt already exists
  const existingSnap = await getDoc(docRef);
  if (existingSnap.exists()) {
    const data = existingSnap.data();
    return {
      id: existingSnap.id,
      assessmentId: data.assessmentId,
      courseId: data.courseId,
      traineeId: data.traineeId,
      traineeName: data.traineeName || traineeName,
      assessmentTitle: data.assessmentTitle || assessmentTitle,
      courseTitle: data.courseTitle || courseTitle,
      answers: Array.isArray(data.answers) ? data.answers : [],
      status: (data.status as AttemptStatus) || 'in_progress',
      startedAt: data.startedAt,
      submittedAt: data.submittedAt,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  // Create new in_progress attempt
  const payload = {
    assessmentId,
    courseId,
    traineeId,
    traineeName: traineeName || 'Trainee Learner',
    assessmentTitle: assessmentTitle || 'Course Quiz',
    courseTitle: courseTitle || 'Enrolled Course',
    answers: [],
    status: 'in_progress' as AttemptStatus,
    startedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(docRef, payload);
    return {
      id: docId,
      assessmentId,
      courseId,
      traineeId,
      traineeName: payload.traineeName,
      assessmentTitle: payload.assessmentTitle,
      courseTitle: payload.courseTitle,
      answers: [],
      status: 'in_progress',
      startedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  } catch (error) {
    console.error(`Failed to initialize attempt ${docId}:`, error);
    handleFirestoreError(error, OperationType.CREATE, `assessmentAttempts/${docId}`);
  }
}

/**
 * Save in-progress answers as the trainee progresses through the quiz
 */
export async function saveAttemptProgress(
  traineeId: string,
  assessmentId: string,
  answers: QuestionAnswer[]
): Promise<void> {
  const docId = getAttemptDocId(traineeId, assessmentId);
  const docRef = doc(db, 'assessmentAttempts', docId);

  try {
    await updateDoc(docRef, {
      answers,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error(`Failed to save attempt progress for ${docId}:`, error);
    handleFirestoreError(error, OperationType.UPDATE, `assessmentAttempts/${docId}`);
  }
}

/**
 * Submit the assessment attempt.
 * Verifies completeness and transitions status to 'submitted'.
 * Firestore security rules lock down the document once status is 'submitted'.
 */
export async function submitAssessmentAttempt(
  traineeId: string,
  assessmentId: string,
  answers: QuestionAnswer[],
  questions: QuizQuestion[]
): Promise<void> {
  const validation = validateAttemptSubmission(questions, answers, traineeId, assessmentId);
  if (!validation.isValid) {
    throw new Error(validation.error || 'Please answer all questions before submitting.');
  }

  const docId = getAttemptDocId(traineeId, assessmentId);
  const docRef = doc(db, 'assessmentAttempts', docId);

  try {
    await updateDoc(docRef, {
      answers,
      status: 'submitted',
      submittedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error(`Failed to submit assessment attempt ${docId}:`, error);
    handleFirestoreError(error, OperationType.UPDATE, `assessmentAttempts/${docId}`);
  }
}

/**
 * Authoritatively grades and finalizes an assessment submission.
 * Saves trainee answers, then invokes the server-side grading API (/api/grade-assessment)
 * which computes marks securely against the protected answer key and stores an immutable AssessmentResult.
 */
export async function gradeAndSubmitAssessment(params: {
  traineeId: string;
  traineeName?: string;
  traineeEmail?: string;
  assessmentId: string;
  answers: QuestionAnswer[];
  questions: QuizQuestion[];
}): Promise<AssessmentResult> {
  const { traineeId, assessmentId, answers, questions } = params;

  // 1. Client-side pre-validation
  const validation = validateAttemptSubmission(questions, answers, traineeId, assessmentId);
  if (!validation.isValid) {
    throw new Error(validation.error || 'Please answer all questions before submitting.');
  }

  const attemptId = getAttemptDocId(traineeId, assessmentId);
  const attemptDocRef = doc(db, 'assessmentAttempts', attemptId);

  // 2. Persist answers to the attempt doc
  try {
    await updateDoc(attemptDocRef, {
      answers,
      status: 'submitted',
      submittedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Attempt update status error, continuing to server grading:', err);
  }

  // 3. Post to backend grading endpoint
  const response = await fetch('/api/grade-assessment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      assessmentId,
      traineeId,
      attemptId,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || `Grading failed with server status ${response.status}`);
  }

  const responseData = await response.json();
  return responseData.result as AssessmentResult;
}

/**
 * Fetch all assessment results for a specific trainee
 */
export async function getTraineeResults(traineeId: string): Promise<AssessmentResult[]> {
  try {
    const resultsRef = collection(db, 'assessmentResults');
    const q = query(resultsRef, where('traineeId', '==', traineeId));
    const snapshot = await getDocs(q);
    const results: AssessmentResult[] = [];
    snapshot.forEach((d) => {
      const data = d.data();
      results.push({
        id: d.id,
        attemptId: data.attemptId || d.id,
        assessmentId: data.assessmentId,
        courseId: data.courseId,
        traineeId: data.traineeId,
        traineeName: data.traineeName,
        traineeEmail: data.traineeEmail,
        assessmentTitle: data.assessmentTitle || 'Course Quiz',
        courseTitle: data.courseTitle || 'Enrolled Course',
        totalQuestions: Number(data.totalQuestions) || 0,
        correctAnswers: Number(data.correctAnswers) || 0,
        incorrectAnswers: Number(data.incorrectAnswers) || 0,
        unansweredCount: Number(data.unansweredCount) || 0,
        totalMarks: Number(data.totalMarks) || 0,
        marksObtained: Number(data.marksObtained) || 0,
        percentage: Number(data.percentage) || 0,
        passingPercentage: Number(data.passingPercentage) || 70,
        resultStatus: data.resultStatus as ResultStatus,
        submittedAt: data.submittedAt,
        gradedAt: data.gradedAt,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      });
    });
    return results;
  } catch (error) {
    console.error('Failed to get trainee results:', error);
    handleFirestoreError(error, OperationType.GET, `assessmentResults/trainee/${traineeId}`);
    return [];
  }
}

/**
 * Fetch an individual result for a specific trainee and assessment
 */
export async function getTraineeResultForAssessment(
  traineeId: string,
  assessmentId: string
): Promise<AssessmentResult | null> {
  try {
    const docId = getAttemptDocId(traineeId, assessmentId);
    const docRef = doc(db, 'assessmentResults', docId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      id: snap.id,
      attemptId: data.attemptId || snap.id,
      assessmentId: data.assessmentId,
      courseId: data.courseId,
      traineeId: data.traineeId,
      traineeName: data.traineeName,
      traineeEmail: data.traineeEmail,
      assessmentTitle: data.assessmentTitle || 'Course Quiz',
      courseTitle: data.courseTitle || 'Enrolled Course',
      totalQuestions: Number(data.totalQuestions) || 0,
      correctAnswers: Number(data.correctAnswers) || 0,
      incorrectAnswers: Number(data.incorrectAnswers) || 0,
      unansweredCount: Number(data.unansweredCount) || 0,
      totalMarks: Number(data.totalMarks) || 0,
      marksObtained: Number(data.marksObtained) || 0,
      percentage: Number(data.percentage) || 0,
      passingPercentage: Number(data.passingPercentage) || 70,
      resultStatus: data.resultStatus as ResultStatus,
      submittedAt: data.submittedAt,
      gradedAt: data.gradedAt,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  } catch (error) {
    console.error('Failed to get result for assessment:', error);
    return null;
  }
}

/**
 * Fetch all assessment results across a course for the course trainer gradebook
 */
export async function getCourseResultsForTrainer(
  courseId: string,
  _trainerId: string
): Promise<AssessmentResult[]> {
  try {
    const resultsRef = collection(db, 'assessmentResults');
    const q = query(resultsRef, where('courseId', '==', courseId));
    const snapshot = await getDocs(q);
    const results: AssessmentResult[] = [];
    snapshot.forEach((d) => {
      const data = d.data();
      results.push({
        id: d.id,
        attemptId: data.attemptId || d.id,
        assessmentId: data.assessmentId,
        courseId: data.courseId,
        traineeId: data.traineeId,
        traineeName: data.traineeName,
        traineeEmail: data.traineeEmail,
        assessmentTitle: data.assessmentTitle || 'Course Quiz',
        courseTitle: data.courseTitle || 'Enrolled Course',
        totalQuestions: Number(data.totalQuestions) || 0,
        correctAnswers: Number(data.correctAnswers) || 0,
        incorrectAnswers: Number(data.incorrectAnswers) || 0,
        unansweredCount: Number(data.unansweredCount) || 0,
        totalMarks: Number(data.totalMarks) || 0,
        marksObtained: Number(data.marksObtained) || 0,
        percentage: Number(data.percentage) || 0,
        passingPercentage: Number(data.passingPercentage) || 70,
        resultStatus: data.resultStatus as ResultStatus,
        submittedAt: data.submittedAt,
        gradedAt: data.gradedAt,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      });
    });
    return results;
  } catch (error) {
    console.error('Failed to get trainer course results:', error);
    handleFirestoreError(error, OperationType.GET, `assessmentResults/course/${courseId}`);
    return [];
  }
}

