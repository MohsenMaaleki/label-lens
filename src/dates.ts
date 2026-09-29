import type { Tone } from './theme';
import type { Scan } from './types';

const DAY = 24 * 60 * 60 * 1000;

const locales: Record<string, string> = {
  en: 'en-GB',
  fa: 'fa',
  ar: 'ar',
  uk: 'uk',
  es: 'es',
  fr: 'fr',
  bn: 'bn',
  ur: 'ur',
  // Hermes on Android has no data for 'zh-CN' and silently formats in English; 'zh-Hans-CN' works.
  zh: 'zh-Hans-CN',
  tr: 'tr',
  ro: 'ro',
  it: 'it',
};

export const isIsoDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(new Date(`${s}T00:00:00`).getTime());

/** Whole days from today (local time) to an ISO date; negative when past. */
export function daysUntil(iso: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((new Date(`${iso}T00:00:00`).getTime() - today.getTime()) / DAY);
}

export function dueTone(days: number): Tone {
  if (days < 0) return 'neutral';
  if (days <= 30) return 'urgent';
  if (days <= 60) return 'soon';
  return 'ok';
}

// Gregorian calendar always (documents are dated in it); digits follow the UI language,
// e.g. Persian ۱۲ and Arabic-Indic ١٢, so the app reads naturally, not the source document
// (that stays Western digits, copied character for character — see the Worker's prompt).
const numbering: Record<string, string> = { fa: 'arabext', ar: 'arab' };

/** Month, day, weekday and (only away from the current year) year, all in the UI language's script. */
export function dateParts(iso: string, lang: string) {
  const d = new Date(`${iso}T12:00:00`);
  const nu = numbering[lang] ?? 'latn';
  const format = (opts: Intl.DateTimeFormatOptions) => {
    try {
      return new Intl.DateTimeFormat(`${locales[lang] ?? 'en-GB'}-u-ca-gregory-nu-${nu}`, opts).format(d);
    } catch {
      return new Intl.DateTimeFormat('en-GB', opts).format(d);
    }
  };
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return {
    day: format({ day: 'numeric' }),
    month: format({ month: 'short' }),
    weekday: format({ weekday: 'short' }),
    /** Empty when the deadline falls in the current year. */
    year: sameYear ? '' : format({ year: 'numeric' }),
    long: format({ weekday: 'long', day: 'numeric', month: 'long', ...(sameYear ? {} : { year: 'numeric' }) }),
  };
}

export function upcomingDeadlines(scan: Scan) {
  return scan.result.deadlines
    .filter((d) => isIsoDate(d.date) && daysUntil(d.date) >= 0)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** The soonest deadline that is today or later, across all saved scans. */
export function nextDeadline(scans: Scan[]) {
  let best: { scan: Scan; deadline: { date: string; what: string } } | null = null;
  for (const scan of scans) {
    const [first] = upcomingDeadlines(scan);
    if (first && (!best || first.date < best.deadline.date)) best = { scan, deadline: first };
  }
  return best && { ...best, days: daysUntil(best.deadline.date) };
}
