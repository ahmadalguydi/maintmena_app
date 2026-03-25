import { describe, expect, it } from 'vitest';
import { deriveSellerHomeState } from './useSellerHomeState';

describe('deriveSellerHomeState', () => {
    it('returns offline when seller is not online and there is no active job', () => {
        expect(
            deriveSellerHomeState({
                hasActiveJob: false,
                isOnline: false,
                scheduledJobsCount: 0,
                lastOpportunityAt: null,
            }),
        ).toBe('A');
    });

    it('returns mission mode when there is an active job', () => {
        expect(
            deriveSellerHomeState({
                hasActiveJob: true,
                isOnline: true,
                scheduledJobsCount: 0,
                lastOpportunityAt: null,
            }),
        ).toBe('C');
    });

    it('returns scheduled when there are future jobs and no active job', () => {
        expect(
            deriveSellerHomeState({
                hasActiveJob: false,
                isOnline: true,
                scheduledJobsCount: 2,
                lastOpportunityAt: null,
            }),
        ).toBe('D');
    });

    it('returns quiet-market state after the threshold passes without opportunities', () => {
        const now = new Date('2026-03-24T12:00:00.000Z').getTime();
        const lastOpportunityAt = new Date('2026-03-24T11:55:00.000Z');

        expect(
            deriveSellerHomeState({
                hasActiveJob: false,
                isOnline: true,
                scheduledJobsCount: 0,
                lastOpportunityAt,
                now,
            }),
        ).toBe('B0');
    });

    it('prioritizes a forced state when explicitly provided', () => {
        expect(
            deriveSellerHomeState({
                forcedState: 'B',
                hasActiveJob: true,
                isOnline: false,
                scheduledJobsCount: 3,
                lastOpportunityAt: new Date('2026-03-24T11:55:00.000Z'),
            }),
        ).toBe('B');
    });
});
