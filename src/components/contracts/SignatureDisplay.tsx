import { format } from 'date-fns';
import { CheckCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface SignatureDisplayProps {
  signerName: string;
  signatureData?: { type: string; data: string };
  signedAt?: string;
  role: 'buyer' | 'seller';
  currentLanguage: 'en' | 'ar';
}

export function SignatureDisplay({
  signerName,
  signatureData,
  signedAt,
  role,
  currentLanguage,
}: SignatureDisplayProps) {
  const content = {
    en: {
      buyer: 'Buyer',
      seller: 'Service Provider',
      signedOn: 'Signed on',
      pending: 'Pending Signature',
    },
    ar: {
      buyer: 'المشتري',
      seller: 'مزود الخدمة',
      signedOn: 'تم التوقيع في',
      pending: 'في انتظار التوقيع',
    },
  };

  const t = content[currentLanguage];
  const roleLabel = role === 'buyer' ? t.buyer : t.seller;

  if (!signedAt || !signatureData) {
    return (
      <Card className="p-6 bg-muted/20">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <span className="text-xl">⏳</span>
          </div>
          <div>
            <p className="font-semibold">{roleLabel}</p>
            <p className="text-sm text-muted-foreground">{t.pending}</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center shrink-0">
          <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-semibold text-green-900 dark:text-green-100">{roleLabel}</p>
            <span className="text-xs text-green-600 dark:text-green-400">✓ {t.signedOn}</span>
          </div>
          <p className="text-sm text-green-800 dark:text-green-200 mb-3">
            {signerName}
          </p>
          <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-green-200 dark:border-green-800">
            <img
              src={signatureData.data}
              alt={`${signerName}'s signature`}
              className="max-h-16 max-w-full"
            />
          </div>
          <p className="text-xs text-green-600 dark:text-green-400 mt-2">
            {format(new Date(signedAt), 'PPpp')}
          </p>
        </div>
      </div>
    </Card>
  );
}
