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
  promptCount?: number;
  hasLocalReviewSubmission?: boolean;
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export const getBuyerReviewPromptStorageKey = (requestId: string) =>
  `buyer-review-prompt-seen:${requestId}`;

export const getBuyerReviewSubmittedStorageKey = (requestId: string) =>
  `buyer-review-submitted:${requestId}`;

export const getBuyerReviewPromptCount = (
  storage: StorageLike | null | undefined,
  requestId: string,
) => {
  const rawValue = storage?.getItem(getBuyerReviewPromptStorageKey(requestId));
  if (!rawValue) return 0;

  const isCountValue = /^\d+$/.test(rawValue);
  const parsedCount = isCountValue ? Number.parseInt(rawValue, 10) : Number.NaN;
  if (Number.isFinite(parsedCount) && parsedCount >= 0) {
    return parsedCount;
  }

  // Backward compatibility: older builds stored an ISO timestamp instead of a count.
  return 1;
};

export const incrementBuyerReviewPromptCount = (
  storage: StorageLike | null | undefined,
  requestId: string,
) => {
  const nextCount = Math.min(getBuyerReviewPromptCount(storage, requestId) + 1, 2);
  storage?.setItem(getBuyerReviewPromptStorageKey(requestId), String(nextCount));
  return nextCount;
};

export const hasBuyerReviewBeenSubmittedLocally = (
  storage: StorageLike | null | undefined,
  requestId: string,
) => Boolean(storage?.getItem(getBuyerReviewSubmittedStorageKey(requestId)));

export const markBuyerReviewSubmitted = (
  storage: StorageLike | null | undefined,
  requestId: string,
) => {
  storage?.setItem(getBuyerReviewSubmittedStorageKey(requestId), '1');
  storage?.setItem(getBuyerReviewPromptStorageKey(requestId), '2');
};

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
  promptCount = 0,
  hasLocalReviewSubmission = false,
}: BuyerReviewPromptInput) =>
  Boolean(buyerMarkedComplete) &&
  !hasExistingReview &&
  !hasLocalReviewSubmission &&
  promptCount < 2;
