import { Course, CourseCategory, ContactFormData, ContactFormErrors } from '../types';

export type CourseSortOption =
  | 'newest'
  | 'oldest'
  | 'title_asc'
  | 'title_desc'
  | 'duration_asc'
  | 'duration_desc';

export type CourseDurationCategory = 'all' | 'short' | 'medium' | 'long';

export interface CourseFilterCriteria {
  searchQuery?: string;
  category?: string;
  level?: string; // 'All' | 'Beginner' | 'Intermediate' | 'Advanced'
  trainerName?: string;
  duration?: CourseDurationCategory;
  sortBy?: CourseSortOption;
}

/**
 * Parses any course duration string (e.g. "20 hours", "15 hrs", "4 weeks", "6 months")
 * into normalized hours for reliable sorting and categorizing.
 */
export function parseDurationValue(duration?: string): number {
  if (!duration || typeof duration !== 'string') return 0;
  const clean = duration.trim().toLowerCase();

  // Hours: "20 hours", "15 hrs", "20h"
  const hourMatch = clean.match(/(\d+(?:\.\d+)?)\s*(?:hour|hr|h\b)/);
  if (hourMatch) {
    return parseFloat(hourMatch[1]);
  }

  // Weeks: "4 weeks", "8 wks" (~10 learning hours per week)
  const weekMatch = clean.match(/(\d+(?:\.\d+)?)\s*(?:week|wk|w\b)/);
  if (weekMatch) {
    return parseFloat(weekMatch[1]) * 10;
  }

  // Months: "2 months", "1 mo" (~40 learning hours per month)
  const monthMatch = clean.match(/(\d+(?:\.\d+)?)\s*(?:month|mo|m\b)/);
  if (monthMatch) {
    return parseFloat(monthMatch[1]) * 40;
  }

  // Days: "5 days" (~4 hours per day)
  const dayMatch = clean.match(/(\d+(?:\.\d+)?)\s*(?:day|d\b)/);
  if (dayMatch) {
    return parseFloat(dayMatch[1]) * 4;
  }

  // Standalone digits fallback
  const numMatch = clean.match(/(\d+(?:\.\d+)?)/);
  if (numMatch) {
    return parseFloat(numMatch[1]);
  }

  return 0;
}

/**
 * Categorizes a course duration into standardized buckets:
 * - 'short': <= 15 hours (or <= 2-3 weeks)
 * - 'medium': 16 to 25 hours (or 4-6 weeks)
 * - 'long': > 25 hours (or 8+ weeks)
 */
export function getDurationCategory(duration?: string): 'short' | 'medium' | 'long' {
  const hours = parseDurationValue(duration);
  if (hours <= 15) {
    return 'short';
  } else if (hours <= 25) {
    return 'medium';
  } else {
    return 'long';
  }
}

/**
 * Extracts milliseconds timestamp safely from various timestamp shapes
 * (Firestore Timestamp, Date object, string, or number).
 */
export function getCourseCreatedMillis(course: Course): number {
  if (!course.createdAt) return 0;

  if (typeof course.createdAt.toMillis === 'function') {
    return course.createdAt.toMillis();
  }
  if (typeof course.createdAt.toDate === 'function') {
    return course.createdAt.toDate().getTime();
  }
  if (course.createdAt instanceof Date) {
    return course.createdAt.getTime();
  }
  if (typeof course.createdAt.seconds === 'number') {
    return course.createdAt.seconds * 1000;
  }
  if (typeof course.createdAt === 'number') {
    return course.createdAt;
  }
  if (typeof course.createdAt === 'string') {
    const parsed = Date.parse(course.createdAt);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

/**
 * Advanced multi-criteria search, filtering, and sorting for courses.
 * Guaranteed to be pure, immutable, and safe against missing fields.
 */
export function filterAndSortCourses(
  courses: Course[],
  criteria: CourseFilterCriteria
): Course[] {
  if (!courses || !Array.isArray(courses)) return [];

  const trimmedQuery = (criteria.searchQuery || '').trim().toLowerCase();
  const selectedCategory = criteria.category || 'All';
  const selectedLevel = criteria.level || 'All';
  const selectedTrainer = criteria.trainerName || 'All';
  const selectedDuration = criteria.duration || 'all';
  const sortBy = criteria.sortBy || 'newest';

  // 1. Multi-field filtering
  const filtered = courses.filter((course) => {
    // Category match
    if (selectedCategory !== 'All' && course.category !== selectedCategory) {
      return false;
    }

    // Difficulty Level match
    if (selectedLevel !== 'All' && course.level !== selectedLevel) {
      return false;
    }

    // Trainer / Instructor match
    if (selectedTrainer !== 'All') {
      const trainerMatches =
        course.trainerName === selectedTrainer || course.trainerId === selectedTrainer;
      if (!trainerMatches) return false;
    }

    // Duration Category match
    if (selectedDuration !== 'all') {
      const courseCategory = getDurationCategory(course.duration);
      if (courseCategory !== selectedDuration) {
        return false;
      }
    }

    // Search query match (comprehensive full-text check across all relevant metadata)
    if (trimmedQuery) {
      const titleMatch = (course.title || '').toLowerCase().includes(trimmedQuery);
      const descMatch = (course.description || '').toLowerCase().includes(trimmedQuery);
      const shortDescMatch = (course.shortDescription || '').toLowerCase().includes(trimmedQuery);
      const fullDescMatch = (course.fullDescription || '').toLowerCase().includes(trimmedQuery);
      const categoryMatch = (course.category || '').toLowerCase().includes(trimmedQuery);
      const trainerMatch = (course.trainerName || '').toLowerCase().includes(trimmedQuery);

      const syllabusMatch = Array.isArray(course.syllabus)
        ? course.syllabus.some((s) => s.toLowerCase().includes(trimmedQuery))
        : false;

      const anyMatch =
        titleMatch ||
        descMatch ||
        shortDescMatch ||
        fullDescMatch ||
        categoryMatch ||
        trainerMatch ||
        syllabusMatch;

      if (!anyMatch) {
        return false;
      }
    }

    return true;
  });

  // 2. Stable sorting
  return filtered.sort((a, b) => {
    switch (sortBy) {
      case 'newest': {
        const timeA = getCourseCreatedMillis(a);
        const timeB = getCourseCreatedMillis(b);
        if (timeA !== timeB) return timeB - timeA;
        return (a.title || '').localeCompare(b.title || '');
      }
      case 'oldest': {
        const timeA = getCourseCreatedMillis(a);
        const timeB = getCourseCreatedMillis(b);
        if (timeA !== timeB) return timeA - timeB;
        return (a.title || '').localeCompare(b.title || '');
      }
      case 'title_asc': {
        return (a.title || '').localeCompare(b.title || '');
      }
      case 'title_desc': {
        return (b.title || '').localeCompare(a.title || '');
      }
      case 'duration_asc': {
        const durA = parseDurationValue(a.duration);
        const durB = parseDurationValue(b.duration);
        if (durA !== durB) return durA - durB;
        return (a.title || '').localeCompare(b.title || '');
      }
      case 'duration_desc': {
        const durA = parseDurationValue(a.duration);
        const durB = parseDurationValue(b.duration);
        if (durA !== durB) return durB - durA;
        return (a.title || '').localeCompare(b.title || '');
      }
      default:
        return 0;
    }
  });
}

/**
 * Filter courses based on search query (case-insensitive, matching title, description, category, or trainer)
 * and category filter. Retained for backwards compatibility.
 */
export function filterCourses(
  courses: Course[],
  searchQuery: string,
  selectedCategory: CourseCategory
): Course[] {
  return filterAndSortCourses(courses, {
    searchQuery,
    category: selectedCategory,
    sortBy: 'title_asc',
  });
}

/**
 * Extracts unique filter option lists from loaded course entities
 */
export function extractCourseFilterOptions(courses: Course[]) {
  const categories = new Set<string>();
  const levels = new Set<string>();
  const trainers = new Set<string>();

  courses.forEach((c) => {
    if (c.category) categories.add(c.category);
    if (c.level) levels.add(c.level);
    if (c.trainerName) trainers.add(c.trainerName);
  });

  return {
    categories: Array.from(categories).sort(),
    levels: ['Beginner', 'Intermediate', 'Advanced'].filter((l) =>
      levels.has(l)
    ),
    trainers: Array.from(trainers).sort(),
  };
}

/**
 * Validates the contact form fields.
 * Returns an errors object with specific messages for invalid fields.
 */
export function validateContactForm(data: ContactFormData): {
  isValid: boolean;
  errors: ContactFormErrors;
} {
  const errors: ContactFormErrors = {};

  // Name validation
  if (!data.name || !data.name.trim()) {
    errors.name = 'Full name is required.';
  } else if (data.name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters.';
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!data.email || !data.email.trim()) {
    errors.email = 'Email address is required.';
  } else if (!emailRegex.test(data.email.trim())) {
    errors.email = 'Please enter a valid email address (e.g. name@domain.com).';
  }

  // Subject validation
  if (!data.subject || !data.subject.trim()) {
    errors.subject = 'Subject is required.';
  } else if (data.subject.trim().length < 3) {
    errors.subject = 'Subject must be at least 3 characters.';
  }

  // Message validation
  if (!data.message || !data.message.trim()) {
    errors.message = 'Message content is required.';
  } else if (data.message.trim().length < 10) {
    errors.message = 'Please provide a message with at least 10 characters.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
