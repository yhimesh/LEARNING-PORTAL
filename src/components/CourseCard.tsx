import { Course } from '../types';
import {
  Clock,
  User,
  ArrowRight,
  Code2,
  Cpu,
  Globe,
  Database,
  Binary,
  CheckCircle2,
  Sparkles,
  Star,
} from 'lucide-react';

interface CourseCardProps {
  course: Course;
  onViewDetails: (course: Course) => void;
  isEnrolled?: boolean;
}

export function CourseCard({ course, onViewDetails, isEnrolled }: CourseCardProps) {
  // Category-specific iconography
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

  const CategoryIcon = getCategoryIcon(course.category);

  // Difficulty level badge styles
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

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-950/20 transition-all flex flex-col justify-between group relative overflow-hidden">
      <div>
        {/* Card Header: Category Icon, Level & Enrolled Status */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-cyan-400 group-hover:text-cyan-300 transition-colors">
              <CategoryIcon className="w-5 h-5" />
            </div>

            {/* Difficulty Level Tag */}
            {course.level && (
              <span
                className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${getLevelBadgeStyles(
                  course.level
                )}`}
              >
                {course.level}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isEnrolled && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                <CheckCircle2 className="w-3 h-3" />
                <span>Enrolled</span>
              </span>
            )}

            {/* Duration Tag */}
            <span className="flex items-center gap-1 text-xs text-slate-400 font-medium">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>{course.duration}</span>
            </span>
          </div>
        </div>

        {/* Category metadata subtitle */}
        <div className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider mb-1.5 font-mono">
          {course.category}
        </div>

        {/* Course Title */}
        <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight group-hover:text-cyan-300 transition-colors line-clamp-2">
          {course.title}
        </h3>

        {/* Description */}
        <p className="mt-2.5 text-xs sm:text-sm text-slate-300 leading-relaxed line-clamp-3">
          {course.description || course.shortDescription}
        </p>

        {/* Assigned Trainer */}
        <div className="mt-4 pt-3.5 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs text-slate-300">
          <div className="flex items-center gap-2 truncate">
            <User className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="truncate italic font-medium">
              {course.trainerName || 'Faculty Instructor'}
            </span>
          </div>

          {/* Rating indicator if available */}
          {typeof course.averageRating === 'number' && course.averageRating > 0 && (
            <div className="flex items-center gap-1 text-amber-400 shrink-0 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
              <Star className="w-3 h-3 fill-amber-400" />
              <span className="text-[11px] font-bold text-white">{course.averageRating.toFixed(1)}</span>
              {typeof course.reviewCount === 'number' && course.reviewCount > 0 && (
                <span className="text-[10px] text-slate-500 font-normal">({course.reviewCount})</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Card Action */}
      <div className="mt-6 pt-2">
        <button
          type="button"
          onClick={() => onViewDetails(course)}
          aria-label={`View Details for ${course.title}`}
          className="w-full py-2.5 px-4 text-xs sm:text-sm font-semibold text-slate-200 hover:text-slate-950 bg-slate-800 hover:bg-cyan-400 active:bg-cyan-500 rounded-xl transition-all flex items-center justify-center gap-2 group-hover:border-transparent border border-slate-700/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        >
          <span>{isEnrolled ? 'Open Course Details' : 'View Details'}</span>
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </div>
  );
}
