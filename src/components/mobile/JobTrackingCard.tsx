import { useState } from "react";
import { SoftCard } from "./SoftCard";
import { TimelineTracker, TimelineStep } from "./TimelineTracker";
import { StatusPill } from "./StatusPill";
import { Heading3, Body, BodySmall, Label } from "./Typography";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  DollarSign,
  Clock,
  MapPin,
  MessageCircle,
  CheckCircle,
  Truck,
  Play,
  AlertTriangle,
  Camera,
  Calendar,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { PhotoProofModal } from "./PhotoProofModal";
import { WarrantyCard } from "./WarrantyCard";
import { JobCompletionSheet } from "./JobCompletionSheet";
import { SAUDI_CITIES_BILINGUAL } from "@/lib/saudiCities";
import { format, isValid } from "date-fns";
import { ar } from "date-fns/locale";
import { celebrateCompletion } from "@/lib/celebration";
import { haptics } from "@/lib/haptics";
import { IssueStatusBadge } from "./IssueStatusBadge";
import { sendNotifications } from "@/lib/notifications";


interface JobTrackingCardProps {
  jobId: string;
  jobType: "request";
  title: string;
  description?: string;
  currentLanguage: "en" | "ar";
  userRole: "buyer" | "seller";
  status: string;
  sellerOnWayAt?: string | null;
  workStartedAt?: string | null;
  sellerMarkedComplete: boolean;
  buyerMarkedComplete: boolean;
  sellerId: string;
  sellerName: string;
  paymentMethod?: string;
  location?: string;
  price?: number;
  onReviewComplete?: () => void;
  onClick?: () => void;
  completionPhotos?: string[];
  date?: string | null;
  hidePrimaryActions?: boolean;
  /** Active issue status to display on the card */
  issueStatus?: 'pending' | 'responded' | 'resolved' | 'needs_attention' | 'awaiting_agreement' | 'no_agreement' | 'escalated';
}

export const JobTrackingCard = ({
  jobId,
  jobType,
  title,
  description,
  currentLanguage,
  userRole,
  status,
  sellerOnWayAt,
  workStartedAt,
  sellerMarkedComplete,
  buyerMarkedComplete,
  sellerId,
  sellerName,
  paymentMethod,
  location,
  price,
  onReviewComplete,
  onClick,
  completionPhotos,
  date,
  hidePrimaryActions = false,
  issueStatus,
}: JobTrackingCardProps) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showPhotoProof, setShowPhotoProof] = useState(false);
  const [showCompletionSheet, setShowCompletionSheet] = useState(false);
  const [issueReason, setIssueReason] = useState("");

  const content = {
    en: {
      tracking: "Job Tracking",
      onMyWay: "On My Way",
      startWork: "Start Work",
      markComplete: "Mark Complete",
      confirmComplete: "Confirm Work Complete",
      leaveReview: "Leave Review",
      chat: "Chat",
      payment: "Payment",
      location: "Location",
      scheduled: "Scheduled",
      onWay: "Seller On Way",
      workStarted: "Work Started",
      sellerDone: "Seller Marked Complete",
      completed: "Completed",
      waitingBuyer: "Waiting for buyer confirmation",
      waitingSeller: "Waiting for seller to complete work",
      confirmSuccess: "Work confirmed as complete",
      statusUpdated: "Status updated successfully",
      reportIssue: "Report Issue",
      issueTitle: "Report an Issue",
      issueDesc: "Describe the issue with this job",
      issuePlaceholder: "Please describe the problem in detail...",
      cancel: "Cancel",
      submit: "Submit Report",
      issueReported: "Issue reported successfully",
    },
    ar: {
      tracking: "تتبع العمل",
      onMyWay: "في الطريق",
      startWork: "بدء العمل",
      markComplete: "تحديد كمكتمل",
      confirmComplete: "تأكيد اكتمال العمل",
      leaveReview: "اترك تقييم",
      chat: "محادثة",
      payment: "الدفع",
      location: "الموقع",
      scheduled: "مجدول",
      onWay: "البائع في الطريق",
      workStarted: "بدأ العمل",
      sellerDone: "البائع حدد كمكتمل",
      completed: "مكتمل",
      waitingBuyer: "في انتظار تأكيد المشتري",
      waitingSeller: "في انتظار البائع لإكمال العمل",
      confirmSuccess: "تم تأكيد العمل كمكتمل",
      statusUpdated: "تم تحديث الحالة بنجاح",
      reportIssue: "الإبلاغ عن مشكلة",
      issueTitle: "الإبلاغ عن مشكلة",
      issueDesc: "صف المشكلة في هذا العمل",
      issuePlaceholder: "الرجاء وصف المشكلة بالتفصيل...",
      cancel: "إلغاء",
      submit: "إرسال البلاغ",
      issueReported: "تم الإبلاغ عن المشكلة بنجاح",
    },
  };

  const t = content[currentLanguage];

  // Localize city name
  const getLocalizedCity = (city: string | null | undefined) => {
    if (!city) return null;
    const cityData = SAUDI_CITIES_BILINGUAL.find(c =>
      c.en.toLowerCase() === city.toLowerCase() || c.ar === city
    );
    return currentLanguage === 'ar' ? (cityData?.ar || city) : (cityData?.en || city);
  };

  const updateStatusMutation = useMutation({
    mutationFn: async (updateData: any) => {
      const { error } = await (supabase as any).from("maintenance_requests").update(updateData).eq("id", jobId);

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate both buyer and seller queries so UI updates immediately for all users
      // Use predicate matching to handle queries with user IDs appended
      queryClient.invalidateQueries({ queryKey: ["request-detail", jobId] });
      queryClient.invalidateQueries({ queryKey: ["seller-job-detail", jobId] });
      queryClient.invalidateQueries({ queryKey: ["buyer-job-detail", jobId] });
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === "buyer-requests" ||
          query.queryKey[0] === "buyer-home" ||
          query.queryKey[0] === "buyer-dispatch-requests" ||
          query.queryKey[0] === "buyer-active-jobs" ||
          query.queryKey[0] === "seller-stats" ||
          query.queryKey[0] === "seller-active-jobs" ||
          query.queryKey[0] === "seller-home"
      });
      toast.success(t.statusUpdated);
    },
    onError: (error) => {
      console.error("Status update error:", error);
      toast.error("Failed to update status");
    },
  });

  const handleSellerOnWay = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    updateStatusMutation.mutate({ seller_on_way_at: new Date().toISOString() });
  };

  const handleStartWork = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    updateStatusMutation.mutate({ work_started_at: new Date().toISOString() });
  };

  const handleSellerMarkComplete = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    // Open photo proof modal for seller - they provide proof of work
    setShowPhotoProof(true);
  };

  const handleSellerPhotoProofComplete = async (photos: string[]) => {
    // Update with completion photos and mark seller complete
    const { error } = await (supabase as any)
      .from("maintenance_requests")
      .update({
        seller_marked_complete: true,
        seller_completion_date: new Date().toISOString(),
        completion_photos: photos,
      })
      .eq("id", jobId);

    if (error) {
      console.error("Completion error:", error);
      toast.error("Failed to mark complete");
      return;
    }

    // Invalidate all related queries so UI updates immediately
    queryClient.invalidateQueries({ queryKey: ["request-detail", jobId] });
    queryClient.invalidateQueries({ queryKey: ["seller-job-detail", jobId] });
    queryClient.invalidateQueries({ queryKey: ["buyer-job-detail", jobId] });
    queryClient.invalidateQueries({
      predicate: (query) =>
        query.queryKey[0] === "buyer-requests" ||
        query.queryKey[0] === "buyer-home" ||
        query.queryKey[0] === "buyer-dispatch-requests" ||
        query.queryKey[0] === "buyer-active-jobs" ||
        query.queryKey[0] === "seller-stats" ||
        query.queryKey[0] === "seller-active-jobs" ||
        query.queryKey[0] === "seller-home"
    });
    toast.success(t.statusUpdated);

    // Redirect back to job detail
    if (jobId) {
      setTimeout(() => {
        navigate(`/app/seller/job/${jobId}`);
      }, 1000);
    }
  };

  const handleBuyerConfirmComplete = async (e?: React.MouseEvent) => {
    e?.stopPropagation();

    try {
      // Directly confirm completion for buyer
      const updateData: Record<string, any> = {
        buyer_marked_complete: true,
        buyer_completion_date: new Date().toISOString(),
        status: "completed",
      };

      const { error } = await (supabase as any).from("maintenance_requests").update(updateData).eq("id", jobId);

      if (error) {
        console.error("[JobTrackingCard] Completion error:", error);
        toast.error(currentLanguage === "ar" ? "فشل تأكيد الإكتمال" : "Failed to confirm completion");
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["request-detail", jobId] });
      queryClient.invalidateQueries({ queryKey: ["seller-job-detail", jobId] });
      queryClient.invalidateQueries({ queryKey: ["buyer-job-detail", jobId] });
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === "buyer-requests" ||
          query.queryKey[0] === "buyer-home" ||
          query.queryKey[0] === "buyer-dispatch-requests" ||
          query.queryKey[0] === "buyer-active-jobs" ||
          query.queryKey[0] === "seller-stats" ||
          query.queryKey[0] === "seller-active-jobs" ||
          query.queryKey[0] === "seller-home"
      });

      // Celebrate the completion!
      celebrateCompletion();

      toast.success(currentLanguage === "ar" ? "تم تأكيد الإكتمال" : "Completion confirmed");

      navigate(`/app/buyer/request/${jobId}?focusReview=1`);
    } catch (err) {
      console.error("[JobTrackingCard] Unexpected error:", err);
      toast.error(currentLanguage === "ar" ? "حدث خطأ غير متوقع" : "An unexpected error occurred");
    }
  };

  const handleReportIssue = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!issueReason.trim()) {
      toast.error("Please describe the issue");
      return;
    }

    const { error } = await (supabase as any)
      .from("maintenance_requests")
      .update({
        halted: true,
        halted_at: new Date().toISOString(),
        halted_reason: issueReason,
      })
      .eq("id", jobId);

    if (error) {
      console.error("Report issue error:", error);
      toast.error("Failed to report issue");
      return;
    }

    // Create admin notification
    try {
      const { data: adminRoles } = await (supabase as any).from("user_roles").select("user_id").eq("role", "admin");

      if (adminRoles) {
        const adminNotifications = adminRoles.map((admin) => ({
          user_id: admin.user_id,
          title: "Job Halted - Issue Reported",
          message: `A job has been halted. Reason: ${issueReason.substring(0, 100)}`,
          notification_type: "job_halted",
          content_id: jobId,
        }));

        await sendNotifications(adminNotifications);
      }
    } catch (notifError) {
      console.error("Admin notification error:", notifError);
    }

    queryClient.invalidateQueries({ queryKey: ["request-detail", jobId] });
    queryClient.invalidateQueries({ queryKey: ["seller-job-detail", jobId] });
    queryClient.invalidateQueries({ queryKey: ["buyer-job-detail", jobId] });
    queryClient.invalidateQueries({
      predicate: (query) =>
        query.queryKey[0] === "buyer-requests" ||
        query.queryKey[0] === "buyer-home" ||
        query.queryKey[0] === "buyer-dispatch-requests" ||
        query.queryKey[0] === "buyer-active-jobs" ||
        query.queryKey[0] === "seller-stats" ||
        query.queryKey[0] === "seller-active-jobs" ||
        query.queryKey[0] === "seller-home"
    });
    toast.success(t.issueReported);
    setShowIssueModal(false);
    setIssueReason("");
  };

  const getTimelineSteps = (): TimelineStep[] => {
    return [
      { label: t.scheduled, status: "completed" },
      {
        label: t.onWay,
        status: sellerOnWayAt ? "completed" : workStartedAt ? "completed" : "current",
      },
      {
        label: t.workStarted,
        status: workStartedAt ? "completed" : sellerOnWayAt ? "current" : "future",
      },
      {
        label: t.sellerDone,
        status: sellerMarkedComplete ? "completed" : workStartedAt ? "current" : "future",
      },
      {
        label: t.completed,
        status: buyerMarkedComplete ? "completed" : sellerMarkedComplete ? "current" : "future",
      },
    ];
  };

  return (
    <SoftCard onClick={onClick} className="cursor-pointer hover:shadow-lg transition-shadow">
      <div className="space-y-6">
        {/* Header with Job Title */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Heading3 lang={currentLanguage}>{title}</Heading3>
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/app/messages/thread?request=${jobId}`);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
            >
              <MessageCircle size={16} />
              <BodySmall lang={currentLanguage} className="!text-accent">
                {t.chat}
              </BodySmall>
            </button>
          </div>
          {/* Issue Status Badge */}
          {issueStatus && (
            <IssueStatusBadge
              status={issueStatus}
              currentLanguage={currentLanguage}
              compact
            />
          )}
          {description && (
            <Body lang={currentLanguage} className="text-muted-foreground text-sm line-clamp-2">
              {description
                .replace(/\[Flexible Date\]/gi, '')
                .replace(/\[تاريخ مرن\]/g, '')
                .replace(/\[Flexible Time\]/gi, '')
                .replace(/\[وقت مرن\]/g, '')
                .replace(/\[ASAP\]/gi, '')
                .replace(/\[عاجل\]/g, '')
                .trim()}
            </Body>
          )}
        </div>

        {/* Timeline */}
        <TimelineTracker steps={getTimelineSteps()} />

        {/* Info */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          {paymentMethod && (
            <div className="flex items-start gap-2">
              <DollarSign size={16} className="text-muted-foreground mt-0.5" />
              <div>
                <Label lang={currentLanguage} className="text-muted-foreground text-xs">
                  {t.payment}
                </Label>
                <BodySmall lang={currentLanguage} className="font-medium">
                  {paymentMethod}
                </BodySmall>
              </div>
            </div>
          )}
          {(price !== undefined && price !== null) && (
            <div className="flex items-start gap-2">
              <DollarSign size={16} className="text-muted-foreground mt-0.5" />
              <div>
                <Label lang={currentLanguage} className="text-muted-foreground text-xs">
                  {currentLanguage === 'ar' ? 'السعر' : 'Price'}
                </Label>
                <BodySmall lang={currentLanguage} className="font-medium">
                  {price.toLocaleString()} SAR
                </BodySmall>
              </div>
            </div>
          )}
          {date && (
            <div className="flex items-start gap-2">
              <Calendar size={16} className="text-muted-foreground mt-0.5" />
              <div>
                <Label lang={currentLanguage} className="text-muted-foreground text-xs">
                  {currentLanguage === 'ar' ? 'الموعد' : 'Date'}
                </Label>
                <BodySmall lang={currentLanguage} className="font-medium">
                  {isValid(new Date(date))
                    ? format(new Date(date), 'EEEE, d MMMM', { locale: currentLanguage === 'ar' ? ar : undefined })
                    : date}
                </BodySmall>
              </div>
            </div>
          )}
        </div>

        {/* Status Message - Buyer View: Only show completion photos, no status banner */}
        {!hidePrimaryActions && sellerMarkedComplete && !buyerMarkedComplete && userRole === "buyer" && (
          <div className="space-y-3">
            {/* Completion Photos Gallery */}
            {completionPhotos && completionPhotos.length > 0 && (
              <div className="space-y-2">
                <Label lang={currentLanguage} className="text-muted-foreground text-xs">
                  {currentLanguage === 'ar' ? 'صور إتمام العمل' : 'Work Completion Photos'}
                </Label>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {completionPhotos.map((photo, idx) => (
                    <div key={idx} className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-muted">
                      <img src={photo} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* No "waiting for buyer" banner for buyers - they see the confirm button in BuyerJobDetail instead */}
          </div>
        )}

        {!hidePrimaryActions && (sellerMarkedComplete && userRole === "seller") && (
          <div className="space-y-3">
            {/* Completion Photos Gallery */}
            {completionPhotos && completionPhotos.length > 0 && (
              <div className="space-y-2">
                <Label lang={currentLanguage} className="text-muted-foreground text-xs">
                  {currentLanguage === 'ar' ? 'صور إتمام العمل' : 'Work Completion Photos'}
                </Label>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {completionPhotos.map((photo, idx) => (
                    <div key={idx} className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-muted">
                      <img src={photo} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
              <BodySmall lang={currentLanguage} className="text-primary text-center">
                {t.waitingBuyer}
              </BodySmall>
            </div>
          </div>
        )}

        {!hidePrimaryActions && !sellerMarkedComplete && userRole === "buyer" && (
          <div className="p-3 rounded-2xl bg-muted/50">
            <BodySmall lang={currentLanguage} className="text-muted-foreground text-center">
              {t.waitingSeller}
            </BodySmall>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          {/* Seller Actions */}
          {!hidePrimaryActions && userRole === "seller" && !sellerMarkedComplete && (
            <>
              {!sellerOnWayAt && (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSellerOnWay();
                  }}
                  disabled={updateStatusMutation.isPending}
                  className="w-full h-12 rounded-full"
                  variant="outline"
                >
                  <Truck size={18} className="mr-2" />
                  {t.onMyWay}
                </Button>
              )}

              {sellerOnWayAt && !workStartedAt && (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartWork();
                  }}
                  disabled={updateStatusMutation.isPending}
                  className="w-full h-12 rounded-full"
                >
                  <Play size={18} className="mr-2" />
                  {t.startWork}
                </Button>
              )}

              {workStartedAt && !sellerMarkedComplete && (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSellerMarkComplete();
                  }}
                  disabled={updateStatusMutation.isPending}
                  className="w-full h-12 rounded-full"
                >
                  <CheckCircle size={18} className="mr-2" />
                  {t.markComplete}
                </Button>
              )}
            </>
          )}

          {/* Buyer Actions */}
          {!hidePrimaryActions && userRole === "buyer" && sellerMarkedComplete && !buyerMarkedComplete && (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                handleBuyerConfirmComplete();
              }}
              disabled={updateStatusMutation.isPending}
              className="w-full h-14 rounded-full bg-gradient-to-r from-green-600 to-green-500 text-white hover:opacity-90"
            >
              <CheckCircle size={20} className="mr-2" />
              {t.confirmComplete}
            </Button>
          )}

          {/* Report Issue Button (for both roles) - Visible at all stages */}
          <Button
            onClick={(e) => {
              e.stopPropagation();
              setShowIssueModal(true);
            }}
            variant="outline"
            className="w-full h-12 rounded-full border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
          >
            <AlertTriangle size={18} className="mr-2" />
            {t.reportIssue}
          </Button>
        </div>
      </div>

      <Dialog open={showIssueModal} onOpenChange={setShowIssueModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.issueTitle}</DialogTitle>
            <DialogDescription>
              {t.issueDesc}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={issueReason}
              onChange={(e) => setIssueReason(e.target.value)}
              placeholder={t.issuePlaceholder}
              className="min-h-[120px]"
            />
          </div>
          <DialogFooter className="flex-row gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setShowIssueModal(false)}
              className="flex-1 sm:flex-none"
            >
              {t.cancel}
            </Button>
            <Button
              onClick={handleReportIssue}
              className="flex-1 sm:flex-none bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t.submit}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Photo Proof Modal - for Seller to provide proof of completed work */}
      <PhotoProofModal
        isOpen={showPhotoProof}
        onClose={() => setShowPhotoProof(false)}
        requestId={jobId}
        currentLanguage={currentLanguage}
        onComplete={handleSellerPhotoProofComplete}
        userRole="seller"
      />

      {/* Job Completion Ceremony - shows "Your home is taken care of" for buyer */}
      {showCompletionSheet && (
        <JobCompletionSheet
          currentLanguage={currentLanguage}
          jobTitle={title}
          providerName={sellerName}
          providerId={sellerId}
          finalAmount={0} // Will be passed from parent in real usage
          location={location}
          onContinueToReview={() => {
            setShowCompletionSheet(false);
            navigate(`/app/buyer/request/${jobId}?focusReview=1`);
          }}
          onSkip={() => {
            setShowCompletionSheet(false);
            navigate('/app/buyer/home');
          }}
        />
      )}
    </SoftCard>
  );
};
