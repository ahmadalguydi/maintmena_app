import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/hooks/useCurrency";
import { SoftCard } from "@/components/mobile/SoftCard";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { GradientHeader } from "@/components/mobile/GradientHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  Star,
  Clock,
  DollarSign,
  MessageCircle,
  MessageSquare,
  Calendar,
  User,
  FileText,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Edit,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import RevisionRequestModal from "@/components/RevisionRequestModal";
import { formatDuration } from "@/utils/formatDuration";
import { BookingConfirmedSheet } from "@/components/mobile/BookingConfirmedSheet";
import { cn } from "@/lib/utils";
import { useCelebration } from "@/contexts/CelebrationContext";

interface QuoteDetailProps {
  currentLanguage: "en" | "ar";
}

export const QuoteDetail = ({ currentLanguage }: QuoteDetailProps) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { formatAmount } = useCurrency();
  const queryClient = useQueryClient();
  const { celebrate } = useCelebration();
  const isArabic = currentLanguage === "ar";

  const [showRevisionRequest, setShowRevisionRequest] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [showBookingConfirmed, setShowBookingConfirmed] = useState(false);
  const [createdContractId, setCreatedContractId] = useState<string | null>(null);
  const [contractScope, setContractScope] = useState("");
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);

  const rejectMutation = useMutation({
    mutationFn: async () => {
      const { error: quoteError } = await supabase
        .from("quote_submissions")
        .update({ status: "rejected" })
        .eq("id", id);

      if (quoteError) throw quoteError;

      const { error: requestError } = await supabase
        .from("maintenance_requests")
        .update({ status: "open" })
        .eq("id", quote?.request_id);

      if (requestError) throw requestError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quote-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["buyer-requests"] });
      toast.success(isArabic ? "تم رفض العرض" : "Quote rejected");
      navigate(-1);
    },
    onError: (error) => {
      console.error("Reject error:", error);
      toast.error(isArabic ? "فشل رفض العرض" : "Failed to reject quote");
    },
  });

  const { data: quote, isLoading } = useQuery({
    queryKey: ["quote-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quote_submissions")
        .select("*, maintenance_requests(*)")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const { data: sellerData } = await supabase.from("profiles").select("*").eq("id", data.seller_id).single();

      // Check if there's a contract pending seller signature
      const { data: contractData } = await supabase
        .from("contracts")
        .select("id, status, signed_at_buyer, signed_at_seller")
        .eq("quote_id", id)
        .maybeSingle();

      // Check if there's any active contract for this request (associated with ANOTHER quote)
      let otherActiveContract = null;
      if (data.maintenance_requests) {
        const { data: existingContracts } = await supabase
          .from("contracts")
          .select("id, status")
          .eq("request_id", data.request_id)
          .neq("quote_id", id) // Not this quote
          .in("status", ["pending_seller", "pending_buyer", "executed"]) // Active statuses
          .limit(1);

        if (existingContracts && existingContracts.length > 0) {
          otherActiveContract = existingContracts[0];
        }
      }

      // Check if request has an accepted quote from another seller (became active job)
      let isRequestExpired = false;
      if (data.maintenance_requests) {
        const { data: acceptedQuotes } = await supabase
          .from("quote_submissions")
          .select("id")
          .eq("request_id", data.request_id)
          .eq("status", "accepted")
          .neq("id", id)
          .limit(1);

        isRequestExpired = (acceptedQuotes && acceptedQuotes.length > 0);
      }

      // Request is invalid if: doesn't exist, is deleted, is closed, or became an active job
      const requestStatus = (data.maintenance_requests as any)?.status;
      const isRequestInvalid = !data.maintenance_requests ||
        requestStatus === 'closed' ||
        requestStatus === 'deleted' ||
        requestStatus === 'in_progress' ||
        requestStatus === 'completed' ||
        isRequestExpired ||
        !!otherActiveContract;

      return {
        ...data,
        seller: sellerData,
        isRequestInvalid,
        otherActiveContract,
        contract: contractData,
        isAwaitingSellerSignature: contractData?.status === 'pending_seller',
      };
    },
    enabled: !!id,
    staleTime: 0, // Always fetch fresh seller data for avatar
  });

  useEffect(() => {
    if (quote?.maintenance_requests) {
      setContractScope((quote.maintenance_requests as any)?.description || quote.proposal || "");
    }
  }, [quote]);

  const content = {
    en: {
      title: "Quote Details",
      price: "Total Price",
      duration: "Duration",
      startDate: "Start Date",
      proposal: "Proposal",
      breakdown: "Price Breakdown",
      accept: "Accept Quote",
      reject: "Reject",
      rejectConfirm: "Are you sure you want to reject this quote?",
      rejectDesc: "This action will mark the quote as rejected.",
      confirmReject: "Yes, Reject",
      cancel: "Cancel",
      negotiate: "Request Revision",
      pending: "Pending",
      accepted: "Accepted",
      rejected: "Rejected",
      negotiating: "Negotiating",
      viewProfile: "View Profile",
      jobsCompleted: "jobs completed",
      tomorrow: "Tomorrow",
      sar: "SAR",
      requestNewDate: "Request new date",
      noReviews: "No reviews",
      datePassed: "Date Passed",
      quoteExpired: "This quote is no longer valid",
      quoteExpiredDesc: "The request has been closed or assigned to another provider.",
      multipleQuotesError: "One quote at a time",
      multipleQuotesErrorDesc: "You cannot accept more than one quote at the same time. If you want to accept this quote, withdraw the pending contract first.",
      revisionRequested: "Revision Requested",
      yourRevisionRequest: "Your Revision Request",
      awaitingSellerUpdate: "Awaiting seller's update",
      addressedRevision: "Your Previous Request",
      addressed: "Addressed",
      quoteUpdated: "Quote Updated",
      attachments: "Attachments",
      awaitingSellerSignature: "Waiting for seller's signature",
      awaitingSellerSignatureDesc: "You have signed the contract. Waiting for the service provider to sign.",
      viewContract: "View Contract",
    },
    ar: {
      title: "تفاصيل العرض",
      price: "السعر الإجمالي",
      duration: "المدة",
      startDate: "تاريخ البدء",
      proposal: "العرض",
      breakdown: "تفصيل السعر",
      accept: "قبول العرض",
      reject: "رفض",
      rejectConfirm: "هل أنت متأكد من رفض هذا العرض؟",
      rejectDesc: "سيتم وضع علامة على العرض كمرفوض.",
      confirmReject: "نعم، رفض",
      cancel: "إلغاء",
      negotiate: "طلب تعديل",
      pending: "قيد الانتظار",
      accepted: "مقبول",
      rejected: "مرفوض",
      negotiating: "قيد التفاوض",
      viewProfile: "عرض الملف",
      jobsCompleted: "مهمة مكتملة",
      tomorrow: "غداً",
      sar: "ر.س",
      requestNewDate: "اطلب موعد جديد",
      noReviews: "لا يوجد تقييمات",
      datePassed: "الموعد فات",
      quoteExpired: "هذا العرض لم يعد صالحاً",
      quoteExpiredDesc: "تم إغلاق الطلب أو تعيينه لمقدم خدمة آخر.",
      multipleQuotesError: "يمكن قبول عرض واحد فقط",
      multipleQuotesErrorDesc: "لا يمكنك قبول أكثر من عرض واحد في نفس الوقت. إذا كنت ترغب في قبول هذا العرض، قم بسحب العقد المعلق أولاً.",
      revisionRequested: "طلب تعديل مرسل",
      yourRevisionRequest: "طلب التعديل",
      awaitingSellerUpdate: "في انتظار تحديث البائع",
      addressedRevision: "طلبك السابق",
      addressed: "تمت المراجعة",
      quoteUpdated: "تم تحديث العرض",
      attachments: "المرفقات",
      awaitingSellerSignature: "في انتظار توقيع مقدم الخدمة",
      awaitingSellerSignatureDesc: "قمت بتوقيع العقد. في انتظار توقيع مقدم الخدمة.",
      viewContract: "عرض العقد",
    },
  };

  const t = content[currentLanguage];

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "accepted":
        return { variant: "default" as const, label: t.accepted, className: "bg-green-500" };
      case "rejected":
        return { variant: "destructive" as const, label: t.rejected, className: "" };
      case "negotiating":
        return { variant: "secondary" as const, label: t.negotiating, className: "bg-yellow-500 text-white" };
      default:
        return { variant: "outline" as const, label: t.pending, className: "" };
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-28" dir={isArabic ? "rtl" : "ltr"}>
        <GradientHeader title={t.title} showBack onBack={() => navigate(-1)} />
        <div className="px-6 py-6 space-y-4">
          <Skeleton className="h-24 w-full rounded-3xl" />
          <Skeleton className="h-48 w-full rounded-3xl" />
          <Skeleton className="h-32 w-full rounded-3xl" />
        </div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="min-h-screen bg-background pb-28" dir={isArabic ? "rtl" : "ltr"}>
        <GradientHeader title={t.title} showBack onBack={() => navigate(-1)} />
        <div className="px-6 py-20 text-center">
          <p className="text-muted-foreground">{isArabic ? "العرض غير موجود" : "Quote not found"}</p>
        </div>
      </div>
    );
  }

  const statusConfig = getStatusConfig(quote.status);
  const seller = quote.seller;

  return (
    <div className="min-h-screen bg-background pb-32" dir={isArabic ? "rtl" : "ltr"}>
      <GradientHeader title={t.title} showBack onBack={() => navigate(`/app/buyer/request/${quote.request_id}`)} />

      <div className="px-6 py-6 space-y-6">
        {/* Price Card */}
        <SoftCard className="text-center py-6">
          <p className={cn("text-sm text-muted-foreground mb-1", isArabic ? "font-ar-body" : "font-body")}>
            {t.price}
          </p>
          <p className="text-4xl font-bold text-primary">
            {quote.price.toLocaleString()} <span className="text-2xl">{isArabic ? 'ر.س' : 'SAR'}</span>
          </p>

          {/* Price Breakdown Toggle */}
          {quote.pricing_breakdown && (
            <motion.div className="mt-4">
              <button
                onClick={() => setShowBreakdown(!showBreakdown)}
                className="flex items-center gap-2 mx-auto text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <span>{t.breakdown}</span>
                <ChevronDown className={cn("w-4 h-4 transition-transform", showBreakdown && "rotate-180")} />
              </button>

              {showBreakdown && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 pt-4 border-t border-border"
                >
                  <ul className="space-y-2 text-sm">
                    {Object.entries(quote.pricing_breakdown).map(([key, value]: [string, any]) => (
                      <li key={key} className="flex justify-between text-muted-foreground">
                        <span className="capitalize">{key.replace(/_/g, " ")}</span>
                        <span className="font-medium text-foreground">{value.toLocaleString()} {isArabic ? 'ر.س' : 'SAR'}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </motion.div>
          )}
        </SoftCard>

        {/* Awaiting Seller Signature Card */}
        {quote.isAwaitingSellerSignature && (
          <SoftCard
            className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 cursor-pointer"
            onClick={() => navigate(`/app/buyer/contract/${quote.contract?.id}/sign`)}
          >
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium bg-amber-500/20 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    {t.awaitingSellerSignature}
                  </span>
                </div>
                <p className={cn("text-sm text-amber-700 dark:text-amber-300", isArabic ? "font-ar-body" : "font-body")}>
                  {t.awaitingSellerSignatureDesc}
                </p>
                <button className={cn("text-xs text-primary font-medium mt-2", isArabic ? "font-ar-body" : "font-body")}>
                  {t.viewContract} →
                </button>
              </div>
            </div>
          </SoftCard>
        )}

        {/* Seller Card */}
        <SoftCard
          onClick={() => navigate(`/app/buyer/vendor/${seller?.id}`)}
          className="cursor-pointer"
        >
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <img
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${seller?.avatar_seed || seller?.id}`}
              alt=""
              className="size-14 rounded-full object-cover bg-muted border-2 border-background shadow-md"
            />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className={cn(
                  "font-semibold text-foreground truncate",
                  isArabic ? "font-ar-body" : "font-body"
                )}>
                  {seller?.company_name || seller?.full_name}
                </h3>
                {seller?.verified_seller && (
                  <Badge variant="default" className="text-[10px] py-0 px-1.5">PRO</Badge>
                )}
              </div>

              <div className="flex items-center gap-3 mt-1">
                {seller?.seller_rating ? (
                  <div className="flex items-center gap-1 text-sm bg-yellow-500/10 px-2 py-0.5 rounded-full">
                    <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                    <span className="font-medium text-yellow-700 dark:text-yellow-400">{seller.seller_rating.toFixed(1)}</span>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">{t.noReviews}</span>
                )}
              </div>
            </div>
            {/* Arrow indicator */}
            <div className="shrink-0 text-muted-foreground">
              {isArabic ? (
                <ChevronLeft className="w-5 h-5" />
              ) : (
                <ChevronRight className="w-5 h-5" />
              )}
            </div>
          </div>
        </SoftCard>

        {/* Duration and Start Date */}
        <div className="grid grid-cols-2 gap-4">
          <SoftCard className="text-center py-4">
            <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <p className={cn("text-xs text-muted-foreground", isArabic ? "font-ar-body" : "font-body")}>
              {t.duration}
            </p>
            <p className={cn("font-semibold text-foreground", isArabic ? "font-ar-body" : "font-body")}>
              {formatDuration(quote.estimated_duration, currentLanguage)}
            </p>
          </SoftCard>

          <SoftCard className="text-center py-4">
            <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <p className={cn("text-xs text-muted-foreground", isArabic ? "font-ar-body" : "font-body")}>
              {t.startDate}
            </p>
            <div className={cn("font-semibold text-foreground", isArabic ? "font-ar-body" : "font-body")}>
              {(() => {
                const startDateStr = quote.start_date || (quote.proposal?.match(/(?:Proposed|Updated) Start Date: (\d{4}-\d{2}-\d{2})/) || [])[1];
                if (!startDateStr) return t.tomorrow;
                try {
                  const date = new Date(startDateStr);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const isPassed = date < today;

                  return (
                    <div className="flex flex-col items-center">
                      <span className={cn(isPassed && "text-destructive line-through")}>
                        {format(date, "MMMM d", { locale: isArabic ? ar : enUS })}
                      </span>
                      {isPassed && (
                        <div className="flex flex-col items-center mt-1 animate-in fade-in zoom-in duration-300">
                          <span className="text-[10px] font-bold text-destructive bg-destructive/10 px-2 py-0.5 rounded-full mb-0.5">
                            {t.datePassed}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {t.requestNewDate}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                } catch (e) {
                  return t.tomorrow;
                }
              })()}
            </div>
          </SoftCard>
        </div>

        {/* Revision Request Message (if revision_requested - still waiting) */}
        {quote.status === 'revision_requested' && (quote as any).revision_message && (
          <SoftCard className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-3">
              <div className="size-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                <MessageSquare className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className={cn("font-semibold text-amber-800 dark:text-amber-200", isArabic ? "font-ar-body" : "font-body")}>
                    {t.yourRevisionRequest}
                  </h4>
                  <span className="text-xs bg-amber-500/20 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">
                    {t.awaitingSellerUpdate}
                  </span>
                </div>
                <p className={cn("text-sm text-amber-700 dark:text-amber-300 leading-relaxed", isArabic ? "font-ar-body" : "font-body")}>
                  {(quote as any).revision_message}
                </p>
              </div>
            </div>
          </SoftCard>
        )}

        {/* Addressed Revision Request (seller updated the quote) */}
        {quote.status !== 'revision_requested' && (quote as any).revision_message && (
          <SoftCard className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
            <div className="flex items-start gap-3">
              <div className="size-10 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className={cn("font-semibold text-green-800 dark:text-green-200", isArabic ? "font-ar-body" : "font-body")}>
                    {t.addressedRevision}
                  </h4>
                  <span className="text-xs bg-green-500/20 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full">
                    ✓ {t.addressed}
                  </span>
                </div>
                <p className={cn("text-sm text-green-700/70 dark:text-green-300/70 leading-relaxed line-through", isArabic ? "font-ar-body" : "font-body")}>
                  {(quote as any).revision_message}
                </p>

                {/* Show changes if previous values exist */}
                {((quote as any).previous_price || (quote as any).previous_duration) && (
                  <div className="mt-4 pt-3 border-t border-green-200 dark:border-green-800 space-y-2">
                    <p className={cn("text-xs font-medium text-green-600 dark:text-green-400 mb-2", isArabic ? "font-ar-body" : "font-body")}>
                      {isArabic ? 'التغييرات:' : 'Changes:'}
                    </p>

                    {/* Price change */}
                    {(quote as any).previous_price && (quote as any).previous_price !== quote.price && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-green-600 dark:text-green-400">{isArabic ? 'السعر:' : 'Price:'}</span>
                        <span className="line-through text-green-700/50 dark:text-green-300/50">
                          {(quote as any).previous_price.toLocaleString()} {isArabic ? 'ر.س' : 'SAR'}
                        </span>
                        <span className="text-green-600">→</span>
                        <span className="font-semibold text-green-700 dark:text-green-300">
                          {quote.price.toLocaleString()} {isArabic ? 'ر.س' : 'SAR'}
                        </span>
                      </div>
                    )}

                    {/* Duration change */}
                    {(quote as any).previous_duration && (quote as any).previous_duration !== quote.estimated_duration && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-green-600 dark:text-green-400">{isArabic ? 'المدة:' : 'Duration:'}</span>
                        <span className="line-through text-green-700/50 dark:text-green-300/50">
                          {(quote as any).previous_duration}
                        </span>
                        <span className="text-green-600">→</span>
                        <span className="font-semibold text-green-700 dark:text-green-300">
                          {quote.estimated_duration}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <p className={cn("text-xs text-green-600 dark:text-green-400 mt-2", isArabic ? "font-ar-body" : "font-body")}>
                  {t.quoteUpdated}
                </p>
              </div>
            </div>
          </SoftCard>
        )}

        {/* Proposal */}
        {quote.proposal && (
          <SoftCard>
            <div className="flex items-center gap-2 mb-3">
              <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
                <FileText className="w-4 h-4 text-primary" />
              </div>
              <h4 className={cn("font-semibold text-foreground", isArabic ? "font-ar-body" : "font-body")}>
                {t.proposal}
              </h4>
            </div>
            <p className={cn(
              "text-sm text-muted-foreground leading-relaxed",
              isArabic ? "font-ar-body" : "font-body"
            )}>
              {isArabic && quote.proposal_ar ? quote.proposal_ar : quote.proposal}
            </p>
          </SoftCard>
        )}

        {/* Attachments */}
        {quote.attachments && Array.isArray(quote.attachments) && (quote.attachments as string[]).length > 0 && (
          <SoftCard>
            <div className="flex items-center gap-2 mb-3">
              <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
                <FileText className="w-4 h-4 text-primary" />
              </div>
              <h4 className={cn("font-semibold text-foreground", isArabic ? "font-ar-body" : "font-body")}>
                {t.attachments} ({(quote.attachments as string[]).length})
              </h4>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {(quote.attachments as string[]).map((url: string, index: number) => {
                const isImage = url.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                return (
                  <a
                    key={index}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    {isImage ? (
                      <img
                        src={url}
                        alt={`Attachment ${index + 1}`}
                        className="w-full h-24 object-cover rounded-xl border border-border/50 hover:border-primary/50 transition-colors"
                      />
                    ) : (
                      <div className="w-full h-24 rounded-xl border border-border/50 hover:border-primary/50 transition-colors flex flex-col items-center justify-center gap-2 bg-muted/30">
                        <FileText className="w-6 h-6 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Document {index + 1}</span>
                      </div>
                    )}
                  </a>
                );
              })}
            </div>
          </SoftCard>
        )}

        {/* Status Badge with Timestamp */}
        <div className="flex flex-col items-center gap-2">
          <Badge
            variant={statusConfig.variant}
            className={cn("px-4 py-1", statusConfig.className, isArabic ? "font-ar-body" : "font-body")}
          >
            {statusConfig.label}
          </Badge>
          <p className={cn("text-xs text-muted-foreground", isArabic ? "font-ar-body" : "font-body")}>
            {isArabic ? 'تم التقديم: ' : 'Submitted: '}
            {new Date(quote.updated_at || quote.created_at).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })}
          </p>
        </div>
      </div>

      {/* Bottom Actions */}
      {/* Show expired message if request is no longer valid */}
      {quote.isRequestInvalid && (quote.status === "pending" || quote.status === "negotiating") && (
        <div className="fixed bottom-0 left-0 w-full p-4 bg-background/95 backdrop-blur-md border-t border-border z-[101]">
          <div className="w-full max-w-md mx-auto text-center py-2">
            <div className="flex items-center justify-center gap-2 mb-1">
              <XCircle className="w-5 h-5 text-muted-foreground" />
              <span className={cn("font-medium text-muted-foreground", isArabic ? "font-ar-body" : "font-body")}>
                {quote.otherActiveContract ? t.multipleQuotesError : t.quoteExpired}
              </span>
            </div>
            <p className={cn("text-sm text-muted-foreground", isArabic ? "font-ar-body" : "font-body")}>
              {quote.otherActiveContract ? t.multipleQuotesErrorDesc : t.quoteExpiredDesc}
            </p>
          </div>
        </div>
      )}

      {/* Show normal action buttons if request is still valid and revision modal is not open */}
      {!quote.isRequestInvalid && !showRevisionRequest && (quote.status === "pending" || quote.status === "negotiating") && (
        <div className="fixed bottom-0 left-0 w-full p-4 bg-background/95 backdrop-blur-md border-t border-border z-[101]">
          <div className="w-full max-w-md mx-auto space-y-3">
            <div className="flex gap-3">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowRevisionRequest(true)}
                className={cn(
                  "flex-1 h-12 rounded-full border border-primary text-primary font-medium text-sm flex items-center justify-center gap-2",
                  isArabic ? "font-ar-body" : "font-body"
                )}
              >
                <Edit className="w-4 h-4" />
                {t.negotiate}
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={async () => {
                  if (isAccepting) return;
                  setIsAccepting(true);
                  try {
                    // Check for ANY existing contract for this request
                    const { data: existingContract, error: fetchError } = await supabase
                      .from("contracts")
                      .select("id, status, quote_id")
                      .eq("request_id", quote.request_id)
                      .maybeSingle();

                    if (fetchError) throw fetchError;

                    if (existingContract) {
                      // Case 1: Contract already started/executed -> Redirect to it
                      if (existingContract.status !== 'pending_buyer') {
                        toast.info(isArabic ? "يوجد عقد قائم بالفعل لهذا الطلب" : "An active contract already exists for this request");
                        navigate(`/app/buyer/contract/${existingContract.id}/sign`);
                        return;
                      }

                      // Case 2: Draft exists for THIS quote -> Reuse it
                      if (existingContract.quote_id === quote.id) {
                        navigate(`/app/buyer/contract/${existingContract.id}/sign`);
                        return;
                      }

                      // Case 3: Draft exists for ANOTHER quote -> Delete it (switch quotes)
                      const { error: deleteError } = await supabase
                        .from("contracts")
                        .delete()
                        .eq("id", existingContract.id);

                      if (deleteError) throw deleteError;
                    }

                    // Create NEW contract (if no existing or after delete)
                    const { data: contract, error: contractError } = await supabase
                      .from("contracts")
                      .insert({
                        quote_id: quote.id,
                        request_id: quote.request_id,
                        buyer_id: user!.id,
                        seller_id: quote.seller_id,
                        status: "pending_buyer",
                        language_mode: currentLanguage,
                      })
                      .select()
                      .single();

                    if (contractError) throw contractError;

                    // Parse duration safely - default to 7 days if not specified or invalid
                    const durationMatch = quote.estimated_duration?.match(/(\d+)/);
                    const durationDays = durationMatch ? parseInt(durationMatch[1]) : 7;

                    // Use quote's start_date if available, otherwise use today
                    const startDate = quote.start_date || new Date().toISOString().split("T")[0];
                    const startDateObj = new Date(startDate);
                    const completionDateObj = new Date(startDateObj.getTime() + durationDays * 24 * 60 * 60 * 1000);

                    const { error: termsError } = await supabase.from("binding_terms").insert({
                      contract_id: contract.id,
                      start_date: startDate,
                      completion_date: completionDateObj.toISOString().split("T")[0],
                      warranty_days: 90,
                    });

                    if (termsError) throw termsError;

                    // Redirect to contract signing
                    navigate(`/app/buyer/contract/${contract.id}/sign`);

                  } catch (error: any) {
                    console.error("Contract creation failed:", error);
                    toast.error(
                      isArabic
                        ? `فشل إنشاء العقد: ${error.message}`
                        : `Failed to create contract: ${error.message}`,
                    );
                    setIsAccepting(false);
                  }
                }}
                disabled={isAccepting}
                className={cn(
                  "flex-1 h-12 rounded-full bg-primary text-primary-foreground font-medium text-sm flex items-center justify-center gap-2",
                  isArabic ? "font-ar-body" : "font-body",
                  isAccepting && "opacity-50 cursor-not-allowed"
                )}
              >
                {isAccepting ? (
                  <div className="size-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                {t.accept}
              </motion.button>
            </div>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowRejectConfirm(true)}
              className={cn(
                "w-full h-11 rounded-full bg-destructive/10 text-destructive font-medium text-sm flex items-center justify-center gap-2",
                isArabic ? "font-ar-body" : "font-body"
              )}
            >
              <XCircle className="w-4 h-4" />
              {t.reject}
            </motion.button>
          </div>
        </div>
      )}

      {/* Revision Request Modal */}

      {/* Revision Request Modal */}
      <RevisionRequestModal
        open={showRevisionRequest}
        onOpenChange={setShowRevisionRequest}
        quoteId={id || null}
        sellerId={quote?.seller_id || null}
        currentLanguage={currentLanguage}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["quote-detail", id] });
        }}
      />

      {/* Reject Confirmation Dialog */}
      <Dialog open={showRejectConfirm} onOpenChange={setShowRejectConfirm}>
        <DialogContent dir={isArabic ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle className={cn(isArabic ? "font-ar-display" : "font-display")}>
              {t.rejectConfirm}
            </DialogTitle>
            <DialogDescription className={cn(isArabic ? "font-ar-body" : "font-body")}>
              {t.rejectDesc}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 justify-center mt-4">
            <Button
              variant="outline"
              onClick={() => setShowRejectConfirm(false)}
              className={cn(isArabic ? "font-ar-body" : "font-body")}
            >
              {t.cancel}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                rejectMutation.mutate();
                setShowRejectConfirm(false);
              }}
              disabled={rejectMutation.isPending}
              className={cn(isArabic ? "font-ar-body" : "font-body")}
            >
              {t.confirmReject}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Booking Confirmed Sheet */}
      {showBookingConfirmed && quote && (
        <BookingConfirmedSheet
          currentLanguage={currentLanguage}
          providerName={seller?.company_name || seller?.full_name || 'Provider'}
          providerId={seller?.id || ''}
          providerRating={seller?.seller_rating || 0}
          providerJobsCompleted={seller?.completed_projects || 0}
          isVerified={seller?.verified_seller || false}
          amount={quote.price}
          estimatedDuration={formatDuration(quote.estimated_duration, currentLanguage)}
          onContinue={() => {
            setShowBookingConfirmed(false);
            if (createdContractId) {
              navigate(`/app/buyer/contract/${createdContractId}`);
            }
          }}
        />
      )}
    </div>
  );
};
