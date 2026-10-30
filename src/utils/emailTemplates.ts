export interface BaseEmailParams {
  fullName: string;
  appUrl?: string;
}

export interface TrainerApprovalEmailParams extends BaseEmailParams {
  trainerEmail?: string;
}

export interface TrainerRejectionEmailParams extends BaseEmailParams {
  reason?: string;
}

export interface CourseEnrollmentEmailParams extends BaseEmailParams {
  courseId: string;
  courseTitle: string;
  trainerName: string;
  duration?: string;
  category?: string;
}

export interface NewResourceEmailParams extends BaseEmailParams {
  courseId: string;
  courseTitle: string;
  resourceTitle: string;
  resourceType: string;
}

export interface AssessmentResultEmailParams extends BaseEmailParams {
  assessmentId: string;
  assessmentTitle: string;
  courseTitle: string;
  percentage: number;
  marksObtained: number;
  totalMarks: number;
  resultStatus: 'passed' | 'failed';
  passingPercentage: number;
}

export interface AdminTrainerRegistrationEmailParams extends Partial<BaseEmailParams> {
  adminName?: string;
  trainerName: string;
  trainerEmail: string;
  trainerUid: string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

function getBaseStyles(): string {
  return `
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    background-color: #020617;
    color: #f8fafc;
    margin: 0;
    padding: 0;
  `;
}

function wrapEmailTemplate(title: string, contentHtml: string, appUrl: string = 'https://capacityconnect.edu'): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="${getBaseStyles()}">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #020617; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #0f172a; border: 1px solid #1e293b; border-radius: 20px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
          <!-- Header Bar -->
          <tr>
            <td style="padding: 28px 36px; background-color: #0f172a; border-bottom: 1px solid #1e293b;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size: 18px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; text-decoration: none;">
                      CAPACITY CONNECT
                    </span>
                    <span style="display: block; font-size: 11px; color: #22d3ee; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-top: 2px;">
                      Digital Capacity Building & Learning Portal
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding: 36px; color: #cbd5e1; font-size: 15px; line-height: 1.6;">
              ${contentHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 36px; background-color: #020617; border-top: 1px solid #1e293b; text-align: center; font-size: 12px; color: #64748b; line-height: 1.5;">
              <p style="margin: 0 0 8px 0;">This is an automated notification from CAPACITY CONNECT (SIH26075).</p>
              <p style="margin: 0;">
                <a href="${appUrl}" style="color: #22d3ee; text-decoration: none;">Visit Portal</a> • 
                <a href="${appUrl}#dashboard" style="color: #94a3b8; text-decoration: none;">My Dashboard</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * 1. Trainer Application Approved Email
 */
export function renderTrainerApprovalEmail(params: TrainerApprovalEmailParams): RenderedEmail {
  const { fullName, appUrl = 'https://capacityconnect.edu' } = params;
  const subject = 'Faculty Application Approved — Welcome to CAPACITY CONNECT';

  const contentHtml = `
    <h2 style="color: #ffffff; font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 16px;">
      Welcome to the Faculty Team, ${fullName}!
    </h2>
    <p style="margin-bottom: 20px;">
      An administrator has officially verified and approved your credentials for the <strong>Faculty Trainer</strong> role on CAPACITY CONNECT.
    </p>

    <div style="background-color: #020617; border: 1px solid #065f46; border-left: 4px solid #10b981; border-radius: 12px; padding: 18px; margin-bottom: 28px;">
      <div style="font-weight: 600; color: #34d399; font-size: 14px; margin-bottom: 6px;">
        Curriculum Authoring Privileges Granted
      </div>
      <div style="font-size: 13px; color: #94a3b8; line-height: 1.5;">
        You can now author new course syllabi, upload documents and presentations, publish assessments, and monitor trainee learning analytics.
      </div>
    </div>

    <div style="text-align: center; margin: 32px 0 24px 0;">
      <a href="${appUrl}#dashboard" style="display: inline-block; background-color: #22d3ee; color: #020617; font-weight: 700; font-size: 14px; padding: 14px 28px; border-radius: 12px; text-decoration: none; box-shadow: 0 10px 15px -3px rgba(34, 211, 238, 0.3);">
        Go to Trainer Dashboard
      </a>
    </div>
  `;

  const text = `
Welcome to the Faculty Team, ${fullName}!

An administrator has officially verified and approved your credentials for the Faculty Trainer role on CAPACITY CONNECT.

Curriculum Authoring Privileges Granted:
You can now author new course syllabi, upload documents, publish assessments, and monitor trainee learning analytics.

Access your trainer dashboard: ${appUrl}#dashboard
  `.trim();

  return {
    subject,
    html: wrapEmailTemplate(subject, contentHtml, appUrl),
    text,
  };
}

/**
 * 2. Trainer Application Rejection / Feedback Email
 */
export function renderTrainerRejectionEmail(params: TrainerRejectionEmailParams): RenderedEmail {
  const { fullName, reason = 'Faculty credentials could not be verified at this time.', appUrl = 'https://capacityconnect.edu' } = params;
  const subject = 'Update on your CAPACITY CONNECT Trainer Application';

  const contentHtml = `
    <h2 style="color: #ffffff; font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 16px;">
      Hello ${fullName},
    </h2>
    <p style="margin-bottom: 20px;">
      Thank you for your interest in contributing as a curriculum trainer on CAPACITY CONNECT. After reviewing your application, we are unable to approve faculty permissions at this stage.
    </p>

    <div style="background-color: #020617; border: 1px solid #881337; border-left: 4px solid #f43f5e; border-radius: 12px; padding: 18px; margin-bottom: 28px;">
      <div style="font-weight: 600; color: #fb7185; font-size: 14px; margin-bottom: 6px;">
        Review Note
      </div>
      <div style="font-size: 13px; color: #94a3b8; line-height: 1.5;">
        ${reason}
      </div>
    </div>

    <p style="margin-bottom: 20px;">
      You may continue to use CAPACITY CONNECT as a student learner and explore public courses.
    </p>

    <div style="text-align: center; margin: 32px 0 24px 0;">
      <a href="${appUrl}#courses" style="display: inline-block; background-color: #1e293b; color: #f8fafc; font-weight: 600; font-size: 14px; padding: 12px 24px; border-radius: 12px; text-decoration: none; border: 1px solid #334155;">
        Explore Courses
      </a>
    </div>
  `;

  const text = `
Hello ${fullName},

Thank you for your interest in contributing as a curriculum trainer on CAPACITY CONNECT. After reviewing your application, we are unable to approve faculty permissions at this stage.

Review Note:
${reason}

You can continue learning on CAPACITY CONNECT: ${appUrl}#courses
  `.trim();

  return {
    subject,
    html: wrapEmailTemplate(subject, contentHtml, appUrl),
    text,
  };
}

/**
 * 3. Course Enrollment Confirmation Email
 */
export function renderCourseEnrollmentEmail(params: CourseEnrollmentEmailParams): RenderedEmail {
  const { fullName, courseTitle, trainerName, duration = 'Self-paced', category = 'General', appUrl = 'https://capacityconnect.edu' } = params;
  const subject = `Enrollment Confirmed: ${courseTitle}`;

  const contentHtml = `
    <h2 style="color: #ffffff; font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 16px;">
      You're Enrolled, ${fullName}!
    </h2>
    <p style="margin-bottom: 20px;">
      Your registration for <strong>${courseTitle}</strong> has been confirmed. You now have full access to all curriculum modules and checkpoints.
    </p>

    <div style="background-color: #020617; border: 1px solid #1e293b; border-radius: 16px; padding: 20px; margin-bottom: 28px;">
      <table width="100%" cellpadding="6" cellspacing="0" style="font-size: 13px;">
        <tr>
          <td style="color: #94a3b8; width: 35%;">Course:</td>
          <td style="color: #ffffff; font-weight: 600;">${courseTitle}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8;">Instructor:</td>
          <td style="color: #ffffff;">${trainerName}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8;">Category:</td>
          <td style="color: #22d3ee; font-family: monospace;">${category}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8;">Duration:</td>
          <td style="color: #ffffff;">${duration}</td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; margin: 32px 0 24px 0;">
      <a href="${appUrl}#dashboard" style="display: inline-block; background-color: #22d3ee; color: #020617; font-weight: 700; font-size: 14px; padding: 14px 28px; border-radius: 12px; text-decoration: none; box-shadow: 0 10px 15px -3px rgba(34, 211, 238, 0.3);">
        Start Learning Now
      </a>
    </div>
  `;

  const text = `
You're Enrolled, ${fullName}!

Your registration for "${courseTitle}" has been confirmed.

Course Details:
- Instructor: ${trainerName}
- Category: ${category}
- Duration: ${duration}

Access your course materials: ${appUrl}#dashboard
  `.trim();

  return {
    subject,
    html: wrapEmailTemplate(subject, contentHtml, appUrl),
    text,
  };
}

/**
 * 4. New Learning Resource Announcement Email
 */
export function renderNewResourceEmail(params: NewResourceEmailParams): RenderedEmail {
  const { fullName, courseTitle, resourceTitle, resourceType, appUrl = 'https://capacityconnect.edu' } = params;
  const subject = `New Resource Added: ${resourceTitle} (${courseTitle})`;

  const contentHtml = `
    <h2 style="color: #ffffff; font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 16px;">
      New Learning Resource Published
    </h2>
    <p style="margin-bottom: 20px;">
      Hello ${fullName}, your instructor has published a new study resource for your enrolled course <strong>${courseTitle}</strong>.
    </p>

    <div style="background-color: #020617; border: 1px solid #1e293b; border-left: 4px solid #38bdf8; border-radius: 12px; padding: 18px; margin-bottom: 28px;">
      <div style="font-weight: 600; color: #ffffff; font-size: 15px; margin-bottom: 4px;">
        ${resourceTitle}
      </div>
      <div style="font-size: 12px; color: #38bdf8; font-family: monospace; text-transform: uppercase;">
        Type: ${resourceType}
      </div>
    </div>

    <div style="text-align: center; margin: 32px 0 24px 0;">
      <a href="${appUrl}#dashboard" style="display: inline-block; background-color: #22d3ee; color: #020617; font-weight: 700; font-size: 14px; padding: 14px 28px; border-radius: 12px; text-decoration: none;">
        Open Course Classroom
      </a>
    </div>
  `;

  const text = `
New Learning Resource Published

Hello ${fullName}, your instructor has published a new study resource for "${courseTitle}".

Resource: ${resourceTitle}
Type: ${resourceType}

Open your classroom to access it: ${appUrl}#dashboard
  `.trim();

  return {
    subject,
    html: wrapEmailTemplate(subject, contentHtml, appUrl),
    text,
  };
}

/**
 * 5. Assessment Result Available Email
 */
export function renderAssessmentResultEmail(params: AssessmentResultEmailParams): RenderedEmail {
  const {
    fullName,
    assessmentTitle,
    courseTitle,
    percentage,
    marksObtained,
    totalMarks,
    resultStatus,
    passingPercentage,
    appUrl = 'https://capacityconnect.edu',
  } = params;

  const isPassed = resultStatus === 'passed';
  const subject = `Quiz Results: ${assessmentTitle} — ${percentage}% (${isPassed ? 'Passed' : 'Needs Review'})`;

  const contentHtml = `
    <h2 style="color: #ffffff; font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 16px;">
      ${isPassed ? 'Congratulations on Passing!' : 'Quiz Results Available'}
    </h2>
    <p style="margin-bottom: 20px;">
      Hello ${fullName}, your assessment attempt for <strong>${assessmentTitle}</strong> in <em>${courseTitle}</em> has been graded authoritatively.
    </p>

    <div style="background-color: #020617; border: 1px solid ${isPassed ? '#065f46' : '#881337'}; border-radius: 16px; padding: 24px; text-align: center; margin-bottom: 28px;">
      <div style="font-size: 36px; font-weight: 800; color: ${isPassed ? '#34d399' : '#fb7185'}; letter-spacing: -1px;">
        ${percentage}%
      </div>
      <div style="font-size: 13px; color: #94a3b8; margin-top: 6px;">
        Marks: <strong style="color: #ffffff;">${marksObtained}</strong> / ${totalMarks} (Passing score: ${passingPercentage}%)
      </div>
      <div style="margin-top: 12px;">
        <span style="display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; background-color: ${isPassed ? '#064e3b' : '#4c0519'}; color: ${isPassed ? '#6ee7b7' : '#fda4af'};">
          ${isPassed ? 'Passed' : 'Needs Review'}
        </span>
      </div>
    </div>

    <div style="text-align: center; margin: 32px 0 24px 0;">
      <a href="${appUrl}#dashboard" style="display: inline-block; background-color: #22d3ee; color: #020617; font-weight: 700; font-size: 14px; padding: 14px 28px; border-radius: 12px; text-decoration: none;">
        Review Breakdown in Portal
      </a>
    </div>
  `;

  const text = `
Quiz Results: ${assessmentTitle}

Hello ${fullName}, your assessment attempt for "${assessmentTitle}" in "${courseTitle}" has been graded.

Your Score: ${percentage}% (${marksObtained}/${totalMarks} marks)
Status: ${isPassed ? 'PASSED' : 'NEEDS REVIEW'} (Passing Threshold: ${passingPercentage}%)

Review your full assessment breakdown: ${appUrl}#dashboard
  `.trim();

  return {
    subject,
    html: wrapEmailTemplate(subject, contentHtml, appUrl),
    text,
  };
}

/**
 * 6. Admin Notification for New Trainer Registration
 */
export function renderAdminTrainerRegistrationEmail(params: AdminTrainerRegistrationEmailParams): RenderedEmail {
  const { adminName = 'Administrator', trainerName, trainerEmail, trainerUid, appUrl = 'https://capacityconnect.edu' } = params;
  const subject = `Action Required: New Faculty Application (${trainerName})`;

  const contentHtml = `
    <h2 style="color: #ffffff; font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 16px;">
      Faculty Trainer Application Pending Review
    </h2>
    <p style="margin-bottom: 20px;">
      Hello ${adminName}, a new user has registered and requested <strong>Faculty Trainer</strong> privileges on CAPACITY CONNECT.
    </p>

    <div style="background-color: #020617; border: 1px solid #1e293b; border-radius: 16px; padding: 20px; margin-bottom: 28px;">
      <table width="100%" cellpadding="6" cellspacing="0" style="font-size: 13px;">
        <tr>
          <td style="color: #94a3b8; width: 30%;">Applicant:</td>
          <td style="color: #ffffff; font-weight: 600;">${trainerName}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8;">Email:</td>
          <td style="color: #22d3ee;">${trainerEmail}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8;">UID:</td>
          <td style="color: #94a3b8; font-family: monospace;">${trainerUid}</td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; margin: 32px 0 24px 0;">
      <a href="${appUrl}#dashboard" style="display: inline-block; background-color: #f59e0b; color: #020617; font-weight: 700; font-size: 14px; padding: 14px 28px; border-radius: 12px; text-decoration: none;">
        Review in Admin Dashboard
      </a>
    </div>
  `;

  const text = `
Faculty Trainer Application Pending Review

Hello ${adminName}, a new user has registered and requested Faculty Trainer privileges.

Applicant: ${trainerName}
Email: ${trainerEmail}
UID: ${trainerUid}

Review and approve the applicant: ${appUrl}#dashboard
  `.trim();

  return {
    subject,
    html: wrapEmailTemplate(subject, contentHtml, appUrl),
    text,
  };
}
