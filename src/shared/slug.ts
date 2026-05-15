/**
 * src-v2/shared/slug.ts
 * Slug generation for folder and filename sanitization.
 */

/**
 * Slugify for folder names (ASCII-only safe).
 */
export function slugifyForFolder(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/**
 * Slugify for filenames (Windows-aware, optional Unicode).
 */
export function slugifyForFilename(s: string, opts: { unicode?: boolean; maxLen?: number } = {}): string {
  const { unicode = false, maxLen = 200 } = opts;
  let result = s.toLowerCase();

  // Remove Windows-reserved names (CON, PRN, AUX, NUL, COM1-9, LPT1-9)
  const reserved = /^(con|prn|aux|nul|com\d|lpt\d)$/i;
  if (reserved.test(result)) {
    result = '_' + result;
  }

  // Remove/replace unsafe chars
  if (!unicode) {
    result = result
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, maxLen);
  } else {
    // Keep Unicode letters/numbers but strip Windows/Obsidian-illegal chars
    result = result
      .replace(/[*"\\/<>:|?#^[\]]/g, '')   // illegal in Windows filenames + Obsidian
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, maxLen);
  }

  // Avoid trailing dots (Windows restriction)
  result = result.replace(/\.+$/, '');

  return result || 'note';
}

/**
 * ASCII fallback for Hebrew/Arabic transliteration.
 */
export function asciiFallback(s: string): string {
  // Simple Hebrew -> ASCII mapping for common chars
  const hebrewMap: Record<string, string> = {
    א: 'a',
    ב: 'b',
    ג: 'g',
    ד: 'd',
    ה: 'h',
    ו: 'v',
    ז: 'z',
    ח: 'kh',
    ט: 't',
    י: 'y',
    כ: 'k',
    ל: 'l',
    מ: 'm',
    נ: 'n',
    ס: 's',
    ע: 'aa',
    פ: 'p',
    צ: 'ts',
    ק: 'k',
    ר: 'r',
    ש: 'sh',
    ת: 't',
  };

  let result = '';
  for (const ch of s) {
    result += hebrewMap[ch] || ch;
  }
  return result;
}
