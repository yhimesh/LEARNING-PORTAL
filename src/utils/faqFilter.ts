import { FaqItem, FaqCategoryId } from '../data/faqData';

export interface FaqFilterOptions {
  searchQuery?: string;
  selectedCategory?: FaqCategoryId | 'all';
}

/**
 * Pure, deterministic search and category filtering utility for Help Center FAQs.
 * Searches across question text, answer explanation, and relevant keyword tags.
 */
export function filterFaqs(faqs: FaqItem[], options: FaqFilterOptions = {}): FaqItem[] {
  if (!faqs || !Array.isArray(faqs)) return [];

  const { searchQuery = '', selectedCategory = 'all' } = options;
  const normalizedQuery = searchQuery.trim().toLowerCase();

  return faqs.filter((faq) => {
    // 1. Category filter
    if (selectedCategory && selectedCategory !== 'all') {
      if (faq.categoryId !== selectedCategory) {
        return false;
      }
    }

    // 2. If no search query, match all category-conforming items
    if (!normalizedQuery) {
      return true;
    }

    // 3. Search in Question
    if (faq.question.toLowerCase().includes(normalizedQuery)) {
      return true;
    }

    // 4. Search in Answer text
    if (faq.answer.toLowerCase().includes(normalizedQuery)) {
      return true;
    }

    // 5. Search in Keyword Tags
    if (
      Array.isArray(faq.tags) &&
      faq.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery))
    ) {
      return true;
    }

    return false;
  });
}

/**
 * Returns count of FAQs in each category
 */
export function countFaqsByCategory(faqs: FaqItem[]): Record<string, number> {
  const counts: Record<string, number> = { all: faqs.length };
  for (const item of faqs) {
    counts[item.categoryId] = (counts[item.categoryId] || 0) + 1;
  }
  return counts;
}
