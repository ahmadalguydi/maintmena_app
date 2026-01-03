import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

type Currency = 'USD' | 'SAR' | 'AED' | 'KWD';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => Promise<void>;
  convertAmount: (amount: number | null | undefined, fromCurrency?: Currency) => number;
  formatAmount: (amount: number | null | undefined, fromCurrency?: Currency, fractionDigits?: number) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

// Conversion rates to USD (approximate market rates)
const EXCHANGE_RATES: Record<Currency, number> = {
  USD: 1,
  SAR: 3.75,    // Saudi Riyal
  AED: 3.67,    // UAE Dirham
  KWD: 0.31,    // Kuwaiti Dinar
};

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: '$',
  SAR: 'SAR',
  AED: 'AED',
  KWD: 'KWD',
};

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [currency, setCurrencyState] = useState<Currency>(() => {
    // Check localStorage first, default to SAR
    const stored = localStorage.getItem('preferred_currency');
    return (stored as Currency) || 'SAR';
  });

  useEffect(() => {
    if (user) {
      loadUserCurrency();
    }
  }, [user]);

  const loadUserCurrency = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('user_preferences')
      .select('preferred_currency')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data?.preferred_currency) {
      const newCurrency = data.preferred_currency as Currency;
      setCurrencyState(newCurrency);
      localStorage.setItem('preferred_currency', newCurrency);
    } else {
      // User has no preference set, persist SAR as default
      localStorage.setItem('preferred_currency', 'SAR');
    }
  };

  const setCurrency = async (newCurrency: Currency) => {
    setCurrencyState(newCurrency);
    localStorage.setItem('preferred_currency', newCurrency);

    if (!user) return;

    // Create or update user preference
    const { data: existing } = await supabase
      .from('user_preferences')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('user_preferences')
        .update({ preferred_currency: newCurrency })
        .eq('user_id', user.id);
    } else {
      await supabase
        .from('user_preferences')
        .insert({ user_id: user.id, preferred_currency: newCurrency });
    }
  };

  const convertAmount = (amount: number | null | undefined, fromCurrency: Currency = 'SAR'): number => {
    if (!amount) return 0;

    // If viewing currency matches storage currency, no conversion needed
    if (fromCurrency === currency) return amount;

    // Convert to USD first, then to target currency
    const amountInUSD = amount / EXCHANGE_RATES[fromCurrency];
    const convertedAmount = amountInUSD * EXCHANGE_RATES[currency];

    // Round to 2 decimal places max, or whole numbers for non-USD
    if (currency === 'USD') {
      return Math.round(convertedAmount * 100) / 100;
    }
    return Math.round(convertedAmount);
  };

  const formatAmount = (amount: number | null | undefined, fromCurrency: Currency = 'SAR', fractionDigits: number = 0): string => {
    if (!amount) {
      // Respect precision even for zero
      const zeroStr = fractionDigits > 0 ? (0).toFixed(fractionDigits) : '0';
      return currency === 'USD'
        ? `$${zeroStr}`
        : `${zeroStr} ${CURRENCY_SYMBOLS[currency]}`;
    }

    const converted = convertAmount(amount, fromCurrency);
    const symbol = CURRENCY_SYMBOLS[currency];

    // Always use English/Latin numerals (en-US locale)
    if (currency === 'USD') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
      }).format(converted);
    } else {
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
      }).format(converted) + ' ' + symbol;
    }
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, convertAmount, formatAmount }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};
