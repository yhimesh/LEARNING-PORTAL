import { useMemo } from 'react';
import { Course, Enrollment } from '../types';
import {
  generateCourseRecommendations,
  CourseRecommendation,
} from '../utils/courseRecommendations';
import {
  Sparkles,
  Compass,
  Clock,
  Flame,
  ArrowRight,
  User,
  CheckCircle2,
  Code2,
  Cpu,
  Globe,
  Database,
  Binary,
  Layers,
} from 'lucide-react';

interface RecommendedCoursesSectionProps {
  allCourses: Course[];
  enrolledCoursesOrIds: (Enrollment | string)[];
  onViewCourse: (course: Course) => void;
  title?: string;
  subtitle?: string;
  limit?: number;
  compact?: boolean;
}

export function RecommendedCoursesSection({
  allCourses,
  enrolledCoursesOrIds,
  onViewCourse,
  title = 'Recommended for You',
  subtitle = 'Personalized learning pathways based on your enrolled subjects and difficulty progression.',
  limit = 4,
  compact = false,
}: RecommendedCoursesSectionProps) {
  const recommendations = useMemo(() => {
    return generateCourseRecommendations(allCourses, enrolledCoursesOrIds, { limit });
  }, [allCourses, enrolledCoursesOrIds, limit]);

  const hasEnrolledAny = enrolledCoursesOrIds.length > 0;

  // Category iconography
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Programming':
        return Code2;
      case 'AI and ML':
        return Cpu;
      case 'Web Development':
        return Globe;
      case 'Database':
        return Database;
      case 'Computer Science':
        return Binary;
      default:
        return Code2;
    }
  };

  // Level badge styling
  const getLevelBadgeStyles = (level: string) => {
    switch (level) {
      case 'Beginner':
        return 'bg-emerald-950/70 text-emerald-400 border-emerald-800/60';
      case 'Intermediate':
        return 'bg-cyan-950/70 text-cyan-300 border-cyan-800/60';
      case 'Advanced':
        return 'bg-purple-950/70 text-purple-300 border-purple-800/60';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  // Explanation reason badge styling & icon
  const renderReasonBadge = (rec: CourseRecommendation) => {
    switch (rec.reasonType) {
      case 'level_progression':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-indigo-950/90 text-indigo-300 border border-indigo-700/60 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="truncate">{rec.reason}</span>
          </span>
        );
      case 'category_affinity':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-cyan-950/90 text-cyan-300 border border-cyan-700/60 shadow-sm">
            <Compass className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="truncate">{rec.reason}</span>
          </span>
        );
      case 'recent_addition':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-purple-950/90 text-purple-300 border border-purple-700/60 shadow-sm">
            <Clock className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span className="truncate">{rec.reason}</span>
          </span>
        );
      case 'popular':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-950/90 text-emerald-300 border border-emerald-700/60 shadow-sm">
            <Flame className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">{rec.reason}</span>
          </span>
        );
    }
  };

  if (allCourses.length === 0) {
    return null;
  }

  return (
    <div className={`mt-10 pt-8 border-t border-slate-800/80 ${compact ? 'mt-6 pt-4' : ''}`}>
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-950/90 text-indigo-300 border border-indigo-700/60 font-mono">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>PERSONALIZED RECOMMENDATIONS</span>
            </span>
            {hasEnrolledAny && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-cyan-950/70 text-cyan-400 border border-cyan-800/50">
                <Compass className="w-3 h-3" />
                <span>Tailored to Your History</span>
              </span>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {title}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Empty State: User has enrolled in all published courses */}
      {recommendations.length === 0 ? (
        <div className="text-center py-10 px-6 bg-slate-900/60 rounded-3xl border border-slate-800/80 max-w-xl mx-auto space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400 mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">All Caught Up!</h3>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            You have enrolled in every available course currently published on CAPACITY CONNECT. Our faculty members frequently author new curriculum modules, so check back soon!
          </p>
        </div>
      ) : (
        /* Recommendation Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {recommendations.map((rec) => {
            const course = rec.course;
            const CategoryIcon = getCategoryIcon(course.category);

            return (
              <div
                key={course.id}
                className="bg-slate-900 border border-slate-800/90 hover:border-indigo-500/50 rounded-2xl p-5 hover:shadow-xl hover:shadow-indigo-950/20 transition-all flex flex-col justify-between group relative overflow-hidden"
              >
                <div>
                  {/* Explanation Tag at top */}
                  <div className="mb-3.5 flex items-center justify-between gap-2">
                    {renderReasonBadge(rec)}
                  </div>

                  {/* Header: Category Icon & Duration */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-cyan-400 group-hover:text-cyan-300 transition-colors">
                        <CategoryIcon className="w-4 h-4" />
                      </div>
                      <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider font-mono">
                        {course.category}
                      </span>
                    </div>

                    {course.level && (
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getLevelBadgeStyles(
                          course.level
                        )}`}
                      >
                        {course.level}
                      </span>
                    )}
                  </div>

                  {/* Course Title */}
                  <h3 className="text-base font-bold text-white tracking-tight group-hover:text-cyan-300 transition-colors line-clamp-2 mb-2">
                    {course.title}
                  </h3>

                  {/* Description preview */}
                  <p className="text-xs text-slate-300 leading-relaxed line-clamp-3 mb-4">
                    {course.description || course.shortDescription}
                  </p>

                  {/* Duration & Instructor */}
                  <div className="pt-3 border-t border-slate-800/80 space-y-1 text-xs text-slate-400">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-slate-400">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>{course.duration}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-300 truncate pt-0.5">
                      <User className="w-3 h-3 text-cyan-400 shrink-0" />
                      <span className="truncate italic text-[11px]">
                        {course.trainerName || 'Faculty Instructor'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* View Details Action Button */}
                <div className="mt-5 pt-1">
                  <button
                    type="button"
                    onClick={() => onViewCourse(course)}
                    aria-label={`View Details for recommended course ${course.title}`}
                    className="w-full py-2 px-3 text-xs font-semibold text-slate-200 hover:text-slate-950 bg-slate-800 hover:bg-cyan-400 active:bg-cyan-500 rounded-xl transition-all flex items-center justify-center gap-1.5 border border-slate-700/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                  >
                    <span>View Course</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
