export type FaqCategoryId =
  | 'getting-started'
  | 'account-login'
  | 'trainee-enrollment'
  | 'trainer-course'
  | 'learning-resources'
  | 'quizzes-results'
  | 'notifications'
  | 'troubleshooting';

export interface FaqCategory {
  id: FaqCategoryId;
  label: string;
  description: string;
  iconName: string;
}

export interface FaqItem {
  id: string;
  categoryId: FaqCategoryId;
  question: string;
  answer: string;
  tags: string[];
  helpfulAction?: {
    label: string;
    actionType: 'navigate_courses' | 'navigate_contact' | 'open_auth_signin' | 'open_auth_trainer';
  };
}

export const FAQ_CATEGORIES: FaqCategory[] = [
  {
    id: 'getting-started',
    label: 'Getting Started',
    description: 'Portal overview, core mission, and quick orientation for new users',
    iconName: 'Sparkles',
  },
  {
    id: 'account-login',
    label: 'Account & Login',
    description: 'Registration, Google Sign-In, and user roles (Trainee vs Trainer)',
    iconName: 'KeyRound',
  },
  {
    id: 'trainee-enrollment',
    label: 'Trainee & Enrollment',
    description: 'Enrolling in modules, tracking enrolled courses, and reviews',
    iconName: 'GraduationCap',
  },
  {
    id: 'trainer-course',
    label: 'Trainer & Course Management',
    description: 'Trainer verification, authoring courses, and publishing curriculum',
    iconName: 'Briefcase',
  },
  {
    id: 'learning-resources',
    label: 'Learning Resources',
    description: 'Course classroom, video streaming, PDF materials, and progress',
    iconName: 'BookOpen',
  },
  {
    id: 'quizzes-results',
    label: 'Quizzes & Results',
    description: 'Assessments, time limits, scoring criteria, and gradebooks',
    iconName: 'Award',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    description: 'Real-time in-app alerts and transactional email updates',
    iconName: 'Bell',
  },
  {
    id: 'troubleshooting',
    label: 'Troubleshooting',
    description: 'Resolving login issues, connection errors, and common questions',
    iconName: 'AlertCircle',
  },
];

export const FAQ_ITEMS: FaqItem[] = [
  // 1. Getting Started
  {
    id: 'gs-1',
    categoryId: 'getting-started',
    question: 'What is CAPACITY CONNECT and what problem does it address?',
    answer:
      'CAPACITY CONNECT is a digital capacity building and learning management portal engineered for Smart India Hackathon problem statement SIH26075. It provides a centralized, accessible digital learning hub bridging academic curriculum with industry competencies in programming, AI/ML, data structures, and web technologies.',
    tags: ['sih26075', 'overview', 'mission', 'about'],
  },
  {
    id: 'gs-2',
    categoryId: 'getting-started',
    question: 'Is CAPACITY CONNECT free to access for college students?',
    answer:
      'Yes. The portal is open to students and faculty members. Any trainee can explore published course catalogues, enroll in modules, access video tutorials and lecture materials, take quizzes, and track competency progress at no cost.',
    tags: ['free', 'students', 'pricing', 'access'],
  },
  {
    id: 'gs-3',
    categoryId: 'getting-started',
    question: 'How do personalized course recommendations work?',
    answer:
      'The portal uses an explainable, data-driven recommendation engine that analyzes your enrolled subject categories and difficulty levels. It suggests intermediate or advanced progression in categories you have taken, highlights recently published courses, and surfaces top-rated modules without sharing your data with third-party AI APIs.',
    tags: ['recommendations', 'learning path', 'suggestions', 'personalized'],
  },

  // 2. Account & Login
  {
    id: 'acc-1',
    categoryId: 'account-login',
    question: 'How do I create an account and log in?',
    answer:
      'Click the "Sign In" button in the top navigation bar. Choose your desired account role: "Trainee" (for students and learners) or "Trainer" (for faculty instructors). Next, click "Continue with Google" to authenticate securely using Firebase Authentication popup. You will be redirected to your personalized dashboard.',
    tags: ['register', 'login', 'google', 'signup', 'auth'],
    helpfulAction: {
      label: 'Sign In Now',
      actionType: 'open_auth_signin',
    },
  },
  {
    id: 'acc-2',
    categoryId: 'account-login',
    question: 'What is the difference between a Trainee and a Trainer account?',
    answer:
      'Trainee accounts are for learners who want to enroll in courses, access classroom materials, submit quiz attempts, earn passing transcripts, and rate courses. Trainer accounts are designed for faculty instructors to author courses, upload learning materials, design quizzes, and monitor cohort analytics.',
    tags: ['roles', 'trainee', 'trainer', 'permissions'],
  },
  {
    id: 'acc-3',
    categoryId: 'account-login',
    question: 'Can I switch roles or have both Trainee and Trainer privileges on one account?',
    answer:
      'Role privileges are strictly partitioned by account. Trainees cannot author courses or review protected answer keys, while Trainers cannot enroll as students in their own modules. If you need both roles for demonstration or instruction, you can register separate accounts using different email logins.',
    tags: ['role switch', 'multiple accounts', 'trainer permissions'],
  },

  // 3. Trainee & Enrollment
  {
    id: 'trn-1',
    categoryId: 'trainee-enrollment',
    question: 'How do I enroll in a course?',
    answer:
      'Navigate to the Course Catalogue by clicking "Explore Courses". Click "View Details" on any module to review syllabus topics, duration, instructor bio, and competency outcomes. Then click "Enroll Now". Your enrollment record is immediately registered in Cloud Firestore.',
    tags: ['enroll', 'courses', 'registration'],
    helpfulAction: {
      label: 'Explore Courses',
      actionType: 'navigate_courses',
    },
  },
  {
    id: 'trn-2',
    categoryId: 'trainee-enrollment',
    question: 'Where can I find my enrolled courses?',
    answer:
      'Once logged in as a Trainee, scroll to the Trainee Dashboard. Your enrolled modules appear in the "My Courses" section, showing the course title, instructor, completion percentage, and a direct button to "Go to Classroom & Materials".',
    tags: ['my courses', 'dashboard', 'enrolled'],
  },
  {
    id: 'trn-3',
    categoryId: 'trainee-enrollment',
    question: 'Can I submit a course rating and written review?',
    answer:
      'Yes! Actively enrolled trainees can submit a 1 to 5 star rating and written review (up to 500 characters) directly within the Course Details modal. Each trainee can submit one review per course, which can be edited or deleted at any time. Trainers cannot review their own courses.',
    tags: ['reviews', 'ratings', 'feedback', 'stars'],
  },

  // 4. Trainer & Course Management
  {
    id: 'trc-1',
    categoryId: 'trainer-course',
    question: 'How does a trainer get approved?',
    answer:
      'When you register with the Trainer role, your account is initially created in "pending" status to ensure faculty vetting. Platform administrators review pending applicants in the Admin Analytics Dashboard and approve verified educators. For testing, an immediate activation button is also available on the pending trainer dashboard banner.',
    tags: ['trainer approval', 'pending', 'faculty', 'activation'],
  },
  {
    id: 'trc-2',
    categoryId: 'trainer-course',
    question: 'How can an approved trainer publish a new course?',
    answer:
      'Approved trainers can click "Create Custom Course" in the Course Catalogue or Trainer Dashboard. Fill in the course title, subject category (Programming, AI/ML, Web Dev, etc.), difficulty level, duration, curriculum overview, syllabus topics, and prerequisites, then set the publishing status to "Published".',
    tags: ['create course', 'publish', 'syllabus', 'curriculum'],
  },
  {
    id: 'trc-3',
    categoryId: 'trainer-course',
    question: 'Can trainers edit courses or delete them?',
    answer:
      'Yes. Instructors can update course descriptions, adjust syllabus modules, or archive courses that are no longer active through their Trainer Dashboard. Security rules guarantee that instructors can only modify courses they created.',
    tags: ['edit course', 'archive', 'delete', 'manage'],
  },

  // 5. Learning Resources
  {
    id: 'res-1',
    categoryId: 'learning-resources',
    question: 'How do I access learning resources and course materials?',
    answer:
      'Click "Access Learning Materials" on any enrolled course in your Trainee Dashboard, or click "Go to Classroom & Materials" in the course details modal. This opens the dedicated Course Classroom where you can watch video lectures, download PDF slide decks, review reference documents, and access web links.',
    tags: ['materials', 'classroom', 'pdf', 'videos', 'resources'],
  },
  {
    id: 'res-2',
    categoryId: 'learning-resources',
    question: 'How can I track my learning progress?',
    answer:
      'Inside the Course Classroom, each resource includes a "Mark as Complete" action. When you finish a resource, click the checkbox to mark it done. Your progress percentage updates in real time, automatically persisting to Cloud Firestore and reflecting across your dashboard.',
    tags: ['progress', 'completion', 'tracking', 'percentage'],
  },
  {
    id: 'res-3',
    categoryId: 'learning-resources',
    question: 'What file formats are supported for trainer resource uploads?',
    answer:
      'Trainers can attach resources as verified HTTPS external links (YouTube, slide decks, documentation) or directly upload files in PDF, PPTX, or DOCX formats up to a strict 10MB file size limit per resource.',
    tags: ['file formats', 'upload', 'pdf', 'size limit'],
  },

  // 6. Quizzes & Results
  {
    id: 'qiz-1',
    categoryId: 'quizzes-results',
    question: 'How do I take a course quiz or assessment?',
    answer:
      'Go to your Trainee Dashboard and look under "Quizzes & Checkpoints", or open the quiz section inside the Course Classroom. Click "Start Assessment Attempt". Read each question carefully, select your answers, and click "Submit Quiz" before time expires.',
    tags: ['quiz', 'assessment', 'start quiz', 'take test'],
  },
  {
    id: 'qiz-2',
    categoryId: 'quizzes-results',
    question: 'Where can I view my quiz results and transcripts?',
    answer:
      'Completed quiz submissions are authoritatively graded by the backend. You can view your comprehensive results under "Assessment Results & Transcripts" on your Trainee Dashboard, detailing your percentage, marks obtained, passing threshold, pass/fail badge, and submission timestamp.',
    tags: ['quiz results', 'score', 'grades', 'transcript'],
  },
  {
    id: 'qiz-3',
    categoryId: 'quizzes-results',
    question: 'Can I retake a quiz if I fail to pass?',
    answer:
      'Each assessment specifies an allowed attempt limit set by the faculty instructor (typically 2 to 3 attempts). If you fail to meet the passing threshold (typically 70%), you can review course materials and launch another attempt if remaining attempts exist.',
    tags: ['retake', 'attempts', 'passing score'],
  },

  // 7. Notifications
  {
    id: 'not-1',
    categoryId: 'notifications',
    question: 'How do I view in-app alerts and notifications?',
    answer:
      'Click the Bell icon in the top navigation bar. An unread badge counter shows pending alerts. The notification panel displays real-time updates for successful enrollments, quiz results, trainer approvals, and newly published learning materials.',
    tags: ['notifications', 'alerts', 'bell', 'messages'],
  },
  {
    id: 'not-2',
    categoryId: 'notifications',
    question: 'Does CAPACITY CONNECT send email notifications?',
    answer:
      'Yes. When configured by platform administrators via the Resend API or SendGrid, the portal automatically dispatches branded transactional emails for course enrollments, trainer approvals, new learning resources, and assessment scorecards.',
    tags: ['email', 'resend', 'transactional', 'updates'],
  },
  {
    id: 'not-3',
    categoryId: 'notifications',
    question: 'How do I mark notifications as read or clear them?',
    answer:
      'Inside the Notification Dropdown, click "Mark all as read" to clear unread badges, or click the checkmark on individual notifications. You can also delete notifications once reviewed.',
    tags: ['mark as read', 'clear alerts'],
  },

  // 8. Troubleshooting
  {
    id: 'trb-1',
    categoryId: 'troubleshooting',
    question: 'What should I do if Google Sign-In popup does not open or errors?',
    answer:
      'Ensure your browser allows popup windows for this site. Check that third-party cookies are not blocked, or try disabling ad-blocker extensions that may intercept authentication redirect frames. If the issue persists, refresh the page and try again.',
    tags: ['login error', 'popup blocked', 'cookies', 'sign-in failure'],
  },
  {
    id: 'trb-2',
    categoryId: 'troubleshooting',
    question: 'What should I do if course catalogue says "Could not reach Cloud Firestore"?',
    answer:
      'This occurs if client network connectivity is momentarily interrupted or if the Firebase offline cache is re-synchronizing. Click the "Retry" button on the catalogue screen to reload the published modules from the server.',
    tags: ['offline', 'firestore', 'retry', 'network error'],
  },
  {
    id: 'trb-3',
    categoryId: 'troubleshooting',
    question: 'Who should I contact if I discover a bug or have questions about the curriculum?',
    answer:
      'You can reach the portal engineering and support team using the Contact Form located at the bottom of the portal. Fill in your name, email, subject, and message, and our student development team will respond promptly.',
    tags: ['contact support', 'bug report', 'help', 'feedback'],
    helpfulAction: {
      label: 'Open Contact Form',
      actionType: 'navigate_contact',
    },
  },
];
