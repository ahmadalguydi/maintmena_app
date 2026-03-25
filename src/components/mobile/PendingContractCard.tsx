import { motion } from 'framer-motion';
import { AlertCircle, FileText, DollarSign, Calendar, ArrowRight } from 'lucide-react';
import { SoftCard } from './SoftCard';
import { Heading3, Body, BodySmall } from './Typography';
import { useCurrency } from '@/hooks/useCurrency';
import { cn } from '@/lib/utils';

interface PendingContractCardProps {
  contractId: string;
  otherPartyName: string;
  amount: number;
  startDate: string | null;
  userRole: 'buyer' | 'seller';
  actionNeeded: string;
  currentLanguage: 'en' | 'ar';
  onClick: () => void;
}

export const PendingContractCard = ({
  contractId,
  otherPartyName,
  amount,
  startDate,
  userRole,
  actionNeeded,
  currentLanguage,
  onClick
}: PendingContractCardProps) => {
  const { formatAmount } = useCurrency();
  const isRTL = currentLanguage === 'ar';

  const content = {
    en: {
      contractPending: 'Contract Pending Action',
      with: userRole === 'buyer' ? 'Service Provider' : 'Client',
      actionRequired: 'Action Required',
      reviewAndSign: 'Review and Sign',
      amount: 'Amount',
      startDate: 'Start Date',
      tbd: 'TBD'
    },
    ar: {
      contractPending: 'عقد يحتاج إجراء',
      with: userRole === 'buyer' ? 'مقدم الخدمة' : 'العميل',
      actionRequired: 'يتطلب إجراء',
      reviewAndSign: 'مراجعة وتوقيع',
      amount: 'المبلغ',
      startDate: 'تاريخ البدء',
      tbd: 'غير محدد'
    }
  };

  const t = content[currentLanguage];

  const formattedDate = startDate
    ? new Date(startDate).toLocaleDateString(currentLanguage === 'ar' ? 'ar-SA' : 'en-US')
    : t.tbd;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <SoftCard
        onClick={onClick}
        className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/30 cursor-pointer relative overflow-hidden"
      >
        {/* Pulsing indicator - RTL aware */}
        <div className={cn("absolute top-4", isRTL ? "left-4" : "right-4")}>
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [1, 0.6, 1]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <AlertCircle className="h-6 w-6 text-amber-500" />
          </motion.div>
        </div>

        <div className="space-y-4">
          {/* Header */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-5 w-5 text-amber-600" />
              <Heading3 lang={currentLanguage} className="text-amber-700">
                {t.contractPending}
              </Heading3>
            </div>
            <BodySmall lang={currentLanguage} className="text-muted-foreground">
              {t.with}: {otherPartyName}
            </BodySmall>
          </div>

          {/* Contract Details */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-500/10">
                <DollarSign className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <BodySmall lang={currentLanguage} className="text-muted-foreground text-xs">
                  {t.amount}
                </BodySmall>
                <Body lang={currentLanguage} className="font-semibold">
                  {formatAmount(amount, 'SAR')}
                </Body>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-500/10">
                <Calendar className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <BodySmall lang={currentLanguage} className="text-muted-foreground text-xs">
                  {t.startDate}
                </BodySmall>
                <Body lang={currentLanguage} className="font-semibold">
                  {formattedDate}
                </Body>
              </div>
            </div>
          </div>

          {/* Action CTA */}
          <div className="flex items-center justify-between pt-2 border-t border-amber-500/20">
            <Body lang={currentLanguage} className="font-semibold text-amber-700">
              {actionNeeded}
            </Body>
            <ArrowRight className={cn("h-5 w-5 text-amber-600", isRTL && "rotate-180")} />
          </div>
        </div>
      </SoftCard>
    </motion.div>
  );
};