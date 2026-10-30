import { useState, useEffect, useCallback } from 'react';
import { Course, AuthModalState, AuthModalMode, Assessment, AssessmentAttempt } from './types';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { getPublishedCourses, getCourseById, seedInitialCourses } from './services/courseService';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { UserDashboard } from './components/UserDashboard';
import { StatsSection } from './components/StatsSection';
import { BenefitsSection } from './components/BenefitsSection';
import { CourseCatalog } from './components/CourseCatalog';
import { AboutSection } from './components/AboutSection';
import { ContactSection } from './components/ContactSection';
import { Footer } from './components/Footer';
import { CourseModal } from './components/CourseModal';
import { AuthModal } from './components/AuthModal';
import { CreateCourseModal } from './components/CreateCourseModal';
import { CourseLearningPage } from './components/CourseLearningPage';
import { QuizTakingView } from './components/QuizTakingView';
import { HelpCenterPage } from './components/HelpCenterPage';
import { MyTicketsModal } from './components/MyTicketsModal';

function MainApp() {
  const { currentUser, userProfile } = useAuth();

  // Firestore course states
  const [courses, setCourses] = useState<Course[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [coursesError, setCoursesError] = useState<string | null>(null);
  const [enrollmentRefreshKey, setEnrollmentRefreshKey] = useState(0);

  // Modals & UI states
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [classroomCourse, setClassroomCourse] = useState<Course | null>(null);
  const [activeQuizSession, setActiveQuizSession] = useState<{
    assessment: Assessment;
    attempt: AssessmentAttempt;
  } | null>(null);
  const [authModal, setAuthModal] = useState<AuthModalState>({
    isOpen: false,
    mode: 'signin',
  });
  const [createCourseModalOpen, setCreateCourseModalOpen] = useState(false);
  const [activeSection] = useState('home');
  const [isHelpCenterOpen, setIsHelpCenterOpen] = useState(false);
  const [isMyTicketsOpen, setIsMyTicketsOpen] = useState(false);


  // Load published courses from Cloud Firestore
  const loadCourses = useCallback(async () => {
    setCoursesLoading(true);
    setCoursesError(null);
    try {
      const data = await getPublishedCourses();
      setCourses(data);
    } catch (err) {
      console.error('Failed to load courses:', err);
      setCoursesError(
        'Unable to load courses from Cloud Firestore. Please check your internet connection or verify Firestore permissions.'
      );
    } finally {
      setCoursesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const handleOpenAuth = (mode: AuthModalMode, initialRole?: 'Trainee' | 'Trainer') => {
    setAuthModal({ isOpen: true, mode, initialRole });
  };

  const handleCloseAuth = () => {
    setAuthModal((prev) => ({ ...prev, isOpen: false }));
  };

  const handleSelectCourse = (course: Course) => {
    setSelectedCourse(course);
  };

  const handleSelectCourseById = async (courseId: string) => {
    const existing = courses.find((c) => c.id === courseId);
    if (existing) {
      setSelectedCourse(existing);
      return;
    }
    const fetched = await getCourseById(courseId);
    if (fetched) {
      setSelectedCourse(fetched);
    }
  };

  const handleEnrollmentSuccess = () => {
    setEnrollmentRefreshKey((prev) => prev + 1);
  };

  const handleCloseCourseModal = () => {
    setSelectedCourse(null);
  };

  const handleOpenClassroom = async (courseId: string) => {
    const existing = courses.find((c) => c.id === courseId);
    if (existing) {
      setClassroomCourse(existing);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const fetched = await getCourseById(courseId);
    if (fetched) {
      setClassroomCourse(fetched);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Automatically return to dashboard if user logs out
  useEffect(() => {
    if (!currentUser) {
      setClassroomCourse(null);
      setActiveQuizSession(null);
    }
  }, [currentUser]);


  const scrollToSection = (id: string) => {
    if (isHelpCenterOpen) {
      setIsHelpCenterOpen(false);
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 50);
      return;
    }
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Check if current user is an approved trainer or admin
  const isApprovedTrainerOrAdmin =
    (userProfile?.requestedRole === 'Trainer' && userProfile?.accountStatus === 'active') ||
    currentUser?.email === 'yhimeshc@gmail.com' ||
    currentUser?.email === 'admin@capacityconnect.edu';


  const handleSeedCourses = async () => {
    if (!currentUser) return;
    const trainerName = userProfile?.fullName || currentUser.displayName || 'Faculty Instructor';
    await seedInitialCourses(currentUser.uid, trainerName);
    await loadCourses();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-slate-950 overflow-x-hidden">
      {/* Skip to Main Content Link for Keyboard and Screen Reader Accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2.5 focus:bg-cyan-400 focus:text-slate-950 focus:rounded-xl focus:font-bold focus:shadow-2xl focus:outline-none focus:ring-2 focus:ring-white transition-all text-xs"
      >
        Skip to main content
      </a>

      {/* Top Navigation */}
      <Navbar
        onOpenAuth={handleOpenAuth}
        activeSection={activeSection}
        onOpenHelpCenter={() => {
          setIsHelpCenterOpen(true);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        isHelpCenterActive={isHelpCenterOpen}
        onOpenMyTickets={() => setIsMyTicketsOpen(true)}
      />

      {/* Main Content Area */}
      <main id="main-content" tabIndex={-1} role="main" className="flex-1 focus:outline-none">
        {activeQuizSession && currentUser ? (
          <QuizTakingView
            assessment={activeQuizSession.assessment}
            attempt={activeQuizSession.attempt}
            traineeId={currentUser.uid}
            onExit={() => {
              setActiveQuizSession(null);
              setEnrollmentRefreshKey((prev) => prev + 1);
            }}
            onSubmitted={() => {
              setEnrollmentRefreshKey((prev) => prev + 1);
            }}
          />
        ) : classroomCourse ? (
          <CourseLearningPage
            course={classroomCourse}
            onBack={() => setClassroomCourse(null)}
            onExploreCourses={() => {
              setClassroomCourse(null);
              setTimeout(() => scrollToSection('courses'), 100);
            }}
          />
        ) : isHelpCenterOpen ? (
          <HelpCenterPage
            onBack={() => setIsHelpCenterOpen(false)}
            onNavigateToSection={(sectionId) => scrollToSection(sectionId)}
            onOpenAuth={handleOpenAuth}
            onOpenMyTickets={() => setIsMyTicketsOpen(true)}
          />
        ) : (
          <>
            {/* User Dashboard / Welcome view (displayed when user is logged in) */}
            {currentUser && (
              <UserDashboard
                allCourses={courses}
                onExploreCourses={() => scrollToSection('courses')}
                onOpenCreateCourse={() => setCreateCourseModalOpen(true)}
                onSeedCourses={handleSeedCourses}
                onViewCourseDetails={handleSelectCourseById}
                onOpenClassroom={handleOpenClassroom}
                onStartQuiz={(assessment, attempt) => {
                  setActiveQuizSession({ assessment, attempt });
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onOpenMyTickets={() => setIsMyTicketsOpen(true)}
                refreshEnrollmentsTrigger={enrollmentRefreshKey}
              />
            )}

            {/* Hero Section */}
            <Hero
              onExploreCourses={() => scrollToSection('courses')}
              onLearnMore={() => scrollToSection('about')}
            />

            {/* Clearly Labelled Illustrative Statistics */}
            <StatsSection />

            {/* Benefits Section: 4 Pillars */}
            <BenefitsSection />

            {/* Course Catalogue: Retrieved from Cloud Firestore with Search, Filters, Loading, and Error States */}
            <CourseCatalog
              courses={courses}
              loading={coursesLoading}
              error={coursesError}
              onRetry={loadCourses}
              onViewDetails={handleSelectCourse}
              onOpenCreateModal={() => setCreateCourseModalOpen(true)}
              onSeedCourses={handleSeedCourses}
              isApprovedTrainerOrAdmin={isApprovedTrainerOrAdmin}
            />

            {/* About Project & Roadmap */}
            <AboutSection />

            {/* Contact Form with Firestore Support Ticket Integration (Stage 9.2) */}
            <ContactSection
              onOpenMyTickets={() => setIsMyTicketsOpen(true)}
              onOpenAuth={handleOpenAuth}
            />
          </>
        )}
      </main>

      {/* Footer */}
      <Footer
        onOpenHelpCenter={() => {
          setIsHelpCenterOpen(true);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Course Details Modal */}
      <CourseModal
        course={selectedCourse}
        onClose={handleCloseCourseModal}
        onOpenAuth={handleOpenAuth}
        onEnrollmentSuccess={handleEnrollmentSuccess}
        onOpenClassroom={handleOpenClassroom}
      />

      {/* Real Firebase Auth Modal */}
      <AuthModal authModal={authModal} onClose={handleCloseAuth} />

      {/* Create Course Modal for Approved Trainers */}
      <CreateCourseModal
        isOpen={createCourseModalOpen}
        onClose={() => setCreateCourseModalOpen(false)}
        onCourseCreated={() => {
          loadCourses();
          setEnrollmentRefreshKey((prev) => prev + 1);
        }}
      />

      {/* Stage 9.2: User Support Tickets Modal */}
      <MyTicketsModal
        isOpen={isMyTicketsOpen}
        onClose={() => setIsMyTicketsOpen(false)}
        currentUser={currentUser}
        userProfile={userProfile}
      />

    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <MainApp />
      </NotificationProvider>
    </AuthProvider>
  );
}
