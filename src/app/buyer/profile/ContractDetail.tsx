import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/hooks/useCurrency";
import { SoftCard } from "@/components/mobile/SoftCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import {
  FileText, Calendar, DollarSign, Users, CheckCircle, Download, XCircle,
  ArrowLeft, PenTool, Clock, MapPin, Briefcase, Image as ImageIcon, ShieldCheck,
  Sun, Sunset, Moon
} from "lucide-react";
import { SignatureModal } from "@/components/SignatureModal";
import { ContractDownloadButton } from "@/components/mobile/ContractDownloadButton";
import { GeneralTerms } from "@/components/contracts/GeneralTerms";
import { toast } from "sonner";
import { SAUDI_CITIES_BILINGUAL } from "@/lib/saudiCities";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { formatDuration } from "@/utils/formatDuration";

interface ContractDetailProps {
  currentLanguage: "en" | "ar";
}

export const ContractDetail = ({ currentLanguage }: ContractDetailProps) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { formatAmount } = useCurrency();
  const queryClient = useQueryClient();

  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);

  const { data: contract, isLoading, error: queryError } = useQuery({
    queryKey: ["contract-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select(`
          *,
          binding_terms(*),
          buyer:profiles!contracts_buyer_id_fkey(*),
          seller:profiles!contracts_seller_id_fkey(*),
          contract_signatures(*),
          quote:quote_submissions!contracts_quote_id_fkey(*),
          maintenance_request:maintenance_requests!contracts_request_id_fkey(
            title, title_ar, description, description_ar, category, city, location, photos
          ),
          booking:booking_requests!contracts_booking_id_fkey(
            job_description, service_category, location_city, photos, seller_response, seller_counter_proposal, proposed_start_date, final_amount, preferred_time_slot
          )
        `)
        .eq("id", id)
        .maybeSingle();

      if (error) {
        console.error("[ContractDetail] Query error:", error);
        throw error;
      }
      return data;
    },
    enabled: !!id,
  });

  const t = {
    draftContract: currentLanguage === 'ar' ? 'تفاصيل العقد' : 'Contract Details',
    quote: currentLanguage === 'ar' ? 'العرض' : 'Quote',
    review: currentLanguage === 'ar' ? 'مراجعة' : 'Review',
    work: currentLanguage === 'ar' ? 'العمل' : 'Work',
    serviceAgreement: currentLanguage === 'ar' ? 'اتفاقية خدمة' : 'Service Agreement',
    between: currentLanguage === 'ar' ? 'بين المشتري' : 'Between Buyer',
    andProvider: currentLanguage === 'ar' ? 'ومقدم الخدمة' : 'and Provider',
    reqDesc: currentLanguage === 'ar' ? 'وصف الطلب' : 'Request Description',
    quoteDesc: currentLanguage === 'ar' ? 'وصف العرض' : 'Quote Description',
    timelineLoc: currentLanguage === 'ar' ? 'الجدول الزمني والموقع' : 'Timeline & Location',
    startDate: currentLanguage === 'ar' ? 'تاريخ البدء' : 'Start Date',
    duration: currentLanguage === 'ar' ? 'المدة' : 'Duration',
    buyerDocs: currentLanguage === 'ar' ? 'مستندات المشتري' : 'Buyer Supporting Documents',
    financials: currentLanguage === 'ar' ? 'التفاصيل المالية' : 'Financials',
    subtotal: currentLanguage === 'ar' ? 'المجموع الفرعي' : 'Subtotal',
    total: currentLanguage === 'ar' ? 'الإجمالي' : 'Total',
    buyerSig: currentLanguage === 'ar' ? 'توقيع المشتري' : 'Buyer Signature',
    providerSig: currentLanguage === 'ar' ? 'توقيع مقدم الخدمة' : 'Provider Signature',
    signed: currentLanguage === 'ar' ? 'تم التوقيع' : 'Signed',
    pending: currentLanguage === 'ar' ? 'قيد الانتظار' : 'Pending',
    acceptSign: currentLanguage === 'ar' ? 'قبول وتوقيع' : 'Accept & Sign',
    rejectContract: currentLanguage === 'ar' ? 'رفض العقد' : 'Reject Contract',
    rejectConfirmTitle: currentLanguage === 'ar' ? 'رفض العقد؟' : 'Reject Contract?',
    rejectConfirmDesc: currentLanguage === 'ar' ? 'لا يمكن التراجع عن هذا الإجراء.' : 'This action cannot be undone.',
    confirmReject: currentLanguage === 'ar' ? 'نعم، رفض' : 'Yes, Reject',
    cancel: currentLanguage === 'ar' ? 'إلغاء' : 'Cancel',
    download: currentLanguage === 'ar' ? 'تحميل العقد' : 'Download Contract',
    withdrawSignature: currentLanguage === 'ar' ? 'سحب التوقيع' : 'Withdraw Signature',
    withdrawConfirmTitle: currentLanguage === 'ar' ? 'سحب التوقيع؟' : 'Withdraw Signature?',
    withdrawConfirmDesc: currentLanguage === 'ar' ? 'هل أنت متأكد من سحب توقيعك؟ سيتم إلغاء حالة العقد والعودة إلى حالة العرض.' : 'Are you sure you want to withdraw your signature? The contract will be cancelled and reverted to quote status.',
    noDescription: currentLanguage === 'ar' ? 'لا يوجد وصف' : 'No description',
    directBooking: currentLanguage === 'ar' ? 'حجز مباشر' : 'Direct booking',
    timeSlot: currentLanguage === 'ar' ? 'الوقت' : 'Time Preference',
    tbd: currentLanguage === 'ar' ? 'غير محدد' : 'TBD',
    serviceType: currentLanguage === 'ar' ? 'نوع الخدمة' : 'Service Type',
    morning: currentLanguage === 'ar' ? 'صباحاً' : 'Morning',
    afternoon: currentLanguage === 'ar' ? 'ظهراً' : 'Afternoon',
    night: currentLanguage === 'ar' ? 'مساءً' : 'Night',
  };

  const acceptMutation = useMutation({
    mutationFn: async (signatureData: string) => {
      const { error: sigError } = await supabase.from("contract_signatures").insert({
        contract_id: id!,
        user_id: user!.id,
        version: contract!.version,
        signature_hash: signatureData,
        signature_method: "digital",
      });
      if (sigError) throw sigError;

      const { error: updateError } = await supabase
        .from("contracts")
        .update({ signed_at_buyer: new Date().toISOString() })
        .eq("id", id);
      if (updateError) throw updateError;

      const { data: updatedContract } = await supabase
        .from("contracts")
        .select("signed_at_buyer, signed_at_seller")
        .eq("id", id)
        .single();

      if (updatedContract?.signed_at_buyer && updatedContract?.signed_at_seller) {
        // Update contract status
        await supabase.from("contracts").update({
          status: "executed",
          executed_at: new Date().toISOString(),
        }).eq("id", id);

        // Also update associated booking request if exists
        if (contract?.booking_id) {
          await supabase.from("booking_requests")
            .update({ status: "accepted" })
            .eq("id", contract.booking_id);

          // Notify seller about final acceptance
          await supabase.from("notifications").insert({
            user_id: contract.seller_id,
            title: currentLanguage === "ar" ? "تم تفعيل العقد" : "Contract Executed",
            message: currentLanguage === "ar" ? "تم توقيع العقد من قبل الطرفين وأصبح الحجز نشطاً" : "Both parties have signed the contract. The booking is now active.",
            notification_type: "contract_executed",
            content_id: contract.booking_id,
          });
        }
      }
    },
    onSuccess: () => {
      toast.success(currentLanguage === "ar" ? "تم التوقيع!" : "Signed!");
      queryClient.invalidateQueries({ queryKey: ["contract-detail", id] });
      navigate("/app/buyer/home");
    },
    onError: (error: any) => {
      toast.error(currentLanguage === "ar" ? `فشل التوقيع` : `Failed to sign`);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      await supabase.from("contracts").update({ status: "rejected" }).eq("id", id);
      await supabase.from("quote_submissions").update({ status: "rejected" }).eq("id", contract!.quote_id);
    },
    onSuccess: () => {
      toast.success(currentLanguage === "ar" ? "تم الرفض" : "Rejected");
      queryClient.invalidateQueries({ queryKey: ["contract-detail", id] });
      navigate("/app/buyer/home");
    },
  });

  // Withdraw signature mutation
  const withdrawMutation = useMutation({
    mutationFn: async () => {
      console.log('[WithdrawMutation] Starting withdrawal for contract:', id);

      // Validate contract exists and is still in pending_seller state
      const { data: currentContract, error: checkError } = await supabase
        .from("contracts")
        .select("status, quote_id, booking_id")
        .eq("id", id)
        .single();

      if (checkError || !currentContract) {
        console.log('[WithdrawMutation] Contract not found or already deleted');
        return { alreadyWithdrawn: true };
      }

      if (currentContract.status !== 'pending_seller') {
        throw new Error(currentLanguage === "ar"
          ? "لا يمكن سحب التوقيع - حالة العقد تغيرت"
          : "Cannot withdraw - contract status changed");
      }

      // First delete binding_terms (foreign key constraint)
      await supabase.from("binding_terms").delete().eq("contract_id", id);

      // Delete the contract
      const { error: contractError } = await supabase
        .from("contracts")
        .delete()
        .eq("id", id);

      if (contractError) {
        throw new Error(currentLanguage === "ar" ? "خطأ في حذف العقد" : "Error deleting contract");
      }

      // Verify contract deletion
      const { data: verifyContract } = await supabase
        .from("contracts")
        .select("id")
        .eq("id", id)
        .maybeSingle();

      if (verifyContract) {
        throw new Error(currentLanguage === "ar" ? "فشل حذف العقد" : "Failed to delete contract");
      }

      // Revert quote to pending
      if (currentContract.quote_id) {
        await supabase
          .from("quote_submissions")
          .update({ status: "pending" })
          .eq("id", currentContract.quote_id);
      } else if (currentContract.booking_id) {
        // Booking status should ostensibly be reverted to 'seller_responded' if it was changed
        // But in our improved flow, it STAYS 'seller_responded' until full execution.
        // However, just to be safe in case of any drift:
        await supabase
          .from("booking_requests")
          .update({ status: "seller_responded" })
          .eq("id", currentContract.booking_id);
      }

      // Notify seller
      try {
        await supabase.from("notifications").insert({
          user_id: contract!.seller_id,
          title: currentLanguage === "ar" ? "تم سحب التوقيع" : "Signature Withdrawn",
          message: currentLanguage === "ar" ? "سحب المشتري توقيعه من العقد" : "Buyer withdrew their signature from the contract",
          notification_type: "contract_updated",
          content_id: currentContract.quote_id || id,
        });
      } catch (e) {
        console.error('Notification error:', e);
      }
    },
    onSuccess: () => {
      toast.success(currentLanguage === "ar" ? "تم سحب التوقيع" : "Signature withdrawn");
      queryClient.invalidateQueries({ queryKey: ["contract-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["buyer-requests"] });
      queryClient.invalidateQueries({ queryKey: ["quote-detail"] });

      if (contract?.quote_id) {
        navigate(`/app/buyer/quote/${contract.quote_id}`);
      } else if (contract?.booking_id) {
        navigate(`/app/buyer/booking/${contract.booking_id}`);
      } else {
        navigate("/app/buyer/home");
      }
    },
    onError: (error: any) => {
      console.error('Withdraw error:', error);
      toast.error(error.message || (currentLanguage === "ar" ? "فشل سحب التوقيع" : "Failed to withdraw signature"));
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <p className="text-muted-foreground">{currentLanguage === 'ar' ? 'العقد غير موجود' : 'Contract not found'}</p>
      </div>
    );
  }

  const terms = Array.isArray(contract.binding_terms) ? contract.binding_terms[0] : contract.binding_terms;
  const quote = Array.isArray(contract.quote) ? contract.quote[0] : contract.quote;
  const mr = contract.maintenance_request as any;
  const booking = contract.booking as any;
  const metadata = contract.metadata as any;

  // Detect contract type
  const isBookingContract = !!contract.booking_id;

  const sellerCounterProposal = booking?.seller_counter_proposal;

  // Unified display values with fallback hierarchy
  // Helper to clean description
  const cleanDescription = (text: string | undefined | null) => {
    if (!text) return t.noDescription;
    return text
      .replace(/\[Flexible Date\]/gi, '')
      .replace(/\[تاريخ مرن\]/g, '')
      .replace(/\[Flexible Time\]/gi, '')
      .replace(/\[وقت مرن\]/g, '')
      .replace(/\[ASAP\]/gi, '')
      .replace(/\[عاجل\]/g, '')
      .replace(/Time Window: \w+/gi, '')
      .trim() || t.noDescription;
  };

  const requestDescription = cleanDescription(
    isBookingContract
      ? (booking?.job_description || metadata?.job_description)
      : mr?.description
  );

  const quoteProposal = isBookingContract
    ? (booking?.seller_response || sellerCounterProposal?.notes || metadata?.notes || t.directBooking)
    : quote?.proposal;

  const priceValue = isBookingContract
    ? (metadata?.final_price || sellerCounterProposal?.price || booking?.final_amount || 0)
    : (quote?.price || 0);

  const startDate = isBookingContract
    ? (metadata?.scheduled_date || sellerCounterProposal?.scheduled_date || booking?.proposed_start_date)
    : terms?.start_date;

  const timeSlot = metadata?.time_preference || sellerCounterProposal?.time_preference || booking?.preferred_time_slot;
  const serviceCategory = metadata?.service_category || booking?.service_category;
  const photos = isBookingContract ? booking?.photos : mr?.photos;

  // City localization
  // City localization
  const rawCity = (isBookingContract ? (booking?.location_city || metadata?.location_city) : mr?.city || "");
  const cityKey = rawCity.toLowerCase();
  const cityObj = SAUDI_CITIES_BILINGUAL.find(c => c.en.toLowerCase() === cityKey);
  const displayCity = currentLanguage === 'ar' ? (cityObj?.ar || rawCity) : (cityObj?.en || rawCity);

  const rawAddress = (contract.metadata as any)?.location_address || booking?.location_address || mr?.location;
  const displayLocation = (rawAddress && rawAddress.toLowerCase() !== cityKey && displayCity)
    ? `${rawAddress}, ${displayCity}`
    : (rawAddress || displayCity || t.tbd);

  // Helper for time slot label
  const getTimeLabel = (slot: string) => {
    const labels: Record<string, string> = {
      morning: t.morning,
      afternoon: t.afternoon,
      night: t.night,
    };
    return labels[slot] || slot;
  };

  // Signature and status checks
  const isBuyerSigned = !!contract.signed_at_buyer;
  const isSellerSigned = !!contract.signed_at_seller;
  const isExecuted = contract.status === 'executed';
  const needsAction = !isBuyerSigned;
  const canWithdraw = isBuyerSigned && !isSellerSigned && contract.status === 'pending_seller';

  return (
    <motion.div
      className="min-h-screen bg-paper pb-32 font-sans"
      dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {/* Header */}
      <div className="bg-white sticky top-0 z-10 border-b border-gray-100">
        <div className="px-4 h-14 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => {
            if (contract?.quote_id) navigate(`/app/buyer/quote/${contract.quote_id}`);
            else if (contract?.booking_id) navigate(`/app/buyer/booking/${contract.booking_id}`);
            else navigate(-1);
          }} className="shrink-0">
            <ArrowLeft className="w-5 h-5 text-ink" />
          </Button>
          <div className="flex-1 text-center font-semibold text-lg text-ink">
            {t.draftContract}
          </div>
          <div className="w-9" />
        </div>

        {/* Stepper */}
        <div className="px-8 pb-4">
          <div className="flex items-center justify-between relative max-w-[280px] mx-auto">
            <div className="absolute top-4 left-0 w-full -translate-y-1/2 flex items-center -z-10 px-4">
              <div className="flex-1 h-[2px] bg-primary" />
              <div className={`flex-1 h-[2px] ${isExecuted ? 'bg-primary' : 'bg-gray-100'}`} />
            </div>

            <div className="flex flex-col items-center gap-1 bg-white px-1 z-10">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white ring-4 ring-white">
                <CheckCircle size={16} />
              </div>
              <span className="text-[10px] font-medium text-primary uppercase tracking-wider">{t.quote}</span>
            </div>

            <div className="flex flex-col items-center gap-1 bg-white px-1 z-10">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ring-4 ${isExecuted ? 'bg-primary ring-white' : 'bg-primary ring-primary/10'}`}>
                {isExecuted ? <CheckCircle size={16} /> : <FileText size={16} />}
              </div>
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider">{t.review}</span>
            </div>

            <div className="flex flex-col items-center gap-1 bg-white px-1 z-10">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ring-4 ring-white ${isExecuted ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'}`}>
                <Briefcase size={16} />
              </div>
              <span className={`text-[10px] font-medium uppercase tracking-wider ${isExecuted ? 'text-primary font-bold' : 'text-muted-foreground'}`}>{t.work}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-lg mx-auto pb-40">
        <>
          {/* Main Contract Details Card */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden relative">
            {/* Decorative Watermark */}
            <div className="absolute top-4 right-4 opacity-[0.04] pointer-events-none z-0">
              <ShieldCheck size={100} className="text-primary" />
            </div>

            {/* Header Section */}
            <div className="p-6 pb-2 text-center">
              <div className="w-16 h-16 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
                <PenTool size={28} />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-6">{t.serviceAgreement}</h2>

              {/* Parties Box */}
              <div className="bg-primary/5 rounded-2xl p-5 border border-primary/10">
                <div className="text-sm text-muted-foreground mb-1">{t.between}</div>
                <div className="font-bold text-lg text-foreground mb-3">{(contract.buyer as any)?.full_name || 'Buyer'}</div>
                <div className="text-sm text-muted-foreground mb-1">{t.andProvider}</div>
                <div className="font-bold text-lg text-primary">{(contract.seller as any)?.company_name || (contract.seller as any)?.full_name || 'Provider'}</div>
              </div>
            </div>

            {/* Content Section */}
            <div className="p-5 space-y-8">
              {/* Service Category (Booking Only) */}
              {isBookingContract && serviceCategory && (
                <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-2xl border border-primary/10">
                  <div className="w-14 h-14 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-3xl">
                    {serviceCategory === 'plumbing' && '🔧'}
                    {serviceCategory === 'electrical' && '⚡'}
                    {serviceCategory === 'cleaning' && '🧹'}
                    {serviceCategory === 'ac_services' && '❄️'}
                    {serviceCategory === 'painting' && '🎨'}
                    {serviceCategory === 'carpentry' && '🪚'}
                    {serviceCategory === 'moving' && '📦'}
                    {serviceCategory === 'gardening' && '🌱'}
                    {!['plumbing', 'electrical', 'cleaning', 'ac_services', 'painting', 'carpentry', 'moving', 'gardening'].includes(serviceCategory) && '🛠️'}
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">{t.serviceType}</span>
                    <p className="font-bold text-lg text-foreground">{serviceCategory.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</p>
                  </div>
                </div>
              )}

              {isBookingContract && serviceCategory && <div className="h-px bg-gray-100 w-full" />}

              {/* Request Description */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <FileText size={18} className="text-primary" />
                  <span className="text-sm font-bold text-foreground uppercase tracking-wider">{t.reqDesc}</span>
                </div>
                <div className="bg-muted/40 p-4 rounded-xl text-sm text-foreground/80 leading-relaxed border border-gray-100">
                  {requestDescription}
                </div>
              </div>

              <div className="h-px bg-gray-100 w-full" />

              {/* Quote Description */}
              {quoteProposal && (
                <>
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <FileText size={18} className="text-primary" />
                      <span className="text-sm font-bold text-foreground uppercase tracking-wider">{t.quoteDesc}</span>
                    </div>
                    <div className="bg-muted/40 p-4 rounded-xl text-sm text-foreground/80 leading-relaxed border border-gray-100">
                      {quoteProposal}
                    </div>
                  </div>
                  <div className="h-px bg-gray-100 w-full" />
                </>
              )}

              {/* Timeline & Location */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Calendar size={18} className="text-primary" />
                  <span className="text-sm font-bold text-foreground uppercase tracking-wider">{t.timelineLoc}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="bg-muted/40 p-3 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                      <Calendar size={12} />
                      <span>{t.startDate}</span>
                    </div>
                    <div className="font-semibold text-foreground">
                      {startDate ? new Date(startDate).toLocaleDateString() : t.tbd}
                    </div>
                  </div>
                  <div className="bg-muted/40 p-3 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                      <Clock size={12} />
                      <span>{isBookingContract ? t.timeSlot : t.duration}</span>
                    </div>
                    <div className="font-semibold text-foreground flex items-center gap-2">
                      {isBookingContract ? (
                        <>
                          {timeSlot === 'morning' && <Sun size={14} className="text-amber-500" />}
                          {timeSlot === 'afternoon' && <Sunset size={14} className="text-orange-500" />}
                          {timeSlot === 'night' && <Moon size={14} className="text-indigo-500" />}
                          {timeSlot ? getTimeLabel(timeSlot) : t.tbd}
                        </>
                      ) : (
                        formatDuration(quote?.estimated_duration, currentLanguage)
                      )}
                    </div>
                  </div>
                </div>
                <div className="bg-muted/40 p-3 rounded-xl border border-gray-100 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-primary shrink-0 shadow-sm">
                    <MapPin size={16} />
                  </div>
                  <div>
                    <div className="font-semibold text-foreground text-sm">{displayLocation}</div>
                  </div>
                </div>
              </div>

              <div className="h-px bg-gray-100 w-full" />

              {/* Financials */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign size={18} className="text-primary" />
                  <span className="text-sm font-bold text-foreground uppercase tracking-wider">{t.financials}</span>
                </div>
                <div className="bg-muted/40 p-4 rounded-xl border border-gray-100 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t.subtotal}</span>
                    <span className="font-medium">{formatAmount(priceValue, "SAR", 2)}</span>
                  </div>
                  <div className="h-px bg-gray-200" />
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-foreground">{t.total}</span>
                    <span className="text-xl font-bold text-primary">{formatAmount(priceValue, "SAR", 2)}</span>
                  </div>
                </div>
              </div>

              <div className="h-px bg-gray-100 w-full" />

              {/* Buyer Documents */}
              {(mr?.photos || booking?.photos) && (mr?.photos || booking?.photos).length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Briefcase size={18} className="text-primary" />
                    <span className="text-sm font-bold text-foreground uppercase tracking-wider">{t.buyerDocs}</span>
                  </div>
                  <div className="space-y-2">
                    {(mr?.photos || booking?.photos || []).map((url: string, idx: number) => (
                      <div key={idx} className="bg-muted/40 p-3 rounded-xl border border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-primary shrink-0 shadow-sm">
                            <ImageIcon size={20} />
                          </div>
                          <span className="text-sm font-medium truncate max-w-[200px]">{url.split('/').pop()}</span>
                        </div>
                        <a href={url} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="icon" className="text-muted-foreground">
                            <Download size={16} />
                          </Button>
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(mr?.photos || booking?.photos) && (mr?.photos || booking?.photos).length > 0 && <div className="h-px bg-gray-100 w-full" />}

              {/* Terms Component */}
              <GeneralTerms currentLanguage={currentLanguage} />
            </div>
          </div>

          {/* Signature Status Card */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-4">
            <h3 className="font-bold text-ink text-center mb-2">{currentLanguage === 'ar' ? 'حالة التوقيع' : 'Signature Status'}</h3>

            <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", isBuyerSigned ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400")}>
                  {isBuyerSigned ? <CheckCircle size={20} /> : <PenTool size={20} />}
                </div>
                <div>
                  <div className="text-sm font-semibold text-ink">{t.buyerSig}</div>
                  <div className={cn("text-xs", isBuyerSigned ? "text-green-600" : "text-muted-foreground")}>
                    {isBuyerSigned ? `${t.signed} ${format(new Date(contract.signed_at_buyer), 'MMM d, h:mm a')}` : t.pending}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", isSellerSigned ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400")}>
                  {isSellerSigned ? <CheckCircle size={20} /> : <PenTool size={20} />}
                </div>
                <div>
                  <div className="text-sm font-semibold text-ink">{t.providerSig}</div>
                  <div className={cn("text-xs", isSellerSigned ? "text-green-600" : "text-muted-foreground")}>
                    {isSellerSigned ? `${t.signed} ${format(new Date(contract.signed_at_seller), 'MMM d, h:mm a')}` : t.pending}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      </div>

      {/* Bottom Action Bar */}
      {(needsAction || canWithdraw) && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
          <div className="max-w-md mx-auto space-y-3">
            {needsAction ? (
              <>
                <Button
                  size="lg"
                  className="w-full rounded-full bg-primary hover:bg-primary/90 text-white font-semibold shadow-lg h-12"
                  onClick={() => setShowSignatureModal(true)}
                >
                  <CheckCircle size={18} className="mr-2" />
                  {t.acceptSign}
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  className="w-full rounded-full text-destructive hover:bg-destructive/10 h-11"
                  onClick={() => setShowRejectConfirm(true)}
                >
                  <XCircle size={18} className="mr-2" />
                  {t.rejectContract}
                </Button>
              </>
            ) : canWithdraw ? (
              <Button
                variant="outline"
                size="lg"
                className="w-full rounded-full border-amber-200 text-amber-700 hover:bg-amber-50 h-12"
                onClick={() => setShowWithdrawConfirm(true)}
              >
                <XCircle size={18} className="mr-2" />
                {t.withdrawSignature}
              </Button>
            ) : null}
          </div>
        </div>
      )}

      {/* Signature Modal */}
      <SignatureModal
        open={showSignatureModal}
        onClose={() => setShowSignatureModal(false)}
        onSave={async (sigData) => {
          await acceptMutation.mutateAsync(sigData.data);
        }}
        currentLanguage={currentLanguage}
        defaultName={contract?.buyer?.full_name || ""}
      />

      {/* Reject Confirmation Dialog */}
      <Dialog open={showRejectConfirm} onOpenChange={setShowRejectConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.rejectConfirmTitle}</DialogTitle>
            <DialogDescription>{t.rejectConfirmDesc}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowRejectConfirm(false)}>
              {t.cancel}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                rejectMutation.mutate();
                setShowRejectConfirm(false);
              }}
              disabled={rejectMutation.isPending}
            >
              {t.confirmReject}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Withdraw Confirmation Dialog */}
      <Dialog open={showWithdrawConfirm} onOpenChange={setShowWithdrawConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.withdrawConfirmTitle}</DialogTitle>
            <DialogDescription>{t.withdrawConfirmDesc}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowWithdrawConfirm(false)}>
              {t.cancel}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                withdrawMutation.mutate();
                setShowWithdrawConfirm(false);
              }}
              disabled={withdrawMutation.isPending}
            >
              {t.withdrawSignature}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};
