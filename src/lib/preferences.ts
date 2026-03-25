/**
 * Centralized Preferences Manager
 * 
 * This utility provides a single source of truth for all localStorage preferences.
 * Use this instead of direct localStorage access to ensure consistent key naming
 * and type safety across the application.
 */

// Standardized localStorage keys
const KEYS = {
    language: 'maintmena_language',
    currency: 'maintmena_currency',
    dateFormat: 'maintmena_date_format',
    theme: 'maintmena_theme',
    userType: 'maintmena_user_type',
    // Legacy keys for backward compatibility reads
    legacyLanguage: ['language', 'preferredLanguage', 'currentLanguage'],
    legacyCurrency: ['preferred_currency'],
} as const;

export type Language = 'en' | 'ar';
export type Currency = 'SAR' | 'USD' | 'EUR';
export type DateFormat = 'gregorian' | 'hijri';
export type Theme = 'light' | 'dark' | 'system';
export type UserType = 'buyer' | 'seller' | 'admin';

/**
 * Get language preference with legacy key support
 */
export function getLanguage(): Language {
    // Try new key first
    const newValue = localStorage.getItem(KEYS.language);
    if (newValue === 'en' || newValue === 'ar') {
        return newValue;
    }

    // Fall back to legacy keys
    for (const legacyKey of KEYS.legacyLanguage) {
        const legacyValue = localStorage.getItem(legacyKey);
        if (legacyValue === 'en' || legacyValue === 'ar') {
            // Migrate to new key
            localStorage.setItem(KEYS.language, legacyValue);
            return legacyValue;
        }
    }

    // Default to Arabic (primary market)
    return 'ar';
}

/**
 * Set language preference
 */
export function setLanguage(lang: Language): void {
    localStorage.setItem(KEYS.language, lang);
    // Also set legacy keys for compatibility with components not yet migrated
    KEYS.legacyLanguage.forEach(key => {
        localStorage.setItem(key, lang);
    });
}

/**
 * Get currency preference
 */
export function getCurrency(): Currency {
    const newValue = localStorage.getItem(KEYS.currency);
    if (newValue === 'SAR' || newValue === 'USD' || newValue === 'EUR') {
        return newValue;
    }

    // Check legacy key
    const legacyValue = localStorage.getItem('preferred_currency');
    if (legacyValue === 'SAR' || legacyValue === 'USD' || legacyValue === 'EUR') {
        localStorage.setItem(KEYS.currency, legacyValue);
        return legacyValue;
    }

    return 'SAR';
}

/**
 * Set currency preference
 */
export function setCurrency(currency: Currency): void {
    localStorage.setItem(KEYS.currency, currency);
    localStorage.setItem('preferred_currency', currency); // Legacy compatibility
}

/**
 * Get date format preference
 */
export function getDateFormat(): DateFormat {
    const value = localStorage.getItem(KEYS.dateFormat);
    if (value === 'gregorian' || value === 'hijri') {
        return value;
    }

    const legacyValue = localStorage.getItem('dateFormat') || localStorage.getItem('preferredDateFormat');
    if (legacyValue === 'gregorian' || legacyValue === 'hijri') {
        localStorage.setItem(KEYS.dateFormat, legacyValue);
        return legacyValue;
    }

    return 'gregorian';
}

/**
 * Set date format preference
 */
export function setDateFormat(format: DateFormat): void {
    localStorage.setItem(KEYS.dateFormat, format);
    localStorage.setItem('dateFormat', format); // Legacy compatibility
    localStorage.setItem('preferredDateFormat', format); // Legacy compatibility
}

/**
 * Get theme preference
 */
export function getTheme(): Theme {
    const value = localStorage.getItem(KEYS.theme);
    if (value === 'light' || value === 'dark' || value === 'system') {
        return value;
    }
    return 'system';
}

/**
 * Set theme preference
 */
export function setTheme(theme: Theme): void {
    localStorage.setItem(KEYS.theme, theme);
}

/**
 * Get user type from storage
 */
export function getUserType(): UserType | null {
    const value = localStorage.getItem(KEYS.userType) || localStorage.getItem('userType');
    if (value === 'buyer' || value === 'seller' || value === 'admin') {
        return value;
    }
    return null;
}

/**
 * Set user type
 */
export function setUserType(userType: UserType): void {
    localStorage.setItem(KEYS.userType, userType);
    localStorage.setItem('userType', userType); // Legacy compatibility
}

/**
 * Clear all preferences (for logout)
 */
export function clearPreferences(): void {
    Object.values(KEYS).forEach(key => {
        if (typeof key === 'string') {
            localStorage.removeItem(key);
        } else if (Array.isArray(key)) {
            key.forEach(k => localStorage.removeItem(k));
        }
    });
}

// Export default object for convenient import
export const preferences = {
    getLanguage,
    setLanguage,
    getCurrency,
    setCurrency,
    getDateFormat,
    setDateFormat,
    getTheme,
    setTheme,
    getUserType,
    setUserType,
    clearPreferences,
    KEYS,
};

export default preferences;
