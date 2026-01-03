import { Check, X, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCurrency } from '@/hooks/useCurrency';

interface PriceProposalBubbleProps {
  originalPrice: number;
  proposedPrice: number;
  reason?: string;
  status: 'pending' | 'accepted' | 'rejected';
  isSender: boolean;
  currentLanguage: 'en' | 'ar';
  onAccept?: () => void;
  onReject?: () => void;
}

export function PriceProposalBubble({
  originalPrice,
  proposedPrice,
  reason,
  status,
  isSender,
  currentLanguage,
  onAccept,
  onReject
}: PriceProposalBubbleProps) {
  const { formatAmount } = useCurrency();
  const isRtl = currentLanguage === 'ar';
  const difference = proposedPrice - originalPrice;
  const isIncrease = difference > 0;
  
  const content = {
    en: {
      title: 'Price Change Proposal',
      original: 'Original',
      proposed: 'Proposed',
      increase: 'increase',
      decrease: 'decrease',
      reason: 'Reason',
      accept: 'Accept',
      reject: 'Decline',
      accepted: 'Accepted',
      rejected: 'Declined',
      pending: 'Awaiting response...'
    },
    ar: {
      title: 'اقتراح تغيير السعر',
      original: 'الأصلي',
      proposed: 'المقترح',
      increase: 'زيادة',
      decrease: 'تخفيض',
      reason: 'السبب',
      accept: 'قبول',
      reject: 'رفض',
      accepted: 'تم القبول',
      rejected: 'تم الرفض',
      pending: 'في انتظار الرد...'
    }
  };
  
  const t = content[currentLanguage];
  
  const statusColors = {
    pending: 'border-amber-300 bg-amber-50/50 dark:bg-amber-900/10',
    accepted: 'border-emerald-300 bg-emerald-50/50 dark:bg-emerald-900/10',
    rejected: 'border-red-300 bg-red-50/50 dark:bg-red-900/10'
  };
  
  return (
    <div 
      className={`max-w-[85%] rounded-2xl border-2 p-4 ${statusColors[status]} ${isSender ? 'ml-auto' : 'mr-auto'}`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className={`flex items-center gap-2 mb-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <ArrowUpDown className="w-4 h-4 text-primary" />
        </div>
        <span className="font-semibold text-foreground">{t.title}</span>
      </div>
      
      <div className="space-y-2 mb-3">
        <div className={`flex justify-between text-sm ${isRtl ? 'flex-row-reverse' : ''}`}>
          <span className="text-muted-foreground">{t.original}:</span>
          <span className="line-through text-muted-foreground">{formatAmount(originalPrice, 'SAR')}</span>
        </div>
        <div className={`flex justify-between text-sm ${isRtl ? 'flex-row-reverse' : ''}`}>
          <span className="font-medium">{t.proposed}:</span>
          <span className="font-bold text-lg text-foreground">{formatAmount(proposedPrice, 'SAR')}</span>
        </div>
        <div className={`flex justify-center ${isRtl ? 'flex-row-reverse' : ''}`}>
          <span className={`text-xs px-2 py-0.5 rounded-full ${isIncrease ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
            {isIncrease ? '+' : ''}{formatAmount(difference, 'SAR')} ({isIncrease ? t.increase : t.decrease})
          </span>
        </div>
      </div>
      
      {reason && (
        <div className={`text-sm mb-3 p-2 rounded-lg bg-background/50 ${isRtl ? 'text-right' : ''}`}>
          <span className="text-muted-foreground">{t.reason}: </span>
          <span className="text-foreground">{reason}</span>
        </div>
      )}
      
      {status === 'pending' && !isSender && (
        <div className={`flex gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
            onClick={onReject}
          >
            <X className="w-4 h-4 mr-1" />
            {t.reject}
          </Button>
          <Button
            size="sm"
            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
            onClick={onAccept}
          >
            <Check className="w-4 h-4 mr-1" />
            {t.accept}
          </Button>
        </div>
      )}
      
      {status === 'pending' && isSender && (
        <p className="text-xs text-center text-muted-foreground">{t.pending}</p>
      )}
      
      {status === 'accepted' && (
        <div className={`flex items-center justify-center gap-2 text-emerald-600 ${isRtl ? 'flex-row-reverse' : ''}`}>
          <Check className="w-5 h-5" />
          <span className="font-semibold">{t.accepted}</span>
        </div>
      )}
      
      {status === 'rejected' && (
        <div className={`flex items-center justify-center gap-2 text-red-600 ${isRtl ? 'flex-row-reverse' : ''}`}>
          <X className="w-5 h-5" />
          <span className="font-semibold">{t.rejected}</span>
        </div>
      )}
    </div>
  );
}
