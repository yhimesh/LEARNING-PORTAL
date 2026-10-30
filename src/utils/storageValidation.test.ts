import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateFileUpload,
  formatFileSize,
  mapFileToResourceType,
  MAX_FILE_SIZE_BYTES,
} from './resourceValidation';

test('formatFileSize formats bytes correctly', () => {
  assert.equal(formatFileSize(0), '0 B');
  assert.equal(formatFileSize(500), '500 B');
  assert.equal(formatFileSize(1024), '1.0 KB');
  assert.equal(formatFileSize(2048), '2.0 KB');
  assert.equal(formatFileSize(1024 * 1024), '1.0 MB');
  assert.equal(formatFileSize(5 * 1024 * 1024), '5.0 MB');
});

test('mapFileToResourceType detects correct resource type', () => {
  assert.equal(mapFileToResourceType('syllabus.pdf', 'application/pdf'), 'pdf');
  assert.equal(mapFileToResourceType('lecture_1.pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'), 'presentation');
  assert.equal(mapFileToResourceType('slides.ppt'), 'presentation');
  assert.equal(mapFileToResourceType('notes.docx'), 'document');
  assert.equal(mapFileToResourceType('guide.doc'), 'document');
  assert.equal(mapFileToResourceType('readme.txt'), 'document');
});

test('validateFileUpload rejects missing or empty files', () => {
  // @ts-expect-error testing invalid input
  const res1 = validateFileUpload(null);
  assert.equal(res1.isValid, false);
  assert.match(res1.error || '', /select a file/i);

  const res2 = validateFileUpload({ name: 'test.pdf', size: 0 });
  assert.equal(res2.isValid, false);
  assert.match(res2.error || '', /empty/i);
});

test('validateFileUpload enforces 10MB maximum limit', () => {
  const overSize = MAX_FILE_SIZE_BYTES + 1024;
  const res = validateFileUpload({
    name: 'big_lecture.pdf',
    size: overSize,
    type: 'application/pdf',
  });
  assert.equal(res.isValid, false);
  assert.match(res.error || '', /10 MB limit/i);
});

test('validateFileUpload rejects disallowed extensions', () => {
  const res = validateFileUpload({
    name: 'malicious.exe',
    size: 1024,
    type: 'application/x-msdownload',
  });
  assert.equal(res.isValid, false);
  assert.match(res.error || '', /Unsupported file extension/i);
});

test('validateFileUpload accepts valid PDF, PPTX, and DOCX files', () => {
  const pdfRes = validateFileUpload({
    name: 'Lecture_1_Intro.pdf',
    size: 2 * 1024 * 1024,
    type: 'application/pdf',
  });
  assert.equal(pdfRes.isValid, true);
  assert.equal(pdfRes.detectedType, 'pdf');
  assert.equal(pdfRes.sanitizedFileName, 'Lecture_1_Intro.pdf');

  const pptxRes = validateFileUpload({
    name: 'Advanced Algorithms.pptx',
    size: 4 * 1024 * 1024,
  });
  assert.equal(pptxRes.isValid, true);
  assert.equal(pptxRes.detectedType, 'presentation');

  const docxRes = validateFileUpload({
    name: 'Assignment_Guide.docx',
    size: 512 * 1024,
  });
  assert.equal(docxRes.isValid, true);
  assert.equal(docxRes.detectedType, 'document');
});
