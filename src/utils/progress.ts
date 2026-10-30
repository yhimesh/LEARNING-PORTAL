/**
 * Pure helper and calculation utilities for Course Progress Tracking (Stage 6.1)
 */

export interface ProgressCalculationResult {
  completedResourceCount: number;
  totalResourceCount: number;
  progressPercentage: number;
  completedResourceIds: string[];
  status: 'not_started' | 'in_progress' | 'completed';
}

/**
 * Returns deterministic document ID for a course progress record
 */
export function getCourseProgressDocId(traineeId: string, courseId: string): string {
  if (!traineeId || !courseId) {
    throw new Error('Both traineeId and courseId are required to generate progress doc ID');
  }
  return `${traineeId}_${courseId}`;
}

/**
 * Calculates course progress percentage, deduplicating IDs and enforcing valid course resources.
 * Handles division by zero gracefully when total resources is 0.
 */
export function calculateCourseProgress(params: {
  completedResourceIds: string[];
  validResourceIds: string[];
}): ProgressCalculationResult {
  const { completedResourceIds = [], validResourceIds = [] } = params;

  // Set of valid resource IDs belonging strictly to this course
  const validSet = new Set(validResourceIds.filter(Boolean));
  const totalResourceCount = validSet.size;

  // Filter completed IDs to only those that exist in this course, deduplicating
  const completedSet = new Set<string>();
  for (const id of completedResourceIds) {
    if (validSet.has(id)) {
      completedSet.add(id);
    }
  }

  const completedResourceCount = completedSet.size;
  const progressPercentage =
    totalResourceCount > 0
      ? Math.min(100, Math.max(0, Math.round((completedResourceCount / totalResourceCount) * 100)))
      : 0;

  let status: 'not_started' | 'in_progress' | 'completed' = 'not_started';
  if (totalResourceCount > 0) {
    if (progressPercentage === 100) {
      status = 'completed';
    } else if (progressPercentage > 0) {
      status = 'in_progress';
    }
  }

  return {
    completedResourceCount,
    totalResourceCount,
    progressPercentage,
    completedResourceIds: Array.from(completedSet),
    status,
  };
}
