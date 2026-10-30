import test from 'node:test';
import assert from 'node:assert/strict';
import { filterFaqs, countFaqsByCategory } from './faqFilter';
import { FAQ_ITEMS } from '../data/faqData';

test('filterFaqs returns all faqs when query is empty and category is all', () => {
  const result = filterFaqs(FAQ_ITEMS, { searchQuery: '', selectedCategory: 'all' });
  assert.equal(result.length, FAQ_ITEMS.length);
});

test('filterFaqs filters accurately by category', () => {
  const accountFaqs = filterFaqs(FAQ_ITEMS, { selectedCategory: 'account-login' });
  assert.ok(accountFaqs.length > 0);
  assert.ok(accountFaqs.every((f) => f.categoryId === 'account-login'));
});

test('filterFaqs matches keywords in questions case-insensitively', () => {
  const result = filterFaqs(FAQ_ITEMS, { searchQuery: '  ENROLL IN A COURSE   ' });
  assert.ok(result.length > 0);
  assert.ok(result.some((f) => f.question.toLowerCase().includes('enroll')));
});

test('filterFaqs matches keywords in answers', () => {
  const result = filterFaqs(FAQ_ITEMS, { searchQuery: 'passing threshold' });
  assert.ok(result.length > 0);
  assert.ok(result[0].answer.toLowerCase().includes('passing threshold') || result[0].question.toLowerCase().includes('passing threshold'));
});

test('filterFaqs matches keywords in tags', () => {
  const result = filterFaqs(FAQ_ITEMS, { searchQuery: 'sih26075' });
  assert.ok(result.length > 0);
  assert.ok(result.some((f) => f.tags.includes('sih26075')));
});

test('filterFaqs combines category filter and search query correctly', () => {
  const result = filterFaqs(FAQ_ITEMS, {
    selectedCategory: 'quizzes-results',
    searchQuery: 'attempts',
  });
  assert.ok(result.length > 0);
  assert.ok(result.every((f) => f.categoryId === 'quizzes-results'));
  assert.ok(result.some((f) => f.answer.includes('attempt')));
});

test('filterFaqs returns empty array when query has no matches', () => {
  const result = filterFaqs(FAQ_ITEMS, { searchQuery: 'xyznonexistentquery99999' });
  assert.equal(result.length, 0);
});

test('countFaqsByCategory calculates totals for each category', () => {
  const counts = countFaqsByCategory(FAQ_ITEMS);
  assert.equal(counts.all, FAQ_ITEMS.length);
  assert.ok(counts['getting-started'] > 0);
  assert.ok(counts['troubleshooting'] > 0);
});
