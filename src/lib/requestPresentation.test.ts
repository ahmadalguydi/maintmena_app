import { describe, expect, it } from 'vitest';
import {
  getRequestPriceDisplay,
  getRequestStatusUpdateDisplay,
  parseRequestPrice,
} from './requestPresentation';

const formatAmount = (amount: number | null | undefined) =>
  typeof amount === 'number' ? `${amount} SAR` : '0 SAR';

describe('parseRequestPrice', () => {
  it('prefers final amount when present', () => {
    expect(parseRequestPrice({ type: 'fixed', fixedPrice: 120 }, 180)).toEqual({
      kind: 'final',
      finalAmount: 180,
    });
  });

  it('parses fixed and range pricing', () => {
    expect(parseRequestPrice(JSON.stringify({ type: 'fixed', fixedPrice: 120 }), null)).toEqual({
      kind: 'fixed',
      fixedPrice: 120,
    });

    expect(parseRequestPrice({ type: 'range', minPrice: 50, maxPrice: 120 }, null)).toEqual({
      kind: 'range',
      minPrice: 50,
      maxPrice: 120,
    });
  });

  it('handles inspection and invalid payloads', () => {
    expect(parseRequestPrice({ type: 'inspection' }, null)).toEqual({ kind: 'inspection' });
    expect(parseRequestPrice('not-json', null)).toEqual({ kind: 'none' });
  });
});

describe('getRequestPriceDisplay', () => {
  it('builds clear copy for range pricing', () => {
    const display = getRequestPriceDisplay(
      { kind: 'range', minPrice: 50, maxPrice: 120 },
      { currentLanguage: 'en', formatAmount },
    );

    expect(display).toMatchObject({
      eyebrow: 'Expected range',
      title: '50 SAR - 120 SAR',
      emphasis: 'brand',
    });
  });
});

describe('getRequestStatusUpdateDisplay', () => {
  it('returns contextual milestone copy', () => {
    expect(getRequestStatusUpdateDisplay('arrived', 'en', 'Test Seller')).toMatchObject({
      title: 'Provider arrived',
      accent: 'blue',
    });

    expect(getRequestStatusUpdateDisplay('accepted', 'ar', 'فني الاختبار')).toMatchObject({
      accent: 'emerald',
    });
  });
});
