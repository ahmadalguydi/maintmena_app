import { SoftCard } from './SoftCard';
import { Heading3, Body, BodySmall } from './Typography';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface HaltedJobCardProps {
  jobId: string;
  jobType: 'request' | 'booking';
  currentLanguage: 'en' | 'ar';
  haltReason?: string;
  haltedAt: string;
}

export const HaltedJobCard = ({
  jobId,
  jobType,
  currentLanguage,
  haltReason,
  haltedAt
}: HaltedJobCardProps) => {
  const queryClient = useQueryClient();

  const content = {
    en: {
      title: 'Job Halted',
      reason: 'Reason',
      haltedOn: 'Halted on',
      resolve: 'Mark as Resolved',
      resolveDesc: 'This will reactivate the job and notify the admin',
      resolveSuccess: 'Job marked as resolved'
    },
    ar: {
      title: 'العمل متوقف',
      reason: 'السبب',
      haltedOn: 'تم التوقف في',
      resolve: 'تحديد كمحلول',
      resolveDesc: 'سيعيد تنشيط العمل ويخطر المشرف',
      resolveSuccess: 'تم تحديد العمل كمحلول'
    }
  };

  const t = content[currentLanguage];

  const resolveMutation = useMutation({
    mutationFn: async () => {
      const table = jobType === 'request' ? 'maintenance_requests' : 'booking_requests';
      const { error } = await supabase
        .from(table)
        .update({
          halted: false,
          resolved_at: new Date().toISOString()
        })
        .eq('id', jobId);

      if (error) throw error;

      // Create admin notification
      const { data: adminRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (adminRoles) {
        const adminNotifications = adminRoles.map(admin => ({
          user_id: admin.user_id,
          title: 'Job Resolved',
          message: `A halted job has been marked as resolved and requires moderation`,
          notification_type: 'job_resolved',
          content_id: jobId
        }));

        await supabase.from('notifications').insert(adminNotifications);
      }
    },
    onSuccess: () => {
      // Invalidate all related queries so UI updates immediately
      queryClient.invalidateQueries({ queryKey: [jobType === 'request' ? 'request-detail' : 'booking-detail', jobId] });
      queryClient.invalidateQueries({ queryKey: ['buyer-requests'] });
      queryClient.invalidateQueries({ queryKey: ['buyer-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['buyer-active-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['seller-home'] });
      queryClient.invalidateQueries({ queryKey: ['seller-active-jobs'] });
      toast.success(t.resolveSuccess);
    },
    onError: (error) => {
      console.error('Resolve error:', error);
      toast.error('Failed to resolve job');
    }
  });

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

        {/* Resolve Button */}
        <div className="space-y-2">
          <Body lang={currentLanguage} className="text-muted-foreground text-sm">
            {t.resolveDesc}
          </Body>
          <Button
            onClick={() => resolveMutation.mutate()}
            disabled={resolveMutation.isPending}
            className="w-full h-12 rounded-full bg-gradient-to-r from-green-600 to-green-500"
          >
            <CheckCircle size={18} className="mr-2" />
            {t.resolve}
          </Button>
        </div>
      </div>
    </SoftCard>
  );
};