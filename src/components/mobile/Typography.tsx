import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface TypographyProps {
  children: ReactNode;
  className?: string;
  lang?: 'en' | 'ar';
}

export const Heading1 = ({ children, className, lang }: TypographyProps) => {
  const isArabic = lang === 'ar' || (typeof children === 'string' && /[\u0600-\u06FF]/.test(children));
  return (
    <h1 className={cn(
      'text-3xl md:text-4xl font-bold tracking-tight',
      isArabic ? 'font-ar-display' : 'font-display',
      className
    )}>
      {children}
    </h1>
  );
};

export const Heading2 = ({ children, className, lang }: TypographyProps) => {
  const isArabic = lang === 'ar' || (typeof children === 'string' && /[\u0600-\u06FF]/.test(children));
  return (
    <h2 className={cn(
      'text-2xl md:text-3xl font-bold tracking-tight',
      isArabic ? 'font-ar-display' : 'font-display',
      className
    )}>
      {children}
    </h2>
  );
};

export const Heading3 = ({ children, className, lang }: TypographyProps) => {
  const isArabic = lang === 'ar' || (typeof children === 'string' && /[\u0600-\u06FF]/.test(children));
  return (
    <h3 className={cn(
      'text-xl md:text-2xl font-semibold tracking-tight',
      isArabic ? 'font-ar-display' : 'font-display',
      className
    )}>
      {children}
    </h3>
  );
};

export const Body = ({ children, className, lang }: TypographyProps) => {
  const isArabic = lang === 'ar' || (typeof children === 'string' && /[\u0600-\u06FF]/.test(children));
  return (
    <p className={cn(
      'text-base leading-relaxed',
      isArabic ? 'font-ar-body' : 'font-body',
      className
    )}>
      {children}
    </p>
  );
};

export const BodySmall = ({ children, className, lang }: TypographyProps) => {
  const isArabic = lang === 'ar' || (typeof children === 'string' && /[\u0600-\u06FF]/.test(children));
  return (
    <p className={cn(
      'text-sm leading-relaxed',
      isArabic ? 'font-ar-body' : 'font-body',
      className
    )}>
      {children}
    </p>
  );
};

export const Caption = ({ children, className, lang }: TypographyProps) => {
  const isArabic = lang === 'ar' || (typeof children === 'string' && /[\u0600-\u06FF]/.test(children));
  return (
    <span className={cn(
      'text-xs',
      isArabic ? 'font-ar-body' : 'font-body',
      className
    )}>
      {children}
    </span>
  );
};

export const Label = ({ children, className, lang }: TypographyProps) => {
  const isArabic = lang === 'ar' || (typeof children === 'string' && /[\u0600-\u06FF]/.test(children));
  return (
    <label className={cn(
      'text-sm font-medium',
      isArabic ? 'font-ar-body' : 'font-body',
      className
    )}>
      {children}
    </label>
  );
};
