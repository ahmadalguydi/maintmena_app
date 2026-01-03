import { SoftCard } from './SoftCard';
import { Heading3, Body, BodySmall } from './Typography';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Check, Clock } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface DualResolutionHaltedJobCardProps {
  jobId: string;
  jobType: 'request' | 'booking';
  currentLanguage: 'en' | 'ar';
  haltReason?: string;
  haltedAt: string;
  buyerId: string;
  sellerId: string;
  buyerApprovedResolution: boolean;
  sellerApprovedResolution: boolean;
}

export const DualResolutionHaltedJobCard = ({
  jobId,
  jobType,
  currentLanguage,
  haltReason,
  haltedAt,
  buyerId,
  sellerId,
  buyerApprovedResolution,
  sellerApprovedResolution
}: DualResolutionHaltedJobCardProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const isBuyer = user?.id === buyerId;
  const isSeller = user?.id === sellerId;
  const hasApproved = isBuyer ? buyerApprovedResolution : sellerApprovedResolution;
  const otherPartyApproved = isBuyer ? sellerApprovedResolution : buyerApprovedResolution;

  const content = {
    en: {
      title: 'Job Halted',
      reason: 'Reason',
      haltedOn: 'Halted on',
      approveResolution: 'I Approve Resolution',
      youApproved: 'You approved resolution',
      waitingBuyer: 'Waiting for buyer to approve',
      waitingSeller: 'Waiting for seller to approve',
      bothApproved: 'Both parties approved - resolving...',
      approveDesc: 'Both parties must approve for the job to resume',
      approveSuccess: 'Resolution approved'
    },
    ar: {
      title: 'العمل متوقف',
      reason: 'السبب',
      haltedOn: 'تم التوقف في',
      approveResolution: 'أوافق على الحل',
      youApproved: 'وافقت على الحل',
      waitingBuyer: 'في انتظار موافقة المشتري',
      waitingSeller: 'في انتظار موافقة البائع',
      bothApproved: 'وافق الطرفان - جاري الحل...',
      approveDesc: 'يجب أن يوافق الطرفان لاستئناف العمل',
      approveSuccess: 'تمت الموافقة على الحل'
    }
  };

  const t = content[currentLanguage];

  const approveMutation = useMutation({
    mutationFn: async () => {
      const table = jobType === 'request' ? 'maintenance_requests' : 'booking_requests';
      const updateField = isBuyer ? 'buyer_approved_resolution' : 'seller_approved_resolution';
      
      const { error } = await supabase
        .from(table)
        .update({ [updateField]: true })
        .eq('id', jobId);

      if (error) throw error;

      // Create admin notification about resolution progress
      const { data: adminRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (adminRoles) {
        const adminNotifications = adminRoles.map(admin => ({
          user_id: admin.user_id,
          title: 'Halted Job Resolution Progress',
          message: `${isBuyer ? 'Buyer' : 'Seller'} approved resolution for halted job`,
          notification_type: 'job_resolution_progress',
          content_id: jobId
        }));

        await supabase.from('notifications').insert(adminNotifications);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [jobType === 'request' ? 'request-detail' : 'booking-detail', jobId] });
      queryClient.invalidateQueries({ queryKey: ['buyer-active-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['seller-active-jobs'] });
      toast.success(t.approveSuccess);
    },
    onError: (error) => {
      console.error('Approve resolution error:', error);
      toast.error('Failed to approve resolution');
    }
  });

  const getStatusMessage = () => {
    if (hasApproved && otherPartyApproved) {
      return t.bothApproved;
    }
    if (hasApproved) {
      return isBuyer ? t.waitingSeller : t.waitingBuyer;
    }
    return null;
  };

  return (
    <SoftCard className="border-2 border-amber-500/50 bg-amber-50/50">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-amber-500/20">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
          </div>
          <div className="flex-1">
            <Heading3 lang={currentLanguage} className="text-amber-900">{t.title}</Heading3>
            <BodySmall lang={currentLanguage} className="text-amber-700">
              {t.haltedOn} {new Date(haltedAt).toLocaleDateString()}
            </BodySmall>
          </div>
        </div>

        {/* Reason */}
        {haltReason && (
          <div className="p-3 rounded-2xl bg-white border border-amber-200">
            <BodySmall lang={currentLanguage} className="text-muted-foreground font-medium mb-1">
              {t.reason}
            </BodySmall>
            <Body lang={currentLanguage} className="text-foreground">
              {haltReason}
            </Body>
          </div>
        )}

        {/* Approval Status */}
        <div className="p-3 rounded-2xl bg-white border border-amber-200">
          <div className="flex items-center justify-between mb-3">
            <BodySmall lang={currentLanguage} className="font-medium">
              {currentLanguage === 'ar' ? 'حالة الموافقة' : 'Approval Status'}
            </BodySmall>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                buyerApprovedResolution ? 'bg-green-500' : 'bg-muted'
              }`}>
                {buyerApprovedResolution ? (
                  <Check size={12} className="text-white" />
                ) : (
                  <Clock size={12} className="text-muted-foreground" />
                )}
              </div>
              <BodySmall lang={currentLanguage}>
                {currentLanguage === 'ar' ? 'المشتري' : 'Buyer'}
                {isBuyer && (buyerApprovedResolution ? ' ✓' : '')}
              </BodySmall>
            </div>
            
            <div className="flex items-center gap-2">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                sellerApprovedResolution ? 'bg-green-500' : 'bg-muted'
              }`}>
                {sellerApprovedResolution ? (
                  <Check size={12} className="text-white" />
                ) : (
                  <Clock size={12} className="text-muted-foreground" />
                )}
              </div>
              <BodySmall lang={currentLanguage}>
                {currentLanguage === 'ar' ? 'البائع' : 'Seller'}
                {isSeller && (sellerApprovedResolution ? ' ✓' : '')}
              </BodySmall>
            </div>
          </div>
        </div>

        {/* Status Message */}
        {getStatusMessage() && (
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
            <BodySmall lang={currentLanguage} className="text-blue-700">
              {getStatusMessage()}
            </BodySmall>
          </div>
        )}

        {/* Approve Button */}
        {!hasApproved && (
          <div className="space-y-2">
            <Body lang={currentLanguage} className="text-muted-foreground text-sm">
              {t.approveDesc}
            </Body>
            <Button
              onClick={() => approveMutation.mutate()}
              disabled={approveMutation.isPending}
              className="w-full h-12 rounded-full bg-gradient-to-r from-green-600 to-green-500"
            >
              <Check size={18} className="mr-2" />
              {t.approveResolution}
            </Button>
          </div>
        )}

        {/* Already Approved */}
        {hasApproved && !otherPartyApproved && (
          <div className="p-3 rounded-xl bg-green-50 border border-green-200 flex items-center gap-2">
            <Check size={18} className="text-green-600" />
            <Body lang={currentLanguage} className="text-green-700">
              {t.youApproved}
            </Body>
          </div>
        )}
      </div>
    </SoftCard>
  );
};