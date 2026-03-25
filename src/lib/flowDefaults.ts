export interface StoredServiceLocation {
  city: string;
  address: string;
  lat: number | null;
  lng: number | null;
}

type VendorService = {
  category?: string;
  serviceType?: string;
  available?: boolean;
  price?: number | string | null;
};

type SuggestedTimeSlot = 'morning' | 'afternoon' | 'evening';
type BookingUrgency = 'urgent' | 'normal' | 'flexible';

export interface SuggestedScheduleDefaults {
  date: Date;
  time24: string;
  timeSlot: SuggestedTimeSlot;
  bookingDateValue: string;
  bookingUrgency: BookingUrgency;
}

const pad = (value: number) => String(value).padStart(2, '0');

const toDateInputValue = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const isSameCalendarDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

export const getStoredServiceLocation = (
  rawValue?: string | null,
): StoredServiceLocation | null => {
  if (!rawValue) return null;

  try {
    const parsed = JSON.parse(rawValue);
    if (!parsed || typeof parsed !== 'object') return null;

    const lat =
      typeof parsed.lat === 'number' && Number.isFinite(parsed.lat)
        ? parsed.lat
        : null;
    const lng =
      typeof parsed.lng === 'number' && Number.isFinite(parsed.lng)
        ? parsed.lng
        : null;

    const city = typeof parsed.city === 'string' ? parsed.city : '';
    const address = typeof parsed.address === 'string' ? parsed.address : '';

    if (!city && !address && lat === null && lng === null) {
      return null;
    }

    return { city, address, lat, lng };
  } catch {
    return null;
  }
};

export const getSuggestedTimeForDate = (
  targetDate: Date,
  now = new Date(),
): Pick<SuggestedScheduleDefaults, 'time24' | 'timeSlot' | 'bookingUrgency'> => {
  if (!isSameCalendarDay(targetDate, now)) {
    return {
      time24: '10:00',
      timeSlot: 'morning',
      bookingUrgency: 'normal',
    };
  }

  const currentHour = now.getHours();

  if (currentHour < 11) {
    return {
      time24: '10:00',
      timeSlot: 'morning',
      bookingUrgency: 'urgent',
    };
  }

  if (currentHour < 15) {
    return {
      time24: '14:00',
      timeSlot: 'afternoon',
      bookingUrgency: 'urgent',
    };
  }

  if (currentHour < 19) {
    return {
      time24: '18:00',
      timeSlot: 'evening',
      bookingUrgency: 'urgent',
    };
  }

  return {
    time24: '10:00',
    timeSlot: 'morning',
    bookingUrgency: 'normal',
  };
};

export const getSuggestedScheduleDefaults = (
  now = new Date(),
): SuggestedScheduleDefaults => {
  const currentHour = now.getHours();
  const date = new Date(now);

  if (currentHour >= 19) {
    date.setDate(date.getDate() + 1);
  }

  const timeSuggestion = getSuggestedTimeForDate(date, now);

  return {
    date,
    ...timeSuggestion,
    bookingDateValue: toDateInputValue(date),
  };
};

export const getAutoSelectedVendorCategory = (
  vendorCategories: Array<{ key: string }>,
) => (vendorCategories.length === 1 ? vendorCategories[0].key : '');

const toBudgetBucket = (price?: number | null) => {
  if (!price || !Number.isFinite(price)) return '';
  if (price < 100) return 'under_100';
  if (price < 250) return '100_250';
  if (price < 500) return '250_500';
  if (price < 1000) return '500_1000';
  if (price < 2500) return '1000_2500';
  if (price < 5000) return '2500_5000';
  if (price < 10000) return '5000_10000';
  return 'over_10000';
};

export const inferBudgetRangeFromVendorServices = (
  vendorServices: VendorService[],
  selectedCategory?: string | null,
) => {
  const normalizedCategory = selectedCategory?.toLowerCase() ?? '';
  const matchingService =
    vendorServices.find((service) => {
      const serviceCategory = (service.category || service.serviceType || '').toLowerCase();
      return normalizedCategory && serviceCategory === normalizedCategory;
    }) ??
    (vendorServices.length === 1 ? vendorServices[0] : null);

  if (!matchingService) return '';

  const rawPrice =
    typeof matchingService.price === 'string'
      ? Number(matchingService.price)
      : matchingService.price;

  return toBudgetBucket(rawPrice ?? null);
};
