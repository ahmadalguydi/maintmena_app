const ACTIVE_SOON_WINDOW_MS = 30 * 60 * 1000;

export type CanonicalRequestLifecycle =
  | 'draft'
  | 'submitted'
  | 'dispatching'
  | 'no_seller_found'
  | 'seller_assigned'
  | 'scheduled_confirmed'
  | 'in_route'
  | 'in_progress'
  | 'seller_marked_complete'
  | 'buyer_confirmed'
  | 'disputed'
  | 'closed'
  | 'cancelled';

export type CanonicalTimingMode = 'asap' | 'scheduled';

export type CanonicalPricingState = 'none' | 'pending_approval' | 'approved';

export type CanonicalReviewState = 'not_eligible' | 'pending' | 'submitted';

export type CanonicalProgressSignal = 'arrived' | null;

export interface CanonicalRequestRow {
  id: string;
  title?: string | null;
  description?: string | null;
  category?: string | null;
  status?: string | null;
  lifecycle_state?: string | null;
  urgency?: string | null;
  preferred_start_date?: string | null;
  scheduled_for?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  buyer_id?: string | null;
  assigned_seller_id?: string | null;
  location?: string | null;
  city?: string | null;
  location_address?: string | null;
  location_city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  lat?: number | null;
  lng?: number | null;
  location_lat?: number | null;
  location_lng?: number | null;
  budget?: number | null;
  seller_pricing?: unknown;
  final_amount?: number | null;
  seller_marked_complete?: boolean | null;
  buyer_marked_complete?: boolean | null;
  buyer_price_approved?: boolean | null;
  job_completion_code?: string | null;
}

const hasSellerCompletionArtifacts = (
  row?: Pick<CanonicalRequestRow, 'seller_marked_complete' | 'final_amount' | 'job_completion_code'> | null,
) =>
  Boolean(
    row?.seller_marked_complete ||
      (typeof row?.final_amount === 'number' && Number.isFinite(row.final_amount) && row.final_amount > 0) ||
      row?.job_completion_code,
  );

export interface CanonicalRequest extends CanonicalRequestRow {
  lifecycle: CanonicalRequestLifecycle;
  scheduledFor: string | null;
  timingMode: CanonicalTimingMode;
  providerAssignment: 'unassigned' | 'assigned';
  completionState:
    | 'none'
    | 'seller_marked_complete'
    | 'buyer_confirmed'
    | 'closed'
    | 'cancelled';
  pricingState: CanonicalPricingState;
  reviewState: CanonicalReviewState;
  progressSignal: CanonicalProgressSignal;
}

export interface CanonicalRequestTimelineStep {
  key: 'seller_assigned' | 'in_route' | 'in_progress' | 'seller_marked_complete' | 'closed';
  status: 'future' | 'current' | 'completed';
}

export interface RequestActionAvailability {
  canEdit: boolean;
  canCancel: boolean;
  canMessage: boolean;
  canApprovePrice: boolean;
  canReview: boolean;
  canStartTravel: boolean;
  canMarkArrived: boolean;
  canStartWork: boolean;
  canComplete: boolean;
  canEditPrice: boolean;
}

export type BuyerRequestPresentationStatus =
  | 'matching'
  | 'no_seller_found'
  | 'accepted'
  | 'on_the_way'
  | 'arrived'
  | 'in_progress'
  | 'awaiting_approval'
  | 'completed'
  | 'confirmed'
  | 'cancelled';

const CANONICAL_LIFECYCLES = new Set<CanonicalRequestLifecycle>([
  'draft',
  'submitted',
  'dispatching',
  'no_seller_found',
  'seller_assigned',
  'scheduled_confirmed',
  'in_route',
  'in_progress',
  'seller_marked_complete',
  'buyer_confirmed',
  'disputed',
  'closed',
  'cancelled',
]);

const OPEN_REQUEST_STATUSES = new Set(['draft', 'submitted', 'open', 'matching', 'dispatching']);
const LEGACY_ACTIVE_REQUEST_STATUSES = new Set(['accepted', 'en_route', 'arrived', 'in_progress']);
const TERMINAL_REQUEST_STATUSES = new Set(['cancelled', 'completed', 'confirmed', 'closed']);

const isFiniteCoordinate = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const normalizeLocationParts = (value?: string | null) => {
  if (typeof value !== 'string') return [];

  const seen = new Set<string>();

  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => {
      const key = part.toLocaleLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

const mergeLocationParts = (...groups: string[][]) => {
  const seen = new Set<string>();
  const merged: string[] = [];

  for (const group of groups) {
    for (const part of group) {
      const key = part.toLocaleLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(part);
    }
  }

  return merged.join(', ');
};

const parseRequestDate = (value?: string | Date | null) => {
  if (!value) return null;

  const timestamp = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
};

const normalizeRawStatus = (row?: Pick<CanonicalRequestRow, 'status' | 'lifecycle_state'> | null) => {
  const lifecycleState = row?.lifecycle_state?.trim().toLocaleLowerCase();
  if (lifecycleState && CANONICAL_LIFECYCLES.has(lifecycleState as CanonicalRequestLifecycle)) {
    return lifecycleState;
  }

  return row?.status?.trim().toLocaleLowerCase() ?? null;
};

export const getRequestScheduledFor = (
  row?: Pick<CanonicalRequestRow, 'scheduled_for' | 'preferred_start_date' | 'created_at'> | null,
) => row?.scheduled_for ?? row?.preferred_start_date ?? row?.created_at ?? null;

export const shouldTreatAcceptedRequestAsActive = (
  scheduledFor?: string | Date | null,
  now = Date.now(),
) => {
  const scheduledStart = parseRequestDate(scheduledFor);
  if (!scheduledStart) return true;
  return scheduledStart - now <= ACTIVE_SOON_WINDOW_MS;
};

export const isFutureScheduledRequest = (
  scheduledFor?: string | Date | null,
  now = Date.now(),
) => {
  const scheduledStart = parseRequestDate(scheduledFor);
  if (!scheduledStart) return false;
  return scheduledStart - now > ACTIVE_SOON_WINDOW_MS;
};

export const requestTimingMode = (
  urgency?: string | null,
  scheduledFor?: string | null,
): CanonicalTimingMode => {
  if (urgency === 'high' || urgency === 'emergency' || urgency === 'urgent') {
    return 'asap';
  }

  return scheduledFor ? 'scheduled' : 'asap';
};

export const getCanonicalLifecycle = (
  row?: CanonicalRequestRow | null,
  now = Date.now(),
): CanonicalRequestLifecycle => {
  const rawStatus = normalizeRawStatus(row);
  const scheduledFor = getRequestScheduledFor(row);

  if (rawStatus && CANONICAL_LIFECYCLES.has(rawStatus as CanonicalRequestLifecycle)) {
    return rawStatus as CanonicalRequestLifecycle;
  }

  if (rawStatus === 'cancelled') return 'cancelled';
  if (rawStatus === 'disputed') return 'disputed';
  // closed/completed must be checked BEFORE buyer_marked_complete to prevent stale flag override
  if (rawStatus === 'closed' || rawStatus === 'completed' || rawStatus === 'confirmed') return 'closed';
  if (row?.buyer_marked_complete || rawStatus === 'buyer_confirmed') return 'buyer_confirmed';
  if (hasSellerCompletionArtifacts(row)) return 'seller_marked_complete';
  if (rawStatus === 'in_progress') return 'in_progress';
  if (rawStatus === 'en_route' || rawStatus === 'arrived') return 'in_route';
  if (rawStatus === 'accepted') {
    return isFutureScheduledRequest(scheduledFor, now)
      ? 'scheduled_confirmed'
      : 'seller_assigned';
  }
  if (rawStatus === 'no_seller_found') return 'no_seller_found';
  if (rawStatus === 'submitted') return 'submitted';
  if (rawStatus === 'draft') return 'draft';
  return 'dispatching';
};

export const getCanonicalProgressSignal = (
  row?: Pick<CanonicalRequestRow, 'status'> | null,
): CanonicalProgressSignal =>
  row?.status?.trim().toLocaleLowerCase() === 'arrived' ? 'arrived' : null;

export const getCanonicalPricingState = (
  row?: Pick<CanonicalRequestRow, 'seller_marked_complete' | 'buyer_price_approved' | 'final_amount' | 'job_completion_code'> | null,
): CanonicalPricingState => {
  if (!hasSellerCompletionArtifacts(row)) return 'none';
  return row.buyer_price_approved ? 'approved' : 'pending_approval';
};

export const getCanonicalReviewState = (
  row?: Pick<CanonicalRequestRow, 'buyer_marked_complete'> | null,
  options?: { hasExistingReview?: boolean },
): CanonicalReviewState => {
  if (!row?.buyer_marked_complete) return 'not_eligible';
  return options?.hasExistingReview ? 'submitted' : 'pending';
};

export const toCanonicalRequest = (
  row?: CanonicalRequestRow | null,
  options?: { hasExistingReview?: boolean; now?: number },
): CanonicalRequest | null => {
  if (!row?.id) return null;

  const scheduledFor = getRequestScheduledFor(row);
  const lifecycle = getCanonicalLifecycle(row, options?.now);
  const pricingState = getCanonicalPricingState(row);

  let completionState: CanonicalRequest['completionState'] = 'none';
  if (lifecycle === 'cancelled') completionState = 'cancelled';
  else if (lifecycle === 'buyer_confirmed') completionState = 'buyer_confirmed';
  else if (lifecycle === 'closed') completionState = 'closed';
  else if (lifecycle === 'seller_marked_complete') completionState = 'seller_marked_complete';

  return {
    ...row,
    lifecycle,
    scheduledFor,
    timingMode: requestTimingMode(row.urgency, scheduledFor),
    providerAssignment: row.assigned_seller_id ? 'assigned' : 'unassigned',
    completionState,
    pricingState,
    reviewState: getCanonicalReviewState(row, options),
    progressSignal: getCanonicalProgressSignal(row),
  };
};

export const getAvailableBuyerActions = (
  request?: CanonicalRequest | null,
): RequestActionAvailability => {
  const lifecycle = request?.lifecycle;
  const hasAssignedProvider = request?.providerAssignment === 'assigned';
  const canReview = request?.reviewState === 'pending';

  return {
    canEdit: lifecycle === 'draft' || lifecycle === 'submitted' || lifecycle === 'dispatching',
    canCancel:
      lifecycle === 'submitted' ||
      lifecycle === 'dispatching' ||
      lifecycle === 'seller_assigned' ||
      lifecycle === 'scheduled_confirmed',
    canMessage: Boolean(hasAssignedProvider && lifecycle && !isRequestTerminal(lifecycle)),
    canApprovePrice: request?.pricingState === 'pending_approval',
    canReview,
    canStartTravel: false,
    canMarkArrived: false,
    canStartWork: false,
    canComplete: false,
    canEditPrice: false,
  };
};

export const getAvailableSellerActions = (
  request?: CanonicalRequest | null,
): RequestActionAvailability => {
  const lifecycle = request?.lifecycle;
  const inRoute = lifecycle === 'in_route';

  return {
    canEdit: false,
    canCancel: false,
    canMessage: Boolean(request?.providerAssignment === 'assigned' && lifecycle && !isRequestTerminal(lifecycle)),
    canApprovePrice: false,
    canReview: false,
    canStartTravel: lifecycle === 'seller_assigned' || lifecycle === 'scheduled_confirmed',
    canMarkArrived: inRoute && request?.progressSignal !== 'arrived',
    canStartWork: inRoute,
    canComplete: lifecycle === 'in_progress',
    canEditPrice:
      lifecycle === 'seller_assigned' ||
      lifecycle === 'scheduled_confirmed' ||
      lifecycle === 'in_route' ||
      lifecycle === 'in_progress',
  };
};

export const getRequestTimeline = (
  request?: CanonicalRequest | null,
): CanonicalRequestTimelineStep[] => {
  const lifecycle = request?.lifecycle;
  const progressSignal = request?.progressSignal;

  const steps: CanonicalRequestTimelineStep[] = [
    { key: 'seller_assigned', status: 'future' },
    { key: 'in_route', status: 'future' },
    { key: 'in_progress', status: 'future' },
    { key: 'seller_marked_complete', status: 'future' },
    { key: 'closed', status: 'future' },
  ];

  if (!lifecycle || lifecycle === 'draft' || lifecycle === 'submitted' || lifecycle === 'dispatching') {
    return steps;
  }

  steps[0].status = 'completed';

  if (lifecycle === 'scheduled_confirmed' || lifecycle === 'seller_assigned') {
    steps[1].status = 'current';
    return steps;
  }

  if (lifecycle === 'in_route') {
    steps[1].status = 'current';
    if (progressSignal === 'arrived') {
      steps[1].status = 'completed';
      steps[2].status = 'current';
    }
    return steps;
  }

  if (lifecycle === 'in_progress') {
    steps[1].status = 'completed';
    steps[2].status = 'current';
    return steps;
  }

  if (lifecycle === 'seller_marked_complete') {
    steps[1].status = 'completed';
    steps[2].status = 'completed';
    steps[3].status = 'current';
    return steps;
  }

  if (lifecycle === 'buyer_confirmed' || lifecycle === 'closed') {
    steps[1].status = 'completed';
    steps[2].status = 'completed';
    steps[3].status = 'completed';
    steps[4].status = 'completed';
    return steps;
  }

  if (lifecycle === 'cancelled' || lifecycle === 'no_seller_found' || lifecycle === 'disputed') {
    return steps;
  }

  return steps;
};

export const getBuyerRequestPresentationStatus = (
  request?: CanonicalRequest | null,
): BuyerRequestPresentationStatus => {
  if (!request) return 'matching';

  if (request.lifecycle === 'cancelled') return 'cancelled';
  if (request.lifecycle === 'no_seller_found') return 'no_seller_found';
  if (request.lifecycle === 'dispatching' || request.lifecycle === 'submitted' || request.lifecycle === 'draft') {
    return 'matching';
  }
  if (request.lifecycle === 'seller_assigned' || request.lifecycle === 'scheduled_confirmed') {
    return 'accepted';
  }
  if (request.lifecycle === 'in_route') {
    return request.progressSignal === 'arrived' ? 'arrived' : 'on_the_way';
  }
  if (request.lifecycle === 'in_progress') return 'in_progress';
  if (request.lifecycle === 'seller_marked_complete') return 'awaiting_approval';
  if (request.lifecycle === 'buyer_confirmed') return 'completed';
  if (request.lifecycle === 'closed') return 'confirmed';
  return 'matching';
};

export const isOpenRequestVisible = (status?: string | null) =>
  Boolean(status && OPEN_REQUEST_STATUSES.has(status));

export const isActiveRequestStatus = (status?: string | null) =>
  Boolean(status && LEGACY_ACTIVE_REQUEST_STATUSES.has(status));

export const isTerminalRequestStatus = (
  value?: string | CanonicalRequestLifecycle | null,
) => {
  if (!value) return false;
  if (CANONICAL_LIFECYCLES.has(value as CanonicalRequestLifecycle)) {
    return isRequestTerminal(value as CanonicalRequestLifecycle);
  }
  return TERMINAL_REQUEST_STATUSES.has(value);
};

export const isRequestTerminal = (lifecycle?: CanonicalRequestLifecycle | null) =>
  lifecycle === 'cancelled' ||
  lifecycle === 'buyer_confirmed' ||
  lifecycle === 'closed' ||
  lifecycle === 'disputed' ||
  lifecycle === 'no_seller_found';

export const isReviewEligible = (request?: CanonicalRequest | null) =>
  request?.reviewState === 'pending';

export const getRequestCoordinates = (
  request?: Pick<CanonicalRequestRow, 'latitude' | 'longitude' | 'lat' | 'lng' | 'location_lat' | 'location_lng'> | null,
) => {
  if (!request) return null;

  const latitude = request.latitude ?? request.lat ?? request.location_lat;
  const longitude = request.longitude ?? request.lng ?? request.location_lng;

  if (!isFiniteCoordinate(latitude) || !isFiniteCoordinate(longitude)) {
    return null;
  }

  return { lat: latitude, lng: longitude };
};

export const hasRequestCoordinates = (
  request?: Pick<CanonicalRequestRow, 'latitude' | 'longitude' | 'lat' | 'lng' | 'location_lat' | 'location_lng'> | null,
) => Boolean(getRequestCoordinates(request));

export const getRequestLocationLabel = (
  request?: Pick<CanonicalRequestRow, 'location' | 'city' | 'location_address' | 'location_city'> | null,
  fallback = 'Location unavailable',
) => {
  const addressParts = normalizeLocationParts(request?.location_address);
  const locationParts = normalizeLocationParts(request?.location);
  const cityParts = normalizeLocationParts(request?.location_city ?? request?.city);

  const prioritizedLabel = mergeLocationParts(
    addressParts.length ? addressParts : locationParts,
    cityParts,
  );

  if (prioritizedLabel) {
    return prioritizedLabel;
  }

  return fallback;
};

export const isDispatchOfferActionable = (
  offer?: {
    offer_status?: string | null;
    expires_at?: string | null;
  } | null,
  now = Date.now(),
) => {
  if (!offer?.offer_status) return false;
  if (!['sent', 'delivered', 'seen'].includes(offer.offer_status)) return false;

  if (!offer.expires_at) return true;

  const expiresAt = new Date(offer.expires_at).getTime();
  if (!Number.isFinite(expiresAt)) return true;

  return expiresAt > now;
};
