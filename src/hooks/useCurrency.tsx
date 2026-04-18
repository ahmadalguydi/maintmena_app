import { createContext, useContext, ReactNode } from 'react';
import { getLanguage } from '@/lib/preferences';

type Currency = 'SAR';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => Promise<void>;
  convertAmount: (amount: number | null | undefined, fromCurrency?: Currency) => number;
  formatAmount: (
    amount: number | null | undefined,
    fromCurrency?: Currency,
    fractionDigits?: number,
  ) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const getSarLabel = () => (getLanguage() === 'ar' ? 'ر.س' : 'SAR');

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const currency: Currency = 'SAR';

  const setCurrency = async (_currency: Currency) => {
    localStorage.setItem('preferred_currency', currency);
  };

  const convertAmount = (amount: number | null | undefined, _fromCurrency: Currency = 'SAR') => {
    if (!amount) return 0;
    return amount;
  };

  const formatAmount = (
    amount: number | null | undefined,
    fromCurrency: Currency = 'SAR',
    fractionDigits = 0,
  ) => {
    const converted = convertAmount(amount, fromCurrency);
    return `${new Intl.NumberFormat('en-US', {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(converted)} ${getSarLabel()}`;
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
