/**
 * Centralized Preferences Manager
 *
 * Critical preferences (language, userType, onboarding, haptics) are written
 * through `storage` so they survive on native via @capacitor/preferences.
 * Legacy keys are kept as aliases so older code that still reads localStorage
 * directly continues to work during the transition period.
 */

import { storage } from './storage';

// ── Key constants ─────────────────────────────────────────────────────────────

const KEYS = {
  // Durable (via @capacitor/preferences on native)
  language:      'mm_lang',
  userType:      'mm_user_type',
  onboarding:    'mm_onboarding_done',
  haptics:       'mm_haptics_enabled',
  // Remaining — localStorage only (transient / session-level data)
  currency:      'maintmena_currency',
  dateFormat:    'maintmena_date_format',
  theme:         'maintmena_theme',
  // Legacy aliases written alongside new keys for backward compat
  legacyLanguage:  ['language', 'preferredLanguage', 'currentLanguage', 'maintmena_language'],
  legacyCurrency:  ['preferred_currency'],
} as const;

export type Language   = 'en' | 'ar';
export type Currency   = 'SAR';
export type DateFormat = 'gregorian' | 'hijri';
export type Theme      = 'light' | 'dark' | 'system';
export type UserType   = 'buyer' | 'seller' | 'admin';

// ── Language ──────────────────────────────────────────────────────────────────

export function getLanguage(): Language {
  const v = storage.getItem(KEYS.language);
  if (v === 'en' || v === 'ar') return v;

  for (const k of KEYS.legacyLanguage) {
    const lv = storage.getItem(k);
    if (lv === 'en' || lv === 'ar') {
      setLanguage(lv);   // migrate to durable key
      return lv;
    }
  }
  return 'ar';
}

export function setLanguage(lang: Language): void {
  storage.setItem(KEYS.language, lang);
  // Keep legacy keys in sync so components still reading them directly work
  for (const k of KEYS.legacyLanguage) {
    storage.setItem(k, lang);
  }
}

// ── User type ─────────────────────────────────────────────────────────────────

export function getUserType(): UserType | null {
  const v = storage.getItem(KEYS.userType) ?? storage.getItem('userType');
  if (v === 'buyer' || v === 'seller' || v === 'admin') return v;
  return null;
}

export function setUserType(userType: UserType): void {
  storage.setItem(KEYS.userType, userType);
  storage.setItem('userType', userType);   // legacy compat
}

// ── Onboarding ────────────────────────────────────────────────────────────────

export function hasSeenOnboarding(): boolean {
  return storage.getItem(KEYS.onboarding) === 'true';
}

export function markOnboardingDone(): void {
  storage.setItem(KEYS.onboarding, 'true');
  storage.setItem('hasSeenOnboarding', 'true');   // legacy compat
}

// ── Haptics ───────────────────────────────────────────────────────────────────

export function getHapticsEnabled(): boolean {
  // Default to enabled; only disabled when explicitly set to 'false'
  return storage.getItem(KEYS.haptics) !== 'false';
}

export function setHapticsEnabled(enabled: boolean): void {
  storage.setItem(KEYS.haptics, String(enabled));
  storage.setItem('hapticFeedbackEnabled', String(enabled));   // legacy compat
}

// ── Currency (localStorage only — not critical) ───────────────────────────────

export function getCurrency(): Currency {
  setCurrency('SAR');
  return 'SAR';
}

export function setCurrency(_currency: Currency): void {
  storage.setItem(KEYS.currency, 'SAR');
  for (const k of KEYS.legacyCurrency) storage.setItem(k, 'SAR');
}

// ── Date format ───────────────────────────────────────────────────────────────

export function getDateFormat(): DateFormat {
  const v = storage.getItem(KEYS.dateFormat);
  if (v === 'gregorian' || v === 'hijri') return v;
  const lv = storage.getItem('dateFormat') ?? storage.getItem('preferredDateFormat');
  if (lv === 'gregorian' || lv === 'hijri') {
    setDateFormat(lv);
    return lv;
  }
  return 'gregorian';
}

export function setDateFormat(format: DateFormat): void {
  storage.setItem(KEYS.dateFormat, format);
  storage.setItem('dateFormat', format);
  storage.setItem('preferredDateFormat', format);
}

// ── Theme ─────────────────────────────────────────────────────────────────────

export function getTheme(): Theme {
  const v = storage.getItem(KEYS.theme);
  if (v === 'light' || v === 'dark' || v === 'system') return v;
  return 'system';
}

export function setTheme(theme: Theme): void {
  storage.setItem(KEYS.theme, theme);
}

// ── Clear all (logout) ────────────────────────────────────────────────────────

export function clearPreferences(): void {
  const allKeys = [
    KEYS.language,
    KEYS.userType,
    KEYS.onboarding,
    KEYS.haptics,
    KEYS.currency,
    KEYS.dateFormat,
    KEYS.theme,
    ...KEYS.legacyLanguage,
    ...KEYS.legacyCurrency,
    'userType',
    'hasSeenOnboarding',
    'hapticFeedbackEnabled',
    'dateFormat',
    'preferredDateFormat',
  ] as string[];

  for (const key of allKeys) storage.removeItem(key);
}

export const preferences = {
  getLanguage,
  setLanguage,
  getUserType,
  setUserType,
  hasSeenOnboarding,
  markOnboardingDone,
  getHapticsEnabled,
  setHapticsEnabled,
  getCurrency,
  setCurrency,
  getDateFormat,
  setDateFormat,
  getTheme,
  setTheme,
  clearPreferences,
  KEYS,
};

export default preferences;
