export interface BuyerHomeVisibilityInput {
  buyer_marked_complete?: boolean | null;
}

export interface BuyerReviewPromptInput {
  buyerMarkedComplete?: boolean | null;
  hasExistingReview?: boolean;
}

export const getBuyerReviewPromptStorageKey = (requestId: string) =>
  `buyer-review-prompt-seen:${requestId}`;

export const shouldShowBuyerRequestOnHome = (
  request: BuyerHomeVisibilityInput,
) => !Boolean(request.buyer_marked_complete);

export const shouldPromptBuyerForReview = ({
  buyerMarkedComplete,
  hasExistingReview = false,
}: BuyerReviewPromptInput) => Boolean(buyerMarkedComplete) && !hasExistingReview;
