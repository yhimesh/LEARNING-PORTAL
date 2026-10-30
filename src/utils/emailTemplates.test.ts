import test from 'node:test';
import assert from 'node:assert';
import {
  renderTrainerApprovalEmail,
  renderTrainerRejectionEmail,
  renderCourseEnrollmentEmail,
  renderNewResourceEmail,
  renderAssessmentResultEmail,
  renderAdminTrainerRegistrationEmail,
} from './emailTemplates';

test('renderTrainerApprovalEmail generates appropriate subject, name, and link', () => {
  const result = renderTrainerApprovalEmail({
    fullName: 'Dr. Jane Doe',
    appUrl: 'https://test.capacityconnect.edu',
  });

  assert.match(result.subject, /Faculty Application Approved/i);
  assert.ok(result.html.includes('Dr. Jane Doe'));
  assert.ok(result.html.includes('https://test.capacityconnect.edu#dashboard'));
  assert.ok(result.text.includes('Dr. Jane Doe'));
  assert.ok(result.text.includes('https://test.capacityconnect.edu#dashboard'));
});

test('renderTrainerRejectionEmail includes provided reason and supportive copy', () => {
  const result = renderTrainerRejectionEmail({
    fullName: 'John Smith',
    reason: 'Incomplete accreditation credentials.',
    appUrl: 'https://test.capacityconnect.edu',
  });

  assert.match(result.subject, /Update on your CAPACITY CONNECT Trainer Application/i);
  assert.ok(result.html.includes('Incomplete accreditation credentials.'));
  assert.ok(result.html.includes('John Smith'));
  assert.ok(result.text.includes('Incomplete accreditation credentials.'));
});

test('renderCourseEnrollmentEmail includes course title, instructor, and duration', () => {
  const result = renderCourseEnrollmentEmail({
    fullName: 'Alex Student',
    courseId: 'c101',
    courseTitle: 'Full-Stack Web Engineering',
    trainerName: 'Prof. Davis',
    duration: '30 hours',
    category: 'Software',
    appUrl: 'https://test.capacityconnect.edu',
  });

  assert.match(result.subject, /Enrollment Confirmed: Full-Stack Web Engineering/i);
  assert.ok(result.html.includes('Full-Stack Web Engineering'));
  assert.ok(result.html.includes('Prof. Davis'));
  assert.ok(result.html.includes('Alex Student'));
  assert.ok(result.text.includes('Full-Stack Web Engineering'));
});

test('renderNewResourceEmail includes resource title and course title', () => {
  const result = renderNewResourceEmail({
    fullName: 'Alex Student',
    courseId: 'c101',
    courseTitle: 'Full-Stack Web Engineering',
    resourceTitle: 'React 19 Deep Dive Cheatsheet.pdf',
    resourceType: 'pdf',
    appUrl: 'https://test.capacityconnect.edu',
  });

  assert.match(result.subject, /New Resource Added: React 19 Deep Dive Cheatsheet\.pdf/i);
  assert.ok(result.html.includes('React 19 Deep Dive Cheatsheet.pdf'));
  assert.ok(result.html.includes('Full-Stack Web Engineering'));
  assert.ok(result.text.includes('React 19 Deep Dive Cheatsheet.pdf'));
});

test('renderAssessmentResultEmail reflects passed outcome and score accurately', () => {
  const result = renderAssessmentResultEmail({
    fullName: 'Alex Student',
    assessmentId: 'a1',
    assessmentTitle: 'TypeScript Architecture Quiz',
    courseTitle: 'Full-Stack Web Engineering',
    percentage: 85,
    marksObtained: 17,
    totalMarks: 20,
    resultStatus: 'passed',
    passingPercentage: 70,
    appUrl: 'https://test.capacityconnect.edu',
  });

  assert.match(result.subject, /Quiz Results: TypeScript Architecture Quiz — 85% \(Passed\)/i);
  assert.ok(result.html.includes('85%'));
  assert.ok(result.html.includes('17'));
  assert.ok(result.html.includes('20'));
  assert.ok(result.html.includes('Congratulations on Passing!'));
  assert.ok(result.text.includes('85%'));
});

test('renderAdminTrainerRegistrationEmail notifies admin with applicant details', () => {
  const result = renderAdminTrainerRegistrationEmail({
    adminName: 'Platform Superadmin',
    trainerName: 'Dr. John Faculty',
    trainerEmail: 'faculty.john@university.edu',
    trainerUid: 'uid_12345',
    appUrl: 'https://test.capacityconnect.edu',
  });

  assert.match(result.subject, /Action Required: New Faculty Application/i);
  assert.ok(result.html.includes('faculty.john@university.edu'));
  assert.ok(result.html.includes('Dr. John Faculty'));
  assert.ok(result.text.includes('faculty.john@university.edu'));
});
