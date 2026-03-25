import { describe, expect, it } from 'vitest';

import {
  getBuyerReviewPromptCount,
  getBuyerReviewPromptStorageKey,
  getBuyerReviewSubmittedStorageKey,
  hasBuyerReviewBeenSubmittedLocally,
  incrementBuyerReviewPromptCount,
  markBuyerReviewSubmitted,
  shouldPromptBuyerForReview,
  shouldShowBuyerRequestOnHome,
} from './buyerCompletionFlow';

describe('buyerCompletionFlow', () => {
  it('hides buyer-home request summaries once the buyer has marked the job complete', () => {
    expect(shouldShowBuyerRequestOnHome({ buyer_marked_complete: false })).toBe(true);
    expect(shouldShowBuyerRequestOnHome({ buyer_marked_complete: true })).toBe(false);
  });

  it('hides terminal requests from buyer home', () => {
    expect(shouldShowBuyerRequestOnHome({ lifecycle: 'cancelled', buyer_marked_complete: false })).toBe(false);
    expect(shouldShowBuyerRequestOnHome({ status: 'closed', buyer_marked_complete: false })).toBe(false);
    expect(shouldShowBuyerRequestOnHome({ lifecycle: 'seller_assigned', buyer_marked_complete: false })).toBe(true);
  });

  it('prompts for a review only after buyer completion and before a review exists', () => {
    expect(
      shouldPromptBuyerForReview({
        buyerMarkedComplete: true,
        hasExistingReview: false,
        promptCount: 0,
      }),
    ).toBe(true);
    expect(
      shouldPromptBuyerForReview({
        buyerMarkedComplete: true,
        hasExistingReview: true,
        promptCount: 0,
      }),
    ).toBe(false);
    expect(
      shouldPromptBuyerForReview({
        buyerMarkedComplete: false,
        hasExistingReview: false,
        promptCount: 0,
      }),
    ).toBe(false);
  });

  it('caps review prompts at two impressions per request', () => {
    expect(
      shouldPromptBuyerForReview({
        buyerMarkedComplete: true,
        hasExistingReview: false,
        promptCount: 1,
      }),
    ).toBe(true);

    expect(
      shouldPromptBuyerForReview({
        buyerMarkedComplete: true,
        hasExistingReview: false,
        promptCount: 2,
      }),
    ).toBe(false);
  });

  it('suppresses review prompts when a review was already submitted locally', () => {
    expect(
      shouldPromptBuyerForReview({
        buyerMarkedComplete: true,
        hasExistingReview: false,
        promptCount: 0,
        hasLocalReviewSubmission: true,
      }),
    ).toBe(false);
  });

  it('builds a stable storage key per request', () => {
    expect(getBuyerReviewPromptStorageKey('req-123')).toBe('buyer-review-prompt-seen:req-123');
    expect(getBuyerReviewSubmittedStorageKey('req-123')).toBe('buyer-review-submitted:req-123');
  });

  it('tracks capped prompt impressions in local storage', () => {
    const storage = new Map<string, string>();
    const fakeStorage = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
    };

    expect(getBuyerReviewPromptCount(fakeStorage, 'req-123')).toBe(0);
    expect(incrementBuyerReviewPromptCount(fakeStorage, 'req-123')).toBe(1);
    expect(incrementBuyerReviewPromptCount(fakeStorage, 'req-123')).toBe(2);
    expect(incrementBuyerReviewPromptCount(fakeStorage, 'req-123')).toBe(2);
    expect(getBuyerReviewPromptCount(fakeStorage, 'req-123')).toBe(2);
  });

  it('treats legacy timestamp storage as one previous impression', () => {
    const fakeStorage = {
      getItem: () => '2026-03-26T12:00:00.000Z',
      setItem: () => undefined,
    };

    expect(getBuyerReviewPromptCount(fakeStorage, 'req-legacy')).toBe(1);
  });

  it('marks locally submitted reviews as permanently suppressed for that request', () => {
    const storage = new Map<string, string>();
    const fakeStorage = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
    };

    markBuyerReviewSubmitted(fakeStorage, 'req-123');

    expect(hasBuyerReviewBeenSubmittedLocally(fakeStorage, 'req-123')).toBe(true);
    expect(getBuyerReviewPromptCount(fakeStorage, 'req-123')).toBe(2);
  });
});
