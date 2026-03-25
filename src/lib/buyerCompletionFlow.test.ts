import { describe, expect, it } from 'vitest';

import {
  getBuyerReviewPromptStorageKey,
  shouldPromptBuyerForReview,
  shouldShowBuyerRequestOnHome,
} from './buyerCompletionFlow';

describe('buyerCompletionFlow', () => {
  it('hides buyer-home request summaries once the buyer has marked the job complete', () => {
    expect(shouldShowBuyerRequestOnHome({ buyer_marked_complete: false })).toBe(true);
    expect(shouldShowBuyerRequestOnHome({ buyer_marked_complete: true })).toBe(false);
  });

  it('prompts for a review only after buyer completion and before a review exists', () => {
    expect(
      shouldPromptBuyerForReview({ buyerMarkedComplete: true, hasExistingReview: false }),
    ).toBe(true);
    expect(
      shouldPromptBuyerForReview({ buyerMarkedComplete: true, hasExistingReview: true }),
    ).toBe(false);
    expect(
      shouldPromptBuyerForReview({ buyerMarkedComplete: false, hasExistingReview: false }),
    ).toBe(false);
  });

  it('builds a stable storage key per request', () => {
    expect(getBuyerReviewPromptStorageKey('req-123')).toBe('buyer-review-prompt-seen:req-123');
  });
});
