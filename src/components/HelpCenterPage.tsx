import { useState, useMemo } from 'react';
import {
  FAQ_CATEGORIES,
  FAQ_ITEMS,
  FaqCategoryId,
  FaqItem,
} from '../data/faqData';
import { filterFaqs, countFaqsByCategory } from '../utils/faqFilter';
import { AuthModalMode } from '../types';
import {
  Search,
  X,
  ChevronDown,
  ArrowLeft,
  Sparkles,
  KeyRound,
  GraduationCap,
  Briefcase,
  BookOpen,
  Award,
  Bell,
  AlertCircle,
  Layers,
  HelpCircle,
  MessageSquare,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  LifeBuoy,
} from 'lucide-react';

interface HelpCenterPageProps {
  onBack: () => void;
  onNavigateToSection: (sectionId: string) => void;
  onOpenAuth: (mode: AuthModalMode, initialRole?: 'Trainee' | 'Trainer') => void;
  onOpenMyTickets?: () => void;
}

export function HelpCenterPage({
  onBack,
  onNavigateToSection,
  onOpenAuth,
  onOpenMyTickets,
}: HelpCenterPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FaqCategoryId | 'all'>('all');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(['acc-1', 'trn-1', 'qiz-1']));

  // Filtered FAQs
  const filteredFaqs = useMemo(() => {
    return filterFaqs(FAQ_ITEMS, {
      searchQuery,
      selectedCategory,
    });
  }, [searchQuery, selectedCategory]);

  // Category counts
  const categoryCounts = useMemo(() => {
    return countFaqsByCategory(FAQ_ITEMS);
  }, []);

  // Category icon mapping
  const getCategoryIcon = (id: FaqCategoryId | 'all') => {
    switch (id) {
      case 'getting-started':
        return Sparkles;
      case 'account-login':
        return KeyRound;
      case 'trainee-enrollment':
        return GraduationCap;
      case 'trainer-course':
        return Briefcase;
      case 'learning-resources':
        return BookOpen;
      case 'quizzes-results':
        return Award;
      case 'notifications':
        return Bell;
      case 'troubleshooting':
        return AlertCircle;
      default:
        return Layers;
    }
  };

  // Toggle specific accordion item
  const toggleAccordion = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Expand all or collapse all
  const handleToggleAll = () => {
    if (expandedIds.size >= filteredFaqs.length && filteredFaqs.length > 0) {
      setExpandedIds(new Set());
    } else {
      setExpandedIds(new Set(filteredFaqs.map((f) => f.id)));
    }
  };

  // Handle helpful in-app action
  const handleFaqAction = (action: FaqItem['helpfulAction']) => {
    if (!action) return;
    switch (action.actionType) {
      case 'navigate_courses':
        onBack();
        setTimeout(() => onNavigateToSection('courses'), 100);
        break;
      case 'navigate_contact':
        onBack();
        setTimeout(() => onNavigateToSection('contact'), 100);
        break;
      case 'open_auth_signin':
        onOpenAuth('signin', 'Trainee');
        break;
      case 'open_auth_trainer':
        onOpenAuth('register', 'Trainer');
        break;
      default:
        break;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 sm:py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Navigation & Breadcrumbs */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl transition-all shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-cyan-400" />
            <span>Back to Portal</span>
          </button>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-cyan-950/70 border border-cyan-800/60 text-cyan-300">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>SIH26075 Knowledge Base & FAQ Center</span>
          </div>
        </div>

        {/* Hero Section & Search Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight">
            Help Center & Frequently Asked Questions
          </h1>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-2xl mx-auto">
            Find immediate answers on registration, course enrollments, learning resources, automated quiz scoring, trainer publishing, and platform troubleshooting.
          </p>

          {/* Search Input Bar */}
          <div className="pt-4 max-w-2xl mx-auto">
            <div className="relative">
              <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search help topics, enrollment, classroom, quizzes, or errors..."
                aria-label="Search help topics and frequently asked questions"
                className="w-full pl-12 pr-12 py-3.5 bg-slate-900/90 border border-slate-700/80 rounded-2xl text-sm sm:text-base text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all shadow-lg shadow-slate-950/40"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search query"
                  className="p-1.5 text-slate-400 hover:text-white absolute right-3.5 top-1/2 -translate-y-1/2 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Quick Keyword Suggestion Chips */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-3 text-xs text-slate-400">
              <span className="font-semibold text-slate-500">Popular:</span>
              {[
                'Enrolling',
                'Quizzes',
                'Trainer Approval',
                'Learning Progress',
                'Login Error',
              ].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setSearchQuery(chip)}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Category Filters Grid/Pills */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Browse by Category</span>
            </h2>

            {selectedCategory !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-medium"
              >
                Reset to All Categories
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {/* All Categories Pill */}
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between gap-2 cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-cyan-950/80 border-cyan-500/80 text-white shadow-md shadow-cyan-950/30'
                  : 'bg-slate-900/60 border-slate-800/80 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <Layers
                  className={`w-4 h-4 shrink-0 ${
                    selectedCategory === 'all' ? 'text-cyan-400' : 'text-slate-400'
                  }`}
                />
                <span className="text-xs font-semibold truncate">All Categories</span>
              </div>
              <span
                className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${
                  selectedCategory === 'all'
                    ? 'bg-cyan-500/20 text-cyan-300'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {categoryCounts.all || 0}
              </span>
            </button>

            {/* Individual Categories */}
            {FAQ_CATEGORIES.map((cat) => {
              const Icon = getCategoryIcon(cat.id);
              const isSelected = selectedCategory === cat.id;
              const count = categoryCounts[cat.id] || 0;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-950/80 border-cyan-500/80 text-white shadow-md shadow-cyan-950/30'
                      : 'bg-slate-900/60 border-slate-800/80 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isSelected ? 'text-cyan-400' : 'text-slate-400'
                      }`}
                    />
                    <span className="text-xs font-semibold truncate">{cat.label}</span>
                  </div>
                  <span
                    className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${
                      isSelected
                        ? 'bg-cyan-500/20 text-cyan-300'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Results Header Bar & Accordion Controls */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="text-xs sm:text-sm text-slate-400">
            Showing <strong className="text-white font-semibold">{filteredFaqs.length}</strong> help{' '}
            {filteredFaqs.length === 1 ? 'article' : 'articles'}
            {selectedCategory !== 'all' && (
              <span>
                {' '}
                in <span className="text-cyan-300 font-medium">{FAQ_CATEGORIES.find((c) => c.id === selectedCategory)?.label}</span>
              </span>
            )}
            {searchQuery && (
              <span>
                {' '}
                matching &quot;<span className="text-white font-semibold">{searchQuery}</span>&quot;
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {filteredFaqs.length > 0 && (
              <button
                type="button"
                onClick={handleToggleAll}
                className="text-xs text-slate-400 hover:text-cyan-400 transition-colors py-1 px-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg cursor-pointer"
              >
                {expandedIds.size >= filteredFaqs.length ? 'Collapse All' : 'Expand All'}
              </button>
            )}

            {(searchQuery || selectedCategory !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors py-1 px-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg cursor-pointer"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* FAQ Accordion List */}
        {filteredFaqs.length === 0 ? (
          /* Empty Search State */
          <div className="text-center py-16 px-4 bg-slate-900/50 rounded-2xl border border-slate-800/80 max-w-lg mx-auto space-y-4">
            <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">No Matching FAQs Found</h3>
              <p className="mt-1 text-xs sm:text-sm text-slate-400 leading-relaxed">
                We couldn&apos;t find any help articles matching &quot;{searchQuery}&quot;. Try adjusting your keywords or browse by category.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-xl transition-colors shadow-md shadow-cyan-400/20 cursor-pointer"
              >
                Reset Search & Filters
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredFaqs.map((faq) => {
              const isExpanded = expandedIds.has(faq.id);
              const catMeta = FAQ_CATEGORIES.find((c) => c.id === faq.categoryId);
              const Icon = getCategoryIcon(faq.categoryId);

              return (
                <div
                  key={faq.id}
                  className={`rounded-2xl border transition-all overflow-hidden ${
                    isExpanded
                      ? 'bg-slate-900/90 border-cyan-800/70 shadow-md shadow-cyan-950/20'
                      : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700/80'
                  }`}
                >
                  {/* Accordion Trigger */}
                  <button
                    type="button"
                    onClick={() => toggleAccordion(faq.id)}
                    aria-expanded={isExpanded}
                    aria-controls={`faq-answer-${faq.id}`}
                    className="w-full p-4 sm:p-5 text-left flex items-start justify-between gap-4 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-2xl"
                  >
                    <div className="space-y-1.5 flex-1 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 border border-slate-700 text-cyan-400">
                          <Icon className="w-3 h-3 shrink-0" />
                          <span>{catMeta?.label || faq.categoryId}</span>
                        </span>
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-white tracking-tight leading-snug">
                        {faq.question}
                      </h3>
                    </div>

                    <div
                      className={`w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 shrink-0 mt-1 transition-transform duration-200 ${
                        isExpanded ? 'rotate-180 text-cyan-400 bg-cyan-950 border-cyan-700' : ''
                      }`}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </button>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div
                      id={`faq-answer-${faq.id}`}
                      role="region"
                      aria-label={faq.question}
                      className="px-4 sm:px-5 pb-5 pt-1 border-t border-slate-800/80 space-y-4"
                    >
                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                        {faq.answer}
                      </p>

                      {/* Helpful Action Button if configured */}
                      {faq.helpfulAction && (
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => handleFaqAction(faq.helpfulAction)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors shadow-sm shadow-cyan-400/20 cursor-pointer"
                          >
                            <span>{faq.helpfulAction.label}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Keyword Tags */}
                      {faq.tags && faq.tags.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800/60">
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                            Keywords:
                          </span>
                          {faq.tags.map((tag) => (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => setSearchQuery(tag)}
                              className="text-[10px] px-2 py-0.5 rounded-md bg-slate-950 text-slate-400 hover:text-cyan-300 border border-slate-800/80 hover:border-slate-700 transition-colors"
                            >
                              #{tag}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Contact Support Section */}
        <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/40 border border-slate-800 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
              <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
              <span>Dedicated Portal Assistance</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Still have questions or need support?
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              If your inquiry is not addressed in our documentation, reach out to our institutional mentors and engineering team. We are committed to supporting your capacity building journey.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full sm:w-auto">
            {onOpenMyTickets && (
              <button
                type="button"
                onClick={onOpenMyTickets}
                className="w-full sm:w-auto px-5 py-3 text-xs sm:text-sm font-semibold text-cyan-300 bg-cyan-950/70 hover:bg-cyan-900/80 border border-cyan-800/80 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <LifeBuoy className="w-4 h-4 text-cyan-400" />
                <span>My Support Tickets</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                onBack();
                setTimeout(() => onNavigateToSection('contact'), 100);
              }}
              className="w-full sm:w-auto px-5 py-3 text-xs sm:text-sm font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 rounded-xl transition-all shadow-md shadow-cyan-400/25 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Contact Support Team</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
