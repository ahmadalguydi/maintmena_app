import {
  getAvailableBuyerActions,
  getBuyerRequestPresentationStatus,
  getCanonicalLifecycle,
  getRequestCoordinates,
  getRequestLocationLabel,
  getRequestScheduledFor,
  getRequestTimeline,
  isDispatchOfferActionable,
  isFutureScheduledRequest,
  isOpenRequestVisible,
  isReviewEligible,
  isTerminalRequestStatus,
  shouldTreatAcceptedRequestAsActive,
  toCanonicalRequest,
} from './maintenanceRequest';

describe('maintenanceRequest helpers', () => {
  it('treats accepted requests without a schedule as active', () => {
    expect(shouldTreatAcceptedRequestAsActive(null, Date.now())).toBe(true);
  });

  it('keeps far future accepted requests out of mission mode', () => {
    const now = new Date('2026-03-25T10:00:00.000Z').getTime();
    expect(shouldTreatAcceptedRequestAsActive('2026-03-25T12:00:01.000Z', now)).toBe(false);
    expect(isFutureScheduledRequest('2026-03-25T12:00:01.000Z', now)).toBe(true);
  });

  it('returns null coordinates when the request has no valid position', () => {
    expect(getRequestCoordinates({ latitude: null, longitude: null })).toBeNull();
    expect(getRequestCoordinates({ lat: 21.5, lng: 39.1 })).toEqual({ lat: 21.5, lng: 39.1 });
    expect(getRequestCoordinates({ location_lat: 24.7136, location_lng: 46.6753 })).toEqual({ lat: 24.7136, lng: 46.6753 });
  });

  it('falls back to a neutral location label', () => {
    expect(getRequestLocationLabel({ location: '  ' }, 'Pending location')).toBe('Pending location');
    expect(getRequestLocationLabel({ location_city: 'Jeddah' }, 'Pending location')).toBe('Jeddah');
  });

  it('prefers the exact address over a coarse location label', () => {
    expect(
      getRequestLocationLabel({
        location: 'Mecca Region, Jeddah, Jeddah',
        location_address: 'Prince Naif Street, Al Shatea',
        location_city: 'Jeddah',
      }),
    ).toBe('Prince Naif Street, Al Shatea, Jeddah');
  });

  it('deduplicates repeated location segments', () => {
    expect(
      getRequestLocationLabel({
        location: 'Mecca Region, Jeddah, Jeddah',
      }),
    ).toBe('Mecca Region, Jeddah');
  });

  it('only exposes actionable dispatch offers', () => {
    const now = new Date('2026-03-25T10:00:00.000Z').getTime();
    expect(isDispatchOfferActionable({ offer_status: 'sent', expires_at: '2026-03-25T10:05:00.000Z' }, now)).toBe(true);
    expect(isDispatchOfferActionable({ offer_status: 'accepted', expires_at: '2026-03-25T10:05:00.000Z' }, now)).toBe(false);
    expect(isDispatchOfferActionable({ offer_status: 'sent', expires_at: '2026-03-25T09:59:59.000Z' }, now)).toBe(false);
  });

  it('exposes only open requests and recognizes terminal states', () => {
    expect(isOpenRequestVisible('open')).toBe(true);
    expect(isOpenRequestVisible('completed')).toBe(false);
    expect(isTerminalRequestStatus('cancelled')).toBe(true);
    expect(isTerminalRequestStatus('in_progress')).toBe(false);
  });

  it('maps legacy accepted requests into scheduled or active lifecycle states', () => {
    const now = new Date('2026-03-25T10:00:00.000Z').getTime();

    expect(
      getCanonicalLifecycle({ id: '1', status: 'accepted', preferred_start_date: '2026-03-25T12:00:01.000Z' }, now),
    ).toBe('scheduled_confirmed');

    expect(
      getCanonicalLifecycle({ id: '2', status: 'accepted', preferred_start_date: '2026-03-25T10:05:00.000Z' }, now),
    ).toBe('seller_assigned');
  });

  it('prefers canonical completion states over raw statuses', () => {
    expect(
      getCanonicalLifecycle({ id: '1', status: 'completed', seller_marked_complete: true }),
    ).toBe('seller_marked_complete');
    expect(
      getCanonicalLifecycle({ id: '2', status: 'completed', buyer_marked_complete: true }),
    ).toBe('buyer_confirmed');
  });

  it('normalizes scheduledFor through the compatibility adapter', () => {
    expect(getRequestScheduledFor({
      scheduled_for: '2026-03-26T08:00:00.000Z',
      preferred_start_date: '2026-03-25T08:00:00.000Z',
    })).toBe('2026-03-26T08:00:00.000Z');

    expect(getRequestScheduledFor({
      preferred_start_date: '2026-03-25T08:00:00.000Z',
      created_at: '2026-03-25T07:00:00.000Z',
    })).toBe('2026-03-25T08:00:00.000Z');
  });

  it('derives buyer-facing actions and review eligibility from the canonical request', () => {
    const request = toCanonicalRequest({
      id: '1',
      status: 'completed',
      seller_marked_complete: true,
      buyer_marked_complete: true,
      assigned_seller_id: 'seller-1',
      preferred_start_date: '2026-03-25T08:00:00.000Z',
    });

    expect(request?.lifecycle).toBe('buyer_confirmed');
    expect(isReviewEligible(request)).toBe(true);
    expect(getAvailableBuyerActions(request).canReview).toBe(true);
    expect(getBuyerRequestPresentationStatus(request)).toBe('completed');
  });

  it('derives a canonical timeline from the request lifecycle', () => {
    const request = toCanonicalRequest({
      id: '1',
      status: 'arrived',
      assigned_seller_id: 'seller-1',
      preferred_start_date: '2026-03-25T08:00:00.000Z',
    });

    expect(getRequestTimeline(request)).toEqual([
      { key: 'seller_assigned', status: 'completed' },
      { key: 'in_route', status: 'completed' },
      { key: 'in_progress', status: 'current' },
      { key: 'seller_marked_complete', status: 'future' },
      { key: 'closed', status: 'future' },
    ]);
  });
});
