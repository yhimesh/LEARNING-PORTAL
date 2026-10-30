import { useState, useMemo, useEffect } from 'react';
import { Course, CourseCategory } from '../types';
import {
  filterAndSortCourses,
  extractCourseFilterOptions,
  CourseSortOption,
  CourseDurationCategory,
} from '../utils/courseFilter';
import { CourseCard } from './CourseCard';
import { RecommendedCoursesSection } from './RecommendedCoursesSection';
import { useAuth } from '../context/AuthContext';
import { getTraineeEnrollments } from '../services/enrollmentService';
import {
  Search,
  X,
  RotateCcw,
  Sparkles,
  AlertCircle,
  Plus,
  Loader2,
  Database,
  Layers,
  SlidersHorizontal,
  ArrowUpDown,
  User,
  Clock,
  GraduationCap,
  ChevronDown,
  Filter,
} from 'lucide-react';

interface CourseCatalogProps {
  courses: Course[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onViewDetails: (course: Course) => void;
  onOpenCreateModal?: () => void;
  onSeedCourses?: () => Promise<void>;
  isApprovedTrainerOrAdmin?: boolean;
}

export function CourseCatalog({
  courses,
  loading,
  error,
  onRetry,
  onViewDetails,
  onOpenCreateModal,
  onSeedCourses,
  isApprovedTrainerOrAdmin,
}: CourseCatalogProps) {
  const { currentUser, userProfile } = useAuth();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedLevel, setSelectedLevel] = useState<string>('All');
  const [selectedTrainer, setSelectedTrainer] = useState<string>('All');
  const [selectedDuration, setSelectedDuration] = useState<CourseDurationCategory>('all');
  const [selectedSortBy, setSelectedSortBy] = useState<CourseSortOption>('newest');

  // Filter tray toggle for compact screens
  const [isFilterTrayOpen, setIsFilterTrayOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // Track trainee's enrolled courses to show "Enrolled" badge on cards
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!currentUser || userProfile?.requestedRole !== 'Trainee') {
      setEnrolledCourseIds(new Set());
      return;
    }

    let isMounted = true;
    getTraineeEnrollments(currentUser.uid)
      .then((enrollments) => {
        if (isMounted) {
          const ids = new Set(enrollments.map((e) => e.courseId));
          setEnrolledCourseIds(ids);
        }
      })
      .catch((err) => {
        console.warn('Notice: Non-critical enrollment status fetch notice:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [currentUser, userProfile]);

  // Extract unique filter options dynamically from current loaded courses
  const filterOptions = useMemo(() => {
    const extracted = extractCourseFilterOptions(courses);
    const defaultCategories = [
      'Programming',
      'AI and ML',
      'Web Development',
      'Database',
      'Computer Science',
    ];

    const allCategories = Array.from(
      new Set([...defaultCategories, ...extracted.categories])
    ).sort();

    return {
      categories: ['All', ...allCategories],
      levels: ['All', 'Beginner', 'Intermediate', 'Advanced'],
      trainers: ['All', ...extracted.trainers],
    };
  }, [courses]);

  // Filter and sort courses using pure deterministic utility
  const filteredCourses = useMemo(() => {
    const rawFiltered = filterAndSortCourses(courses, {
      searchQuery,
      category: selectedCategory,
      level: selectedLevel,
      trainerName: selectedTrainer,
      duration: selectedDuration,
      sortBy: selectedSortBy,
    });

    // Deduplicate by course ID
    const seen = new Set<string>();
    return rawFiltered.filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
  }, [
    courses,
    searchQuery,
    selectedCategory,
    selectedLevel,
    selectedTrainer,
    selectedDuration,
    selectedSortBy,
  ]);

  // Count active filters (excluding default values)
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedCategory !== 'All') count++;
    if (selectedLevel !== 'All') count++;
    if (selectedTrainer !== 'All') count++;
    if (selectedDuration !== 'all') count++;
    if (searchQuery.trim().length > 0) count++;
    return count;
  }, [
    selectedCategory,
    selectedLevel,
    selectedTrainer,
    selectedDuration,
    searchQuery,
  ]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSelectedLevel('All');
    setSelectedTrainer('All');
    setSelectedDuration('all');
    setSelectedSortBy('newest');
  };

  const handleSeed = async () => {
    if (!onSeedCourses) return;
    setSeeding(true);
    try {
      await onSeedCourses();
    } finally {
      setSeeding(false);
    }
  };

  const durationLabels: Record<CourseDurationCategory, string> = {
    all: 'All Durations',
    short: 'Short (≤ 15 hrs)',
    medium: 'Medium (16–25 hrs)',
    long: 'Comprehensive (> 25 hrs)',
  };

  const sortLabels: Record<CourseSortOption, string> = {
    newest: 'Newest First',
    oldest: 'Oldest First',
    title_asc: 'Title: A to Z',
    title_desc: 'Title: Z to A',
    duration_asc: 'Duration: Shortest First',
    duration_desc: 'Duration: Longest First',
  };

  return (
    <section id="courses" className="bg-slate-950 text-slate-100 py-16 sm:py-20 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-cyan-950/60 border border-cyan-800/60 text-xs font-semibold text-cyan-400 mb-3 font-mono">
              <Database className="w-3.5 h-3.5" />
              <span>ADVANCED SEARCH & DISCOVERY</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Explore Learning Opportunities
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed">
              Find the right course with multi-field search across titles, descriptions, curriculum topics, and faculty instructors. Combine level, duration, and subject filters with custom sorting.
            </p>
          </div>

          {/* Trainer Action: Create Course button */}
          {isApprovedTrainerOrAdmin && onOpenCreateModal && (
            <div className="shrink-0 flex items-center gap-3">
              <button
                type="button"
                onClick={onOpenCreateModal}
                className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-xl transition-all shadow-md shadow-cyan-400/20 flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              >
                <Plus className="w-4 h-4" />
                <span>Create Course</span>
              </button>
            </div>
          )}
        </div>

        {/* Loading State Skeleton */}
        {loading && (
          <div className="mt-12 space-y-8">
            <div className="flex items-center justify-center gap-3 py-12 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
              <span className="text-sm font-medium">Fetching courses from Cloud Firestore...</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="h-64 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse p-6 space-y-4"
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-800" />
                  <div className="w-3/4 h-5 rounded bg-slate-800" />
                  <div className="w-full h-12 rounded bg-slate-800/60" />
                  <div className="w-1/2 h-4 rounded bg-slate-800/80" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="mt-10 p-6 rounded-2xl bg-rose-950/40 border border-rose-800/60 text-slate-200 max-w-xl mx-auto text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-rose-900/40 flex items-center justify-center text-rose-400 mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Database Retrieval Error</h3>
              <p className="mt-1.5 text-xs text-rose-300 leading-relaxed">{error}</p>
            </div>
            <button
              type="button"
              onClick={onRetry}
              className="px-4 py-2 text-xs font-semibold text-white bg-rose-700 hover:bg-rose-600 rounded-xl transition-colors"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* Loaded Content: Search, Multi-Filter Toolbar, and Course Cards */}
        {!loading && !error && (
          <div className="mt-8 space-y-6">
            {/* Primary Search & Quick Toolbar */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
              <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
                {/* Search Input Bar */}
                <div className="relative flex-1">
                  <label htmlFor="course-search-input" className="sr-only">
                    Search courses by title, instructor, or topic
                  </label>
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Search className="w-4 h-4 text-cyan-400" />
                  </div>
                  <input
                    id="course-search-input"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search courses by title, instructor, topic, or keyword..."
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-colors"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      aria-label="Clear search input"
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Sort Option Dropdown */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="relative min-w-[190px] w-full sm:w-auto">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400" />
                    </div>
                    <select
                      value={selectedSortBy}
                      onChange={(e) => setSelectedSortBy(e.target.value as CourseSortOption)}
                      aria-label="Sort courses by"
                      className="w-full pl-9 pr-8 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 appearance-none cursor-pointer"
                    >
                      {Object.entries(sortLabels).map(([key, label]) => (
                        <option key={key} value={key} className="bg-slate-900 text-white">
                          {label}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                      <ChevronDown className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  {/* Toggle Advanced Filters Button */}
                  <button
                    type="button"
                    onClick={() => setIsFilterTrayOpen((prev) => !prev)}
                    aria-expanded={isFilterTrayOpen}
                    aria-controls="course-filter-tray"
                    className={`px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border transition-all flex items-center gap-1.5 whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                      isFilterTrayOpen || activeFilterCount > 0
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/60 shadow-sm'
                        : 'bg-slate-950 text-slate-300 hover:text-white border-slate-700/80 hover:bg-slate-800'
                    }`}
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    <span>Filters</span>
                    {activeFilterCount > 0 && (
                      <span className="w-5 h-5 rounded-full bg-cyan-400 text-slate-950 font-bold text-[10px] flex items-center justify-center">
                        {activeFilterCount}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Category Pills (Always accessible horizontal scroller) */}
              <div className="pt-2 border-t border-slate-800/80">
                <div
                  role="toolbar"
                  aria-label="Filter courses by category"
                  className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin"
                >
                  {filterOptions.categories.map((cat) => {
                    const isSelected = selectedCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        aria-pressed={isSelected}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                          isSelected
                            ? 'bg-cyan-400 text-slate-950 shadow-md shadow-cyan-400/20'
                            : 'bg-slate-950 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
                        }`}
                      >
                        {cat === 'All' ? 'All Categories' : cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Advanced Multi-Criteria Filter Tray */}
              {isFilterTrayOpen && (
                <div id="course-filter-tray" className="pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in duration-150">
                  {/* Difficulty Level Filter */}
                  <div>
                    <label htmlFor="filter-level-select" className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Difficulty Level</span>
                    </label>
                    <div className="relative">
                      <select
                        id="filter-level-select"
                        value={selectedLevel}
                        onChange={(e) => setSelectedLevel(e.target.value)}
                        aria-label="Filter by difficulty level"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 appearance-none cursor-pointer"
                      >
                        {filterOptions.levels.map((lvl) => (
                          <option key={lvl} value={lvl} className="bg-slate-900 text-white">
                            {lvl === 'All' ? 'All Levels' : lvl}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* Trainer / Faculty Filter */}
                  <div>
                    <label htmlFor="filter-trainer-select" className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Faculty Instructor</span>
                    </label>
                    <div className="relative">
                      <select
                        id="filter-trainer-select"
                        value={selectedTrainer}
                        onChange={(e) => setSelectedTrainer(e.target.value)}
                        aria-label="Filter by trainer"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 appearance-none cursor-pointer truncate"
                      >
                        {filterOptions.trainers.map((tr) => (
                          <option key={tr} value={tr} className="bg-slate-900 text-white">
                            {tr === 'All' ? 'All Faculty Instructors' : tr}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* Duration Category Filter */}
                  <div>
                    <label htmlFor="filter-duration-select" className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Course Duration</span>
                    </label>
                    <div className="relative">
                      <select
                        id="filter-duration-select"
                        value={selectedDuration}
                        onChange={(e) => setSelectedDuration(e.target.value as CourseDurationCategory)}
                        aria-label="Filter by duration"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 appearance-none cursor-pointer"
                      >
                        {Object.entries(durationLabels).map(([key, label]) => (
                          <option key={key} value={key} className="bg-slate-900 text-white">
                            {label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>
              )}

              {/* Active Filter Tags & Results Counter Bar */}
              <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                {/* Result count */}
                <div className="text-slate-400 flex items-center gap-2">
                  <span>
                    Showing <strong className="text-white font-semibold">{filteredCourses.length}</strong> of{' '}
                    <span className="text-slate-300 font-medium">{courses.length}</span> published courses
                  </span>
                </div>

                {/* Active Filter Badges */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {selectedCategory !== 'All' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
                      <span>Category: {selectedCategory}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedCategory('All')}
                        className="hover:text-white"
                        title="Remove Category filter"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}

                  {selectedLevel !== 'All' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-indigo-950/80 text-indigo-300 border border-indigo-800/60">
                      <span>Level: {selectedLevel}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedLevel('All')}
                        className="hover:text-white"
                        title="Remove Level filter"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}

                  {selectedTrainer !== 'All' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-purple-950/80 text-purple-300 border border-purple-800/60 max-w-[200px] truncate">
                      <span className="truncate">Trainer: {selectedTrainer.split('(')[0]}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedTrainer('All')}
                        className="hover:text-white shrink-0"
                        title="Remove Trainer filter"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}

                  {selectedDuration !== 'all' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
                      <span>{durationLabels[selectedDuration]}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedDuration('all')}
                        className="hover:text-white"
                        title="Remove Duration filter"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}

                  {searchQuery && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                      <span>Query: &quot;{searchQuery}&quot;</span>
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="hover:text-white"
                        title="Clear search query"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}

                  {activeFilterCount > 0 && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-cyan-400 hover:text-cyan-300 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-lg transition-colors ml-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Clear All Filters</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Empty State: No Courses exist in database at all */}
            {courses.length === 0 ? (
              <div className="text-center py-16 px-4 bg-slate-900/60 rounded-2xl border border-slate-800/80 max-w-xl mx-auto space-y-4">
                <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-cyan-400 mx-auto">
                  <Layers className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">No Published Courses in Database</h3>
                  <p className="mt-2 text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                    The Cloud Firestore <code className="text-cyan-300 font-mono text-xs">courses</code> collection currently has 0 published modules.
                  </p>
                </div>

                {isApprovedTrainerOrAdmin ? (
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                    {onSeedCourses && (
                      <button
                        type="button"
                        onClick={handleSeed}
                        disabled={seeding}
                        className="px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 disabled:opacity-50 rounded-xl transition-colors shadow-md shadow-cyan-400/20 inline-flex items-center gap-1.5"
                      >
                        {seeding ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Populating Firestore...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Seed 6 Foundation Courses</span>
                          </>
                        )}
                      </button>
                    )}
                    {onOpenCreateModal && (
                      <button
                        type="button"
                        onClick={onOpenCreateModal}
                        className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors inline-flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Create Custom Course</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">
                    Sign in with an approved Trainer account to author and publish courses.
                  </p>
                )}
              </div>
            ) : filteredCourses.length === 0 ? (
              /* Filter / Search yielded no matches */
              <div className="text-center py-16 px-4 bg-slate-900/60 rounded-2xl border border-slate-800/80 max-w-xl mx-auto space-y-4">
                <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 mx-auto">
                  <Search className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white">No matching courses found</h3>
                <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
                  No published courses match your current search criteria. Try modifying your keywords, adjusting the level or duration, or clearing active filters.
                </p>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors inline-flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset All Filters ({activeFilterCount})</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Course Cards Grid & Recommendations */
              <div className="space-y-8">
                {/* Stage 8.2: Personalized Recommendations in Course Catalogue */}
                {activeFilterCount === 0 && (
                  <RecommendedCoursesSection
                    allCourses={courses}
                    enrolledCoursesOrIds={Array.from(enrolledCourseIds)}
                    onViewCourse={onViewDetails}
                    title="Recommended for You"
                    subtitle="Explore courses suggested based on your enrolled subjects, learning progression, or featured foundational courses."
                    limit={3}
                  />
                )}

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm sm:text-base font-semibold text-white flex items-center gap-2">
                      <Layers className="w-4 h-4 text-cyan-400" />
                      <span>{activeFilterCount > 0 ? 'Filtered Results' : 'All Published Courses'}</span>
                    </h3>
                    <span className="text-xs text-slate-400 font-medium">
                      {filteredCourses.length} {filteredCourses.length === 1 ? 'course' : 'courses'} available
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCourses.map((course) => (
                      <CourseCard
                        key={course.id}
                        course={course}
                        onViewDetails={onViewDetails}
                        isEnrolled={enrolledCourseIds.has(course.id)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
