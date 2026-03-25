import { Shield, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { SoftCard } from './SoftCard';
import { Button } from '@/components/ui/button';
import { differenceInDays, format } from 'date-fns';

interface WarrantyCardProps {
  warrantyActivatedAt: string | null;
  warrantyExpiresAt: string | null;
  warrantyClaimed: boolean;
  currentLanguage: 'en' | 'ar';
  onClaimWarranty?: () => void;
}

export function WarrantyCard({
  warrantyActivatedAt,
  warrantyExpiresAt,
  warrantyClaimed,
  currentLanguage,
  onClaimWarranty
}: WarrantyCardProps) {
  const isRtl = currentLanguage === 'ar';
  
  const content = {
    en: {
      title: '30-Day Digital Warranty',
      active: 'Warranty Active',
      expired: 'Warranty Expired',
      claimed: 'Claim Submitted',
      daysLeft: 'days remaining',
      activatedOn: 'Activated on',
      expiresOn: 'Expires on',
      claimButton: 'Report an Issue',
      protectedMessage: 'Your work is protected. Report any issues within the warranty period.',
      expiredMessage: 'Your warranty period has ended.',
      pendingActivation: 'Confirm job completion to activate your warranty',
    },
    ar: {
      title: 'ضمان رقمي ٣٠ يوم',
      active: 'الضمان فعّال',
      expired: 'انتهى الضمان',
      claimed: 'تم تقديم مطالبة',
      daysLeft: 'يوم متبقي',
      activatedOn: 'تم التفعيل في',
      expiresOn: 'ينتهي في',
      claimButton: 'الإبلاغ عن مشكلة',
      protectedMessage: 'عملك محمي. أبلغ عن أي مشاكل خلال فترة الضمان.',
      expiredMessage: 'انتهت فترة الضمان.',
      pendingActivation: 'أكّد إتمام العمل لتفعيل الضمان',
    }
  };
  
  const t = content[currentLanguage];
  
  const isActive = warrantyActivatedAt && warrantyExpiresAt && new Date(warrantyExpiresAt) > new Date();
  const isExpired = warrantyExpiresAt && new Date(warrantyExpiresAt) <= new Date();
  const daysRemaining = warrantyExpiresAt ? differenceInDays(new Date(warrantyExpiresAt), new Date()) : 0;
  
  if (!warrantyActivatedAt) {
    return (
      <SoftCard className="border-2 border-dashed border-muted-foreground/30">
        <div className={`flex items-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`} dir={isRtl ? 'rtl' : 'ltr'}>
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <Shield className="w-6 h-6 text-muted-foreground" />
          </div>
          <div className={`flex-1 ${isRtl ? 'text-right' : ''}`}>
            <p className="font-semibold text-muted-foreground">{t.title}</p>
            <p className="text-sm text-muted-foreground">{t.pendingActivation}</p>
          </div>
        </div>
      </SoftCard>
    );
  }
  
  if (warrantyClaimed) {
    return (
      <SoftCard className="border-2 border-amber-500/50 bg-amber-50/50 dark:bg-amber-900/10">
        <div className={`flex items-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`} dir={isRtl ? 'rtl' : 'ltr'}>
          <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
          </div>
          <div className={`flex-1 ${isRtl ? 'text-right' : ''}`}>
            <p className="font-semibold text-amber-700 dark:text-amber-400">{t.claimed}</p>
            <p className="text-sm text-amber-600/80 dark:text-amber-400/80">
              {t.title}
            </p>
          </div>
        </div>
      </SoftCard>
    );
  }
  
  if (isExpired) {
    return (
      <SoftCard className="border-2 border-muted bg-muted/30">
        <div className={`flex items-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`} dir={isRtl ? 'rtl' : 'ltr'}>
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <Shield className="w-6 h-6 text-muted-foreground" />
          </div>
          <div className={`flex-1 ${isRtl ? 'text-right' : ''}`}>
            <p className="font-semibold text-muted-foreground">{t.expired}</p>
            <p className="text-sm text-muted-foreground">{t.expiredMessage}</p>
          </div>
        </div>
      </SoftCard>
    );
  }
  
  return (
    <SoftCard className="border-2 border-emerald-500/50 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20">
      <div className={`space-y-4 ${isRtl ? 'text-right' : ''}`} dir={isRtl ? 'rtl' : 'ltr'}>
        <div className={`flex items-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
          <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <Shield className="w-6 h-6 text-emerald-600" />
          </div>
          <div className="flex-1">
            <div className={`flex items-center gap-2 ${isRtl ? 'flex-row-reverse justify-end' : ''}`}>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <p className="font-semibold text-emerald-700 dark:text-emerald-400">{t.active}</p>
            </div>
            <p className="text-sm text-emerald-600/80 dark:text-emerald-400/80">{t.title}</p>
          </div>
          <div className={`text-center ${isRtl ? 'text-left' : 'text-right'}`}>
            <p className="text-2xl font-bold text-emerald-600">{daysRemaining}</p>
            <p className="text-xs text-emerald-600/70">{t.daysLeft}</p>
          </div>
        </div>
        
        <div className={`flex items-center gap-4 text-xs text-emerald-600/70 ${isRtl ? 'flex-row-reverse' : ''}`}>
          <div className={`flex items-center gap-1 ${isRtl ? 'flex-row-reverse' : ''}`}>
            <Clock className="w-3 h-3" />
            <span>{t.activatedOn}: {warrantyActivatedAt ? format(new Date(warrantyActivatedAt), 'MMM d') : '-'}</span>
          </div>
          <div className={`flex items-center gap-1 ${isRtl ? 'flex-row-reverse' : ''}`}>
            <Clock className="w-3 h-3" />
            <span>{t.expiresOn}: {warrantyExpiresAt ? format(new Date(warrantyExpiresAt), 'MMM d') : '-'}</span>
          </div>
        </div>
        
        <p className="text-sm text-emerald-600/80 dark:text-emerald-400/80">
          {t.protectedMessage}
        </p>
        
        {onClaimWarranty && (
          <Button
            variant="outline"
            className="w-full border-emerald-500 text-emerald-700 hover:bg-emerald-100"
            onClick={onClaimWarranty}
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            {t.claimButton}
          </Button>
        )}
      </div>
    </SoftCard>
  );
}
