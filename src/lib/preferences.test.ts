import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import * as preferences from './preferences';

describe('preferences', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    describe('getLanguage', () => {
        it('returns "ar" as default language', () => {
            expect(preferences.getLanguage()).toBe('ar');
        });

        it('returns stored language when set', () => {
            localStorage.setItem('maintmena_language', 'en');
            expect(preferences.getLanguage()).toBe('en');
        });

        it('migrates legacy "language" key', () => {
            localStorage.setItem('language', 'en');
            const result = preferences.getLanguage();
            expect(result).toBe('en');
            expect(localStorage.getItem('maintmena_language')).toBe('en');
        });
    });

    describe('setLanguage', () => {
        it('stores language with standardized key', () => {
            preferences.setLanguage('en');
            expect(localStorage.getItem('maintmena_language')).toBe('en');
        });

        it('also sets legacy keys for backward compatibility', () => {
            preferences.setLanguage('ar');
            expect(localStorage.getItem('language')).toBe('ar');
            expect(localStorage.getItem('preferredLanguage')).toBe('ar');
            expect(localStorage.getItem('currentLanguage')).toBe('ar');
        });
    });

    describe('getCurrency', () => {
        it('returns "SAR" as default currency', () => {
            expect(preferences.getCurrency()).toBe('SAR');
        });

        it('forces SAR even when a legacy currency is stored', () => {
            localStorage.setItem('maintmena_currency', 'USD');
            expect(preferences.getCurrency()).toBe('SAR');
            expect(localStorage.getItem('maintmena_currency')).toBe('SAR');
        });
    });

    describe('getDateFormat', () => {
        it('returns "gregorian" as default', () => {
            expect(preferences.getDateFormat()).toBe('gregorian');
        });

        it('returns "hijri" when set', () => {
            localStorage.setItem('maintmena_date_format', 'hijri');
            expect(preferences.getDateFormat()).toBe('hijri');
        });
    });
});
