import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/hooks/useCurrency';
import { supabase } from '@/integrations/supabase/client';
import { GradientHeader } from '@/components/mobile/GradientHeader';
import { SoftCard } from '@/components/mobile/SoftCard';
import { StatusPill } from '@/components/mobile/StatusPill';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, DollarSign, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Heading3, Body, BodySmall } from '@/components/mobile/Typography';

interface MyContractsProps {
  currentLanguage: 'en' | 'ar';
}

export const MyContracts = ({ currentLanguage }: MyContractsProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { formatAmount } = useCurrency();

  const { data: contracts, isLoading } = useQuery({
    queryKey: ['seller-contracts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *, 
          buyer:profiles!contracts_buyer_id_fkey(full_name, company_name), 
          quote:quote_submissions(price, request_id), 
          booking:booking_requests(final_amount, final_agreed_price, job_description, buyer_marked_complete, seller_marked_complete),
          maintenance_request:maintenance_requests!contracts_request_id_fkey(title, title_ar, buyer_marked_complete, seller_marked_complete)
        `)
        .eq('seller_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  const content = {
    en: {
      title: 'My Contracts',
      subtitle: 'Contracts with buyers',
      noContracts: 'No contracts yet',
      startWorking: 'Start working to create contracts',
      viewDetails: 'View Details',
      status: 'Status',
      amount: 'Amount',
      created: 'Created',
      draft: 'Draft',
      pending: 'Pending Signatures',
      active: 'Active',
      completed: 'Executed', // Changed from Completed to Executed as requested
      terminated: 'Terminated'
    },
    ar: {
      title: 'عقودي',
      subtitle: 'العقود مع العملاء',
      noContracts: 'لا توجد عقود بعد',
      startWorking: 'ابدأ العمل لإنشاء عقود',
      viewDetails: 'عرض التفاصيل',
      status: 'الحالة',
      amount: 'المبلغ',
      created: 'تاريخ الإنشاء',
      draft: 'مسودة',
      pending: 'في انتظار التوقيع',
      active: 'نشط',
      completed: 'منفذ', // Changed from Completed to Executed (Munaffath)
      terminated: 'منتهي'
    }
  };

  const t = content[currentLanguage];

  const getStatusLabel = (status: string, isJobComplete?: boolean) => {
    const statusMap: any = {
      draft: t.draft,
      pending_signatures: t.pending,
      pending_buyer: t.pending,
      pending_seller: t.pending,
      active: isJobComplete ? t.completed : t.active, // Show Executed if job complete
      executed: isJobComplete ? t.completed : t.active, // Show Executed if job complete
      completed: t.completed, // completed -> Executed (label) match
      terminated: t.terminated,
      cancelled: t.terminated,
      rejected: t.terminated
    };
    // Fallback: remove underscores and capitalize if no translation found
    return statusMap[status] || status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getStatusVariant = (status: string): 'success' | 'warning' | 'error' | 'pending' => {
    switch (status) {
      case 'active':
      case 'executed':
      case 'completed':
        return 'success';
      case 'pending_signatures':
      case 'pending_buyer':
      case 'pending_seller':
        return 'warning';
      case 'terminated':
      case 'cancelled':
      case 'rejected':
        return 'error';
      default:
        return 'pending';
    }
  };

  if (isLoading) {
    return (
      <div className="pb-28 min-h-screen bg-background" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
        <GradientHeader title={t.title} subtitle={t.subtitle} showBack onBack={() => navigate(-1)} />
        <div className="px-4 py-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-3xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="pb-28 min-h-screen bg-background" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      <GradientHeader title={t.title} subtitle={t.subtitle} showBack onBack={() => navigate(-1)} />

      <div className="px-4 py-6 space-y-4">
        {contracts && contracts.length > 0 ? (
          contracts.map((contract: any, index: number) => {
            const buyer = contract.buyer;
            const maintenanceRequest = contract.maintenance_request as any;
            const booking = contract.booking as any;

            // Check if job is complete (both buyer and seller marked complete)
            const isJobComplete = maintenanceRequest
              ? (maintenanceRequest.buyer_marked_complete && maintenanceRequest.seller_marked_complete)
              : (booking?.buyer_marked_complete && booking?.seller_marked_complete);

            const statusPill = { status: getStatusVariant(contract.status), label: getStatusLabel(contract.status, isJobComplete) };
            const priceValue = (contract.metadata as any)?.final_price ||
              (contract.quote as any)?.price ||
              booking?.final_agreed_price ||
              booking?.final_amount || 0;

            // Determine title: quotation-based uses request title, booking-based uses "[buyer] Booking"
            const isFromQuotation = !!maintenanceRequest;
            const buyerName = buyer?.company_name || buyer?.full_name || 'Buyer';

            let jobTitle: string;
            if (isFromQuotation) {
              // From quotation - use request title
              jobTitle = currentLanguage === 'ar'
                ? (maintenanceRequest?.title_ar || maintenanceRequest?.title || 'طلب')
                : (maintenanceRequest?.title || 'Request');
            } else {
              // From booking - use "[buyer] Booking"
              jobTitle = currentLanguage === 'ar'
                ? `${buyerName} - حجز`
                : `${buyerName} Booking`;
            }

            return (
              <motion.button
                key={contract.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => navigate(`/app/seller/contract/${contract.id}`)}
                className="w-full"
              >
                <SoftCard>
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2 flex-1">
                        <FileText className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <div className="flex-1 text-left">
                          <Heading3 lang={currentLanguage} className="mb-1 line-clamp-1">
                            {jobTitle}
                          </Heading3>
                          <BodySmall lang={currentLanguage} className="text-muted-foreground">
                            {currentLanguage === 'ar' ? 'مع' : 'with'} {buyer?.company_name || buyer?.full_name}
                          </BodySmall>
                        </div>
                      </div>
                      <StatusPill status={statusPill.status} label={statusPill.label} animate={false} />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-primary">
                        {/* Removed DollarSign icon as requested */}
                        <Body lang={currentLanguage} className="font-semibold">
                          {priceValue > 0 ? formatAmount(priceValue, 'SAR', 2) : '---'}
                        </Body>
                      </div>
                      {contract.created_at && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <BodySmall lang={currentLanguage}>
                            {new Date(contract.created_at).toLocaleDateString(
                              currentLanguage === 'ar' ? 'ar-SA' : 'en-US'
                            )}
                          </BodySmall>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-border/30">
                      <BodySmall lang={currentLanguage} className="text-accent font-medium">
                        {t.viewDetails} →
                      </BodySmall>
                    </div>
                  </div>
                </SoftCard>
              </motion.button>
            );
          })
        ) : (
          <SoftCard className="text-center py-12">
            <div className="space-y-3">
              <div className="text-5xl opacity-20">📄</div>
              <Heading3 lang={currentLanguage}>{t.noContracts}</Heading3>
              <Body lang={currentLanguage} className="text-muted-foreground">
                {t.startWorking}
              </Body>
            </div>
          </SoftCard>
        )}
      </div>
    </div>
  );
};
