import { Course, Enrollment } from '../types';
import { getCourseCreatedMillis } from './courseFilter';

export type RecommendationReasonType =
  | 'category_affinity'
  | 'level_progression'
  | 'recent_addition'
  | 'popular';

export interface CourseRecommendation {
  course: Course;
  score: number;
  reason: string;
  reasonType: RecommendationReasonType;
  matchingCategory?: string;
  suggestedLevel?: string;
}

export interface RecommendationOptions {
  limit?: number;
  includeFallback?: boolean;
}

/**
 * Derives personalized course recommendations for a learner based on their
 * enrollment history, category affinity, level progression, and recency.
 * Pure, deterministic, explainable, and zero third-party AI dependency.
 */
export function generateCourseRecommendations(
  allCourses: Course[],
  enrolledCoursesOrIds: (Enrollment | Course | string)[],
  options: RecommendationOptions = {}
): CourseRecommendation[] {
  if (!allCourses || !Array.isArray(allCourses) || allCourses.length === 0) {
    return [];
  }

  const limit = options.limit ?? 4;
  const includeFallback = options.includeFallback ?? true;

  // 1. Identify enrolled course IDs and gather enrolled course metadata
  const enrolledIds = new Set<string>();
  const enrolledCategoriesCount = new Map<string, number>();
  const enrolledLevelsByCategory = new Map<string, Set<string>>();

  // Extract enrolled IDs and resolve corresponding Course objects
  const courseMap = new Map<string, Course>();
  allCourses.forEach((c) => {
    if (c.id) courseMap.set(c.id, c);
  });

  enrolledCoursesOrIds.forEach((item) => {
    if (!item) return;

    if (typeof item === 'string') {
      enrolledIds.add(item);
      const matched = courseMap.get(item);
      if (matched) {
        recordEnrolledMetadata(matched);
      }
    } else if ('courseId' in item && typeof item.courseId === 'string') {
      // It's an Enrollment object
      enrolledIds.add(item.courseId);
      const matched = courseMap.get(item.courseId);
      if (matched) {
        recordEnrolledMetadata(matched);
      }
    } else if ('id' in item && typeof item.id === 'string') {
      // It's a Course object
      enrolledIds.add(item.id);
      recordEnrolledMetadata(item as Course);
    }
  });

  function recordEnrolledMetadata(c: Course) {
    if (c.category) {
      const current = enrolledCategoriesCount.get(c.category) || 0;
      enrolledCategoriesCount.set(c.category, current + 1);

      if (c.level) {
        const lvlSet = enrolledLevelsByCategory.get(c.category) || new Set<string>();
        lvlSet.add(c.level);
        enrolledLevelsByCategory.set(c.category, lvlSet);
      }
    }
  }

  // 2. Filter eligible courses: MUST be published and NOT already enrolled
  const eligibleCourses = allCourses.filter((c) => {
    if (!c || !c.id) return false;
    // Exclude if already enrolled
    if (enrolledIds.has(c.id)) return false;
    // Exclude drafts and archives - only published courses
    if (c.status !== 'published') return false;
    return true;
  });

  if (eligibleCourses.length === 0) {
    return [];
  }

  const hasLearningHistory = enrolledCategoriesCount.size > 0;

  // 3. Score and explain each eligible course
  const scoredRecommendations: CourseRecommendation[] = [];
  const seenIds = new Set<string>();

  for (const course of eligibleCourses) {
    if (seenIds.has(course.id)) continue;
    seenIds.add(course.id);

    let score = 0;
    let reason = '';
    let reasonType: RecommendationReasonType = 'popular';
    let matchingCategory: string | undefined;
    let suggestedLevel: string | undefined;

    const categoryFrequency = enrolledCategoriesCount.get(course.category) || 0;
    const categoryLevels = enrolledLevelsByCategory.get(course.category);

    if (hasLearningHistory && categoryFrequency > 0) {
      matchingCategory = course.category;
      // Category affinity boost: 50 points per enrolled course in same category
      score += 50 * categoryFrequency;

      // Difficulty level progression check
      if (categoryLevels) {
        if (categoryLevels.has('Beginner') && course.level === 'Intermediate') {
          score += 30; // Level step-up from Beginner
          suggestedLevel = 'Intermediate';
          reason = `Next step in your ${course.category} learning path (${course.level})`;
          reasonType = 'level_progression';
        } else if (categoryLevels.has('Intermediate') && course.level === 'Advanced') {
          score += 35; // Advanced level progression
          suggestedLevel = 'Advanced';
          reason = `Advanced progression in ${course.category} (${course.level})`;
          reasonType = 'level_progression';
        } else if (categoryLevels.has(course.level)) {
          score += 15; // Reinforce same level in same topic
          reason = `Similar to your ${course.category} coursework`;
          reasonType = 'category_affinity';
        } else {
          reason = `Recommended based on your interest in ${course.category}`;
          reasonType = 'category_affinity';
        }
      } else {
        reason = `Matches your learning history in ${course.category}`;
        reasonType = 'category_affinity';
      }
    }

    // Optional rating factor: award up to 10 points based on real reviews
    if (
      typeof course.averageRating === 'number' &&
      course.averageRating > 0 &&
      typeof course.reviewCount === 'number' &&
      course.reviewCount > 0
    ) {
      const confidence = Math.min(course.reviewCount, 5) / 5;
      score += (course.averageRating * 2) * confidence;
    }

    // Tie-breaker: recency of creation
    const createdMillis = getCourseCreatedMillis(course);
    if (createdMillis > 0) {
      score += (createdMillis / 1_000_000_000_000); // Small positive fractional weight
    }

    // Fallback explanations if no category affinity was found
    if (!reason) {
      if (
        typeof course.averageRating === 'number' &&
        course.averageRating >= 4.5 &&
        typeof course.reviewCount === 'number' &&
        course.reviewCount >= 2
      ) {
        reason = `Top rated by learners (${course.averageRating.toFixed(1)}★ · ${course.reviewCount} reviews)`;
        reasonType = 'popular';
      } else if (!hasLearningHistory) {
        // If course is recent (or highest createdMillis)
        reason = 'Featured foundational course for new learners';
        reasonType = 'popular';
      } else {
        reason = 'Explore new subject areas across CAPACITY CONNECT';
        reasonType = 'recent_addition';
      }
    }

    scoredRecommendations.push({
      course,
      score,
      reason,
      reasonType,
      matchingCategory,
      suggestedLevel,
    });
  }

  // 4. Sort recommendations by score descending, then title ascending
  scoredRecommendations.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return (a.course.title || '').localeCompare(b.course.title || '');
  });

  // If learner has learning history, but includeFallback is false, only return affinity matches
  if (hasLearningHistory && !includeFallback) {
    return scoredRecommendations
      .filter((r) => r.reasonType === 'category_affinity' || r.reasonType === 'level_progression')
      .slice(0, limit);
  }

  return scoredRecommendations.slice(0, limit);
}
