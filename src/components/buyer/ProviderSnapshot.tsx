import { Phone, ShieldCheck, Star, BriefcaseBusiness } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProviderSnapshotProps {
  currentLanguage: 'en' | 'ar';
  providerName?: string | null;
  providerCompany?: string | null;
  providerAvatar?: string | null;
  providerPhone?: string | null;
  providerRating?: number | null;
  providerVerified?: boolean | null;
  yearsOfExperience?: number | null;
  statusLabel?: string;
  compact?: boolean;
  className?: string;
}

export const ProviderSnapshot = ({
  currentLanguage,
  providerName,
  providerCompany,
  providerAvatar,
  providerPhone,
  providerRating,
  providerVerified,
  yearsOfExperience,
  statusLabel,
  compact = false,
  className,
}: ProviderSnapshotProps) => {
  const isArabic = currentLanguage === 'ar';
  const displayName =
    providerCompany || providerName || (isArabic ? 'مقدم الخدمة' : 'Service Provider');
  const secondaryName =
    providerCompany && providerName && providerCompany !== providerName ? providerName : null;

  const metaItems = [
    providerVerified
      ? isArabic
        ? 'موثّق'
        : 'Verified'
      : null,
    typeof providerRating === 'number' && providerRating > 0
      ? `${providerRating.toFixed(1)} ${isArabic ? 'تقييم' : 'rating'}`
      : null,
    typeof yearsOfExperience === 'number' && yearsOfExperience > 0
      ? isArabic
        ? `${yearsOfExperience} سنة خبرة`
        : `${yearsOfExperience} yrs experience`
      : null,
  ].filter(Boolean) as string[];

  return (
    <div
      className={cn(
        'rounded-[26px] border border-border/60 bg-gradient-to-br from-white via-white to-primary/5 shadow-[0_14px_34px_rgba(0,0,0,0.05)]',
        compact ? 'p-4' : 'p-5',
        className,
      )}
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      <div className="flex items-start gap-4">
        <div className="relative shrink-0">
          <div className={cn('overflow-hidden rounded-full border-2 border-white shadow-md', compact ? 'h-14 w-14' : 'h-16 w-16')}>
            {providerAvatar ? (
              <img src={providerAvatar} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-primary/10 text-primary">
                <BriefcaseBusiness className={compact ? 'h-5 w-5' : 'h-6 w-6'} />
              </div>
            )}
          </div>
          {providerVerified ? (
            <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-emerald-500 shadow-sm">
              <ShieldCheck className="h-3.5 w-3.5 text-white" />
            </div>
          ) : null}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          {statusLabel ? (
            <div className="inline-flex rounded-full border border-primary/15 bg-primary/8 px-3 py-1 text-[11px] font-semibold text-primary">
              {statusLabel}
            </div>
          ) : null}

          <div className="space-y-1">
            <h3 className={cn('truncate font-semibold text-foreground', compact ? 'text-base' : 'text-lg', isArabic ? 'font-ar-heading' : 'font-heading')}>
              {displayName}
            </h3>
            {secondaryName ? (
              <p className={cn('truncate text-sm text-muted-foreground', isArabic ? 'font-ar-body' : 'font-body')}>
                {secondaryName}
              </p>
            ) : null}
          </div>

          {metaItems.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {metaItems.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-border/60 bg-background/80 px-3 py-1 text-[11px] font-medium text-foreground/75"
                >
                  {item}
                </span>
              ))}
            </div>
          ) : null}

          {providerPhone ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-4 w-4 text-primary/80" />
              <span className={cn('font-medium', isArabic ? 'font-ar-body' : 'font-body')}>
                {providerPhone}
              </span>
            </div>
          ) : null}
        </div>
      </div>

      {!compact && typeof providerRating === 'number' && providerRating > 0 ? (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-amber-200/70 bg-amber-50/80 px-4 py-3 text-sm text-amber-800">
          <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
          <span className={cn('font-medium', isArabic ? 'font-ar-body' : 'font-body')}>
            {isArabic
              ? `يحافظ على تقييم ${providerRating.toFixed(1)} من 5`
              : `Maintains a ${providerRating.toFixed(1)}/5 buyer rating`}
          </span>
        </div>
      ) : null}
    </div>
  );
};
