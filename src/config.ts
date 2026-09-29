// Values come from .env (EXPO_PUBLIC_* are inlined at build time — never put the Gemini key here).
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8787';
export const APP_TOKEN = process.env.EXPO_PUBLIC_APP_TOKEN ?? '';
export const RC_ANDROID_KEY = process.env.EXPO_PUBLIC_RC_ANDROID_KEY ?? '';
export const RC_IOS_KEY = process.env.EXPO_PUBLIC_RC_IOS_KEY ?? '';

/** Keep in sync with "version" in app.json. */
export const APP_VERSION = '1.0.0';

/** RevenueCat entitlement identifier configured in the dashboard. */
export const ENTITLEMENT = 'pro';

/** RevenueCat debug logs: always in a dev build, and in a release build made with EXPO_PUBLIC_RC_DEBUG=1. */
export const RC_DEBUG = __DEV__ || process.env.EXPO_PUBLIC_RC_DEBUG === '1';

/** Free tier: scans per rolling 7 days. */
export const FREE_SCANS_PER_WEEK = 3;

export const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'fa', label: 'Persian', native: 'فارسی' },
  { code: 'ar', label: 'Arabic', native: 'العربية' },
  { code: 'uk', label: 'Ukrainian', native: 'Українська' },
  { code: 'es', label: 'Spanish', native: 'Español' },
  { code: 'fr', label: 'French', native: 'Français' },
  { code: 'bn', label: 'Bengali', native: 'বাংলা' },
  { code: 'ur', label: 'Urdu', native: 'اردو' },
  { code: 'zh', label: 'Chinese', native: '中文' },
  { code: 'tr', label: 'Turkish', native: 'Türkçe' },
  { code: 'ro', label: 'Romanian', native: 'Română' },
  { code: 'it', label: 'Italian (simple)', native: 'Italiano semplice' },
] as const;

export const RTL = new Set(['fa', 'ar', 'ur']);
