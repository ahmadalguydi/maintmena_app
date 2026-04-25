import { describe, expect, it } from 'vitest';
import {
  getAutoSelectedVendorCategory,
  getStoredServiceLocation,
  getSuggestedScheduleDefaults,
  getSuggestedTimeForDate,
  inferBudgetRangeFromVendorServices,
} from './flowDefaults';

describe('flowDefaults', () => {
  it('parses a stored location safely', () => {
    expect(
      getStoredServiceLocation(
        JSON.stringify({
          city: 'Jeddah',
          address: 'Prince Naif St',
          lat: 21.54,
          lng: 39.17,
        }),
      ),
    ).toEqual({
      city: 'Jeddah',
      address: 'Prince Naif St',
      lat: 21.54,
      lng: 39.17,
    });
  });

  it('returns the next sensible same-day slot during the day', () => {
    expect(
      getSuggestedTimeForDate(
        new Date('2026-03-25T09:30:00'),
        new Date('2026-03-25T09:30:00'),
      ),
    ).toEqual({
      time24: '10:00',
      timeSlot: 'morning',
      bookingUrgency: 'urgent',
    });

    expect(
      getSuggestedTimeForDate(
        new Date('2026-03-25T16:00:00'),
        new Date('2026-03-25T16:00:00'),
      ),
    ).toEqual({
      time24: '18:00',
      timeSlot: 'evening',
      bookingUrgency: 'urgent',
    });
  });

  it('moves the default schedule to tomorrow late in the evening', () => {
    const suggested = getSuggestedScheduleDefaults(new Date('2026-03-25T21:15:00'));
    expect(suggested.bookingDateValue).toBe('2026-03-26');
    expect(suggested.time24).toBe('10:00');
    expect(suggested.timeSlot).toBe('morning');
    expect(suggested.bookingUrgency).toBe('normal');
  });

  it('auto-selects the only vendor category when obvious', () => {
    expect(getAutoSelectedVendorCategory([{ key: 'plumbing' }])).toBe('plumbing');
    expect(getAutoSelectedVendorCategory([{ key: 'plumbing' }, { key: 'electrical' }])).toBe('');
  });

  it('infers a budget bucket from vendor pricing', () => {
    expect(
      inferBudgetRangeFromVendorServices(
        [
          { category: 'plumbing', price: 180 },
          { category: 'electrical', price: 520 },
        ],
        'electrical',
      ),
    ).toBe('500_1000');

    expect(
      inferBudgetRangeFromVendorServices([{ category: 'plumbing', price: 80 }], null),
    ).toBe('under_100');
  });
});
