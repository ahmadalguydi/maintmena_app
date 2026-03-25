import { describe, expect, it } from 'vitest';
import {
  findExistingSellerReview,
  getReviewPromptChips,
  getReviewSentiment,
  isSellerReviewsUnavailableError,
  isReviewEligible,
  normalizeReviewText,
} from './reviewFlow';

describe('reviewFlow helpers', () => {
  it('allows reviews once buyer completion is confirmed regardless of status wording', () => {
    expect(isReviewEligible('in_progress', true)).toBe(true);
    expect(isReviewEligible('completed', false)).toBe(true);
    expect(isReviewEligible('closed', false)).toBe(true);
  });

  it('blocks reviews for incomplete jobs without buyer confirmation', () => {
    expect(isReviewEligible('submitted', false)).toBe(false);
    expect(isReviewEligible('dispatching', false)).toBe(false);
  });

  it('normalizes empty review text to null', () => {
    expect(normalizeReviewText('   ')).toBeNull();
    expect(normalizeReviewText('  Clear communication  ')).toBe('Clear communication');
  });

  it('returns prompt chips only for active rating bands', () => {
    expect(getReviewPromptChips(0, 'en')).toEqual([]);
    expect(getReviewPromptChips(5, 'en')).toContain('Would book again');
    expect(getReviewPromptChips(4, 'ar')).toContain('وصل في الوقت');
  });

  it('returns sentiment copy aligned to the rating', () => {
    expect(getReviewSentiment(1, 'en').title).toBe('Something went wrong');
    expect(getReviewSentiment(5, 'en').title).toBe('Excellent experience');
    expect(getReviewSentiment(3, 'ar').title).toBe('التجربة جيدة إجمالاً');
  });

  it('treats missing seller_reviews relation as optional', () => {
    expect(
      isSellerReviewsUnavailableError({
        status: 404,
        message: "Could not find the table 'public.seller_reviews' in the schema cache",
      }),
    ).toBe(true);
  });

  it('returns null when review lookup hits a missing seller_reviews relation', async () => {
    const client = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                order: () => ({
                  limit: async () => ({
                    data: null,
                    error: {
                      status: 404,
                      code: 'PGRST205',
                      message: "Could not find the table 'public.seller_reviews' in the schema cache",
                    },
                  }),
                }),
              }),
            }),
          }),
        }),
      }),
    };

    await expect(
      findExistingSellerReview({
        client,
        buyerId: 'buyer-1',
        sellerId: 'seller-1',
        requestId: 'request-1',
      }),
    ).resolves.toBeNull();
  });
});
