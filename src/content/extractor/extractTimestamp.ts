/**
 * src-v2/content/extractor/extractTimestamp.ts
 * Extract post timestamp (display text + permalink URL).
 *
 * DOM findings (live inspection 2026-05-09):
 * - No <time> element in Facebook feed view
 * - Timestamp is a[role="link"] whose text/aria-label matches a time pattern
 * - Group post permalink: absolute URL with multi_permalinks query param
 * - aria-label on timestamp link equals the display text ("‏8 דקות", "1 hour ago")
 */
import { absoluteFacebookUrl, cleanFacebookUrl } from '../../shared/facebookUrl';

export interface TimestampInfo {
  text?: string;
  iso?: string;
  permalink?: string;
}

const PERMALINK_PARAMS = ['multi_permalinks', 'story_fbid'];
const PERMALINK_PATHS = ['/posts/', '/permalink/', '/permalink.php', '/story.php', '/reel/'];
const TIME_PATTERNS = [
  /^\d+\s+(minute|hour|second|day|week|month|year|min|hr|sec|hr)s?/i,
  /^(just now|yesterday|moments? ago)/i,
  /\d{1,2}[.:]\d{2}/,
  // Hebrew / Arabic time patterns
  /^‏?\d+\s+(דקות|שעות|שניות|ימים|שבועות|חודשים|שנים|דקה|שעה|שנייה|יום|שבוע|חודש|שנה)/,
  /^‏?\d+\s+(دقيقة|ساعة|يوم|أسبوع|شهر|سنة)/,
];

/**
 * Extract timestamp from a post element.
 *
 * @param postEl Post root element.
 * @param baseUrl Current page URL.
 * @param now Optional current ISO timestamp; used to resolve relative dates ("2 hours ago" → now − 2 h).
 * @returns TimestampInfo with text, optional ISO, and optional permalink.
 */
export function extractTimestamp(postEl: Element, baseUrl: string, now?: string): TimestampInfo {
  const allRoleLinks = [...postEl.querySelectorAll('a[role="link"]')];
  const nowDate = now ? new Date(now) : new Date();

  // Strategy 1: Find a[role="link"] with permalink URL
  for (const link of allRoleLinks) {
    const href = link.getAttribute('href') || '';
    const ariaLabel = link.getAttribute('aria-label') || '';
    const text = (link.textContent || '').trim();

    const isPermalink =
      PERMALINK_PARAMS.some((p) => href.includes(p)) ||
      PERMALINK_PATHS.some((p) => href.includes(p));

    if (isPermalink) {
      return {
        text: ariaLabel || text || undefined,
        permalink: cleanFacebookUrl(href.startsWith('http') ? href : absoluteFacebookUrl(href, baseUrl)),
        iso: _resolvePostedAt(ariaLabel, text, nowDate),
      };
    }
  }

  // Strategy 2: Find a[role="link"] whose text/aria-label looks like a time
  for (const link of allRoleLinks) {
    const ariaLabel = link.getAttribute('aria-label') || '';
    const text = (link.textContent || '').trim();
    const candidate = ariaLabel || text;

    if (candidate && TIME_PATTERNS.some((p) => p.test(candidate))) {
      const href = link.getAttribute('href') || '';
      return {
        text: candidate,
        permalink: href ? cleanFacebookUrl(absoluteFacebookUrl(href, baseUrl)) : undefined,
        iso: _resolvePostedAt(ariaLabel, text, nowDate),
      };
    }
  }

  // Strategy 3: <time> element fallback (some layouts)
  const timeEl = postEl.querySelector('time');
  if (timeEl) {
    const datetime = timeEl.getAttribute('datetime') || undefined;
    return {
      iso: datetime,
      text: (timeEl.textContent || '').trim() || undefined,
    };
  }

  return {};
}

/**
 * Resolve a Facebook timestamp into an ISO date.
 *
 * Tries, in order:
 *  1. Direct Date.parse on the aria-label ("Friday, May 15, 2026 at 3:42 PM").
 *  2. An absolute "Month DD, YYYY" / "DD Month YYYY" substring.
 *  3. Relative time ("2 hours ago", "Yesterday", "Just now") resolved against `now`.
 *
 * Facebook's aria-label usually carries the full timestamp even when the
 * visible text is relative, so step 1 succeeds for most posts. The relative
 * fallback exists for layouts where only the short text is available — that
 * way the `date` field reflects when the post was *published*, not when it
 * was captured.
 */
function _resolvePostedAt(ariaLabel: string, text: string, now: Date): string | undefined {
  const sources = [ariaLabel, text].filter((s) => s && s.trim().length > 0);

  // 1. Direct parse
  for (const s of sources) {
    const parsed = Date.parse(s);
    if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();
  }

  // 2. Absolute date substring (handles aria-labels that wrap extra prose)
  const ABSOLUTE = /(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})|((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})/i;
  for (const s of sources) {
    const m = s.match(ABSOLUTE);
    if (m) {
      const parsed = Date.parse(m[0]);
      if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();
    }
  }

  // 2b. Absolute date substring — Hebrew months
  const HE_MONTHS: Record<string, number> = {
    ינואר: 1, פברואר: 2, מרץ: 3, אפריל: 4, מאי: 5, יוני: 6,
    יולי: 7, אוגוסט: 8, ספטמבר: 9, אוקטובר: 10, נובמבר: 11, דצמבר: 12,
  };
  const HE_MONTH_RE = new RegExp(`(\\d{1,2})\\s+(${Object.keys(HE_MONTHS).join('|')})\\s+(\\d{4})`);
  for (const s of sources) {
    const m = s.match(HE_MONTH_RE);
    if (m) {
      const month = HE_MONTHS[m[2]];
      const d = new Date(parseInt(m[3], 10), month - 1, parseInt(m[1], 10));
      if (!Number.isNaN(d.getTime())) return d.toISOString();
    }
  }

  // 3. Relative time — English
  const RELATIVE = /(\d+)\s*(second|minute|hour|day|week|month|year|sec|min|hr|wk|mo|yr)s?\b/i;
  const UNIT_MS: Record<string, number> = {
    second: 1_000, sec: 1_000,
    minute: 60_000, min: 60_000,
    hour: 3_600_000, hr: 3_600_000,
    day: 86_400_000,
    week: 604_800_000, wk: 604_800_000,
    month: 30 * 86_400_000, mo: 30 * 86_400_000,
    year: 365 * 86_400_000, yr: 365 * 86_400_000,
  };
  for (const s of sources) {
    const m = s.match(RELATIVE);
    if (m) {
      const n = parseInt(m[1], 10);
      const unit = m[2].toLowerCase();
      const ms = UNIT_MS[unit] ?? UNIT_MS[unit.replace(/s$/, '')] ?? 0;
      if (ms > 0) return new Date(now.getTime() - n * ms).toISOString();
    }
  }

  // 3b. Relative time — Hebrew (e.g. "‏4 שעות", "דקה אחת")
  const HE_UNITS: Array<[RegExp, number]> = [
    [/(\d+)\s*שניות?|שנייה\s+אחת/, 1_000],
    [/(\d+)\s*דקות?|דקה\s+אחת/, 60_000],
    [/(\d+)\s*שעות?|שעה\s+אחת/, 3_600_000],
    [/(\d+)\s*ימים?|יום\s+אחד/, 86_400_000],
    [/(\d+)\s*שבועות?|שבוע\s+אחד/, 604_800_000],
    [/(\d+)\s*חודשים?|חודש\s+אחד/, 30 * 86_400_000],
    [/(\d+)\s*שנים?|שנה\s+אחת/, 365 * 86_400_000],
  ];
  for (const s of sources) {
    for (const [re, unitMs] of HE_UNITS) {
      const m = s.match(re);
      if (m) {
        const n = m[1] ? parseInt(m[1], 10) : 1;
        return new Date(now.getTime() - n * unitMs).toISOString();
      }
    }
  }

  // 3c. Relative time — Arabic (e.g. "منذ 3 ساعات")
  const AR_UNITS: Array<[RegExp, number]> = [
    [/(\d+)\s*ثواني?|ثانية/, 1_000],
    [/(\d+)\s*دقائق?|دقيقة/, 60_000],
    [/(\d+)\s*ساعات?|ساعة/, 3_600_000],
    [/(\d+)\s*أيام?|يوم/, 86_400_000],
    [/(\d+)\s*أسابيع?|أسبوع/, 604_800_000],
    [/(\d+)\s*أشهر?|شهر/, 30 * 86_400_000],
    [/(\d+)\s*سنوات?|سنة/, 365 * 86_400_000],
  ];
  for (const s of sources) {
    for (const [re, unitMs] of AR_UNITS) {
      const m = s.match(re);
      if (m) {
        const n = m[1] ? parseInt(m[1], 10) : 1;
        return new Date(now.getTime() - n * unitMs).toISOString();
      }
    }
  }

  for (const s of sources) {
    if (/just now|moments? ago/i.test(s)) return now.toISOString();
    if (/yesterday/i.test(s)) {
      const d = new Date(now);
      d.setDate(d.getDate() - 1);
      return d.toISOString();
    }
    // Hebrew "just now" / "yesterday"
    if (/לפני רגע|עכשיו/.test(s)) return now.toISOString();
    if (/אתמול/.test(s)) {
      const d = new Date(now);
      d.setDate(d.getDate() - 1);
      return d.toISOString();
    }
    // Arabic "just now" / "yesterday"
    if (/الآن|منذ لحظة/.test(s)) return now.toISOString();
    if (/أمس/.test(s)) {
      const d = new Date(now);
      d.setDate(d.getDate() - 1);
      return d.toISOString();
    }
  }

  return undefined;
}
