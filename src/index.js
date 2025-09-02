// Main module for twl-generator
import { generateTWTerms } from './utils/zipProcessor.js';
import { processUsfmForBook, parseUsfmToVerses, removeAllTagsExceptChapterVerse } from './utils/usfm-alignment-remover.js';
import { generateTWLMatches, createOptimizedTermMap, findMatches } from './utils/twl-matcher.js';

export { generateTWTerms, processUsfmForBook };

/**
 * Main function that processes both TW articles and USFM file
 * @param {string} book - The book identifier (optional if usfmContent is provided)
 * @param {string} usfmContent - Optional USFM content to process instead of fetching
 * @return {Promise<string>} - TSV string
 */
export async function generateTWLWithUsfm(book, usfmContent = null) {
  // Generate TW terms (with caching)
  const terms = await generateTWTerms();

  let verses;
  if (usfmContent) {
    // Parse provided USFM content (clean it first)
    const cleanUsfm = removeAllTagsExceptChapterVerse(usfmContent);
    verses = parseUsfmToVerses(cleanUsfm);
  } else {
    // Fetch USFM from git.door43.org
    if (!book) throw new Error('Book parameter required when no USFM content provided');
    verses = await processUsfmForBook(book);
  }

  // Generate TWL matches and return TSV
  const tsv = generateTWLMatches(terms, verses);
  return tsv;
}

/**
 * Generate per-verse keywords with lemmas for a set of verses
 * Returns a flat keyed object: { "C:V": [{ surface, lemma }, ...] }
 *
 * @param {Record<string, string[]>} twTerms - term -> article paths
 * @param {Record<string, Record<string, string>>} verses - { chapter: { verse: text } }
 * @returns {Record<string, Array<{surface: string, lemma: string}>>}
 */
export function generateKeywordsForVerses(twTerms, verses) {
  const trie = createOptimizedTermMap(twTerms);
  const result = {};

  for (const [chapterNum, chapter] of Object.entries(verses)) {
    for (const [verseNum, verseText] of Object.entries(chapter)) {
      const reference = `${chapterNum}:${verseNum}`;
      const matches = findMatches(verseText, trie);

      // derive stable position from context '[...]'
      const withPos = matches.map(m => ({
        surface: m.matchedText,
        lemma: m.term,
        pos: (m.context || '').indexOf('[')
      }));

      // sort by position then keep first occurrence of each surface
      withPos.sort((a, b) => {
        const ap = a.pos < 0 ? Number.MAX_SAFE_INTEGER : a.pos;
        const bp = b.pos < 0 ? Number.MAX_SAFE_INTEGER : b.pos;
        return ap - bp;
      });

      const seen = new Set();
      const entries = [];
      for (const m of withPos) {
        if (!seen.has(m.surface)) {
          seen.add(m.surface);
          entries.push({ surface: m.surface, lemma: m.lemma });
        }
      }

      result[reference] = entries;
    }
  }

  return result;
}
