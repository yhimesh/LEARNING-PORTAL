/**
 * Firebase Cloud Functions (v2 / callable / HTTP)
 * Authoritative Server-Side Quiz Grading Function
 *
 * Can be deployed to Firebase via:
 *   firebase deploy --only functions
 */

const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Compare trainee answers with protected answer key and compute grades
 */
function calculateQuizScore({ passingPercentage, questions, answerKey, traineeAnswers }) {
  const answerMap = new Map();
  for (const item of answerKey) {
    if (item && item.questionId) {
      answerMap.set(item.questionId, item.correctOptionIndex);
    }
  }

  const traineeSelectionMap = new Map();
  for (const item of traineeAnswers) {
    if (item && item.questionId && typeof item.selectedOptionIndex === 'number') {
      traineeSelectionMap.set(item.questionId, item.selectedOptionIndex);
    }
  }

  let totalQuestions = questions.length;
  let correctAnswers = 0;
  let incorrectAnswers = 0;
  let unansweredCount = 0;
  let totalMarks = 0;
  let marksObtained = 0;

  for (const q of questions) {
    const points = typeof q.points === 'number' && q.points > 0 ? q.points : 1;
    totalMarks += points;

    const correctIndex = answerMap.get(q.id);
    const traineeSelection = traineeSelectionMap.get(q.id);

    if (typeof traineeSelection !== 'number') {
      unansweredCount++;
      incorrectAnswers++;
    } else if (typeof correctIndex === 'number' && traineeSelection === correctIndex) {
      correctAnswers++;
      marksObtained += points;
    } else {
      incorrectAnswers++;
    }
  }

  const percentage = totalMarks > 0 ? Math.round((marksObtained / totalMarks) * 100) : 0;
  const targetThreshold = typeof passingPercentage === 'number' ? passingPercentage : 70;
  const resultStatus = percentage >= targetThreshold ? 'passed' : 'failed';

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

/**
 * Cloud Function HTTP Endpoint for grading assessment
 */
exports.gradeAssessment = onRequest({ cors: true }, async (req, res) => {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method Not Allowed' });
      return;
    }

    const { assessmentId, traineeId, attemptId } = req.body;
    if (!assessmentId || !traineeId || !attemptId) {
      res.status(400).json({ error: 'Missing required parameters.' });
      return;
    }

    const expectedAttemptId = `${traineeId}_${assessmentId}`;
    if (attemptId !== expectedAttemptId) {
      res.status(400).json({ error: 'Invalid attempt ID pattern.' });
      return;
    }

    // 1. Check if already graded
    const resultDocRef = db.collection('assessmentResults').doc(attemptId);
    const existingResultSnap = await resultDocRef.get();
    if (existingResultSnap.exists) {
      res.status(200).json({
        success: true,
        alreadyGraded: true,
        result: existingResultSnap.data(),
      });
      return;
    }

    // 2. Fetch attempt
    const attemptSnap = await db.collection('assessmentAttempts').doc(attemptId).get();
    if (!attemptSnap.exists) {
      res.status(404).json({ error: 'Assessment attempt not found.' });
      return;
    }
    const attemptData = attemptSnap.data();

    // 3. Fetch assessment
    const assessmentSnap = await db.collection('assessments').doc(assessmentId).get();
    if (!assessmentSnap.exists) {
      res.status(404).json({ error: 'Assessment not found.' });
      return;
    }
    const assessmentData = assessmentSnap.data();

    // 4. Fetch protected answer key
    const keySnap = await db.collection('assessmentAnswerKeys').doc(assessmentId).get();
    if (!keySnap.exists) {
      res.status(500).json({ error: 'Answer key not found.' });
      return;
    }
    const keyData = keySnap.data();

    // 5. Score calculation
    const summary = calculateQuizScore({
      passingPercentage: assessmentData.passingPercentage || 70,
      questions: assessmentData.questions || [],
      answerKey: keyData.answers || [],
      traineeAnswers: attemptData.answers || [],
    });

    // 6. Write result
    const resultPayload = {
      id: attemptId,
      attemptId,
      assessmentId,
      courseId: assessmentData.courseId,
      traineeId,
      traineeName: attemptData.traineeName || 'Trainee Learner',
      traineeEmail: attemptData.traineeEmail || '',
      assessmentTitle: assessmentData.title || 'Course Quiz',
      courseTitle: assessmentData.courseTitle || 'Enrolled Course',
      totalQuestions: summary.totalQuestions,
      correctAnswers: summary.correctAnswers,
      incorrectAnswers: summary.incorrectAnswers,
      unansweredCount: summary.unansweredCount,
      totalMarks: summary.totalMarks,
      marksObtained: summary.marksObtained,
      percentage: summary.percentage,
      passingPercentage: summary.passingPercentage,
      resultStatus: summary.resultStatus,
      submittedAt: attemptData.submittedAt || admin.firestore.FieldValue.serverTimestamp(),
      gradedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await resultDocRef.set(resultPayload);

    // 7. Mark attempt finalized
    await db.collection('assessmentAttempts').doc(attemptId).update({
      status: 'submitted',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(200).json({
      success: true,
      alreadyGraded: false,
      result: resultPayload,
    });
  } catch (error) {
    console.error('Error in gradeAssessment cloud function:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});
