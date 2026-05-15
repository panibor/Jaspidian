/**
 * src-v2/shared/text.ts
 * Text utilities: normalization, direction detection, language detection.
 */
import type { TextDirection } from './types';

/**
 * Collapse runs of whitespace to single space, preserve \n\n paragraph breaks.
 */
export function normalizeWhitespace(s: string): string {
  // Preserve paragraph breaks (\n\n), collapse other whitespace
  return s
    .split('\n\n')
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter((p) => p.length > 0)
    .join('\n\n');
}

/**
 * Normalize names: lowercase, strip diacritics, remove UI markers.
 */
export function normalizeName(s: string): string {
  if (!s) return '';
  // Lowercase
  let result = s.toLowerCase();
  // Remove diacritics
  result = result.normalize('NFD').replace(/[̀-ͯ]/g, '');
  // Remove UI markers
  result = result.replace(/\b(verified|follow|public)\b/gi, '').replace(/·\s*$/, '');
  // Trim
  result = result.trim();
  return result;
}

/**
 * Detect text direction: Hebrew/Arabic vs Latin.
 */
export function detectDirection(s: string): TextDirection {
  if (!s) return 'auto';
  // Count by character range
  let hebrew = 0;
  let arabic = 0;
  let latin = 0;
  for (const ch of s) {
    const code = ch.charCodeAt(0);
    if (code >= 0x0590 && code <= 0x05ff) hebrew++;
    else if (code >= 0x0600 && code <= 0x06ff) arabic++;
    else if ((code >= 0x0041 && code <= 0x005a) || (code >= 0x0061 && code <= 0x007a)) latin++;
  }
  const nonLatin = hebrew + arabic;
  const total = nonLatin + latin;
  if (total === 0) return 'auto';
  if (nonLatin / total >= 0.4) return 'rtl';
  return 'ltr';
}

/**
 * Detect language from script ranges in the text.
 * Returns an ISO 639-1 language code, or 'en' as a fallback for Latin-script text.
 * Callers that know the page's declared language (htmlLang) should use that to
 * distinguish between Latin-script locales (fr, de, es, pt, …).
 */
export function detectLanguage(s: string): string {
  if (!s) return 'en';
  let hebrew = 0;
  let arabic = 0;
  let cyrillic = 0;
  let greek = 0;
  let devanagari = 0; // Hindi, Marathi, Nepali, …
  let thai = 0;
  let hiragana = 0;  // Japanese hiragana
  let katakana = 0;  // Japanese katakana
  let hangul = 0;    // Korean
  let cjk = 0;       // Chinese / Japanese kanji
  let georgian = 0;
  let armenian = 0;
  let ethiopic = 0;  // Amharic, Tigrinya, …
  let khmer = 0;
  let myanmar = 0;

  for (const ch of s) {
    const code = ch.codePointAt(0) ?? 0;
    if (code >= 0x0590 && code <= 0x05ff) hebrew++;
    else if (code >= 0x0600 && code <= 0x06ff) arabic++;
    else if (code >= 0x0400 && code <= 0x04ff) cyrillic++;
    else if (code >= 0x0370 && code <= 0x03ff) greek++;
    else if (code >= 0x0900 && code <= 0x097f) devanagari++;
    else if (code >= 0x0e00 && code <= 0x0e7f) thai++;
    else if (code >= 0x3040 && code <= 0x309f) hiragana++;
    else if (code >= 0x30a0 && code <= 0x30ff) katakana++;
    else if (code >= 0xac00 && code <= 0xd7af) hangul++;
    else if ((code >= 0x4e00 && code <= 0x9fff) || (code >= 0x3400 && code <= 0x4dbf)) cjk++;
    else if (code >= 0x10a0 && code <= 0x10ff) georgian++;
    else if (code >= 0x0530 && code <= 0x058f) armenian++;
    else if (code >= 0x1200 && code <= 0x137f) ethiopic++;
    else if (code >= 0x1780 && code <= 0x17ff) khmer++;
    else if (code >= 0x1000 && code <= 0x109f) myanmar++;
  }

  // A script wins when it is clearly dominant in the text.
  // Require either ≥30 chars (absolute) OR (>5 chars AND ≥25% of total text length).
  // The proportional guard prevents a few leaked Facebook UI strings (e.g. "ציבורי · שיתוף")
  // from misclassifying an otherwise Latin-script post as Hebrew/Arabic.
  const len = s.length || 1;
  const dom = (n: number) => n >= 30 || (n > 5 && n / len >= 0.25);

  if (dom(hebrew)) return 'he';
  if (dom(arabic)) return 'ar';
  if (dom(hangul)) return 'ko';
  if (dom(thai)) return 'th';
  if (dom(devanagari)) return 'hi';
  if (dom(greek)) return 'el';
  if (dom(georgian)) return 'ka';
  if (dom(armenian)) return 'hy';
  if (dom(ethiopic)) return 'am';
  if (dom(khmer)) return 'km';
  if (dom(myanmar)) return 'my';

  // CJK: distinguish Japanese (has kana) from Chinese
  const japanese = hiragana + katakana;
  if (japanese > 5 || (japanese > 0 && cjk > 5)) return 'ja';
  if (dom(cjk)) return 'zh';

  if (dom(cyrillic)) return 'ru';

  return 'en';
}
