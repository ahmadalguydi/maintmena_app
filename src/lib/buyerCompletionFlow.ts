import { isTerminalRequestStatus } from './maintenanceRequest';

export interface BuyerHomeVisibilityInput {
  buyer_marked_complete?: boolean | null;
  status?: string | null;
  lifecycle?: string | null;
  completionState?: 'none' | 'seller_marked_complete' | 'buyer_confirmed' | 'closed' | 'cancelled' | null;
}

export interface BuyerReviewPromptInput {
  buyerMarkedComplete?: boolean | null;
  hasExistingReview?: boolean;
}

export const getBuyerReviewPromptStorageKey = (requestId: string) =>
  `buyer-review-prompt-seen:${requestId}`;

export const shouldShowBuyerRequestOnHome = (
  request: BuyerHomeVisibilityInput,
) => {
  if (request.buyer_marked_complete) return false;
  if (request.completionState === 'buyer_confirmed' || request.completionState === 'closed' || request.completionState === 'cancelled') {
    return false;
  }

  return !isTerminalRequestStatus(request.lifecycle ?? request.status);
};

export const shouldPromptBuyerForReview = ({
  buyerMarkedComplete,
  hasExistingReview = false,
}: BuyerReviewPromptInput) => Boolean(buyerMarkedComplete) && !hasExistingReview;
