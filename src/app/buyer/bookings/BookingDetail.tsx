import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { GradientHeader } from "@/components/mobile/GradientHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { JobTrackingCard } from "@/components/mobile/JobTrackingCard";
import { WarrantyCard } from "@/components/mobile/WarrantyCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

import {
  MessageCircle,
  Calendar,
  Sun,
  Sunset,
  Moon,
  MapPin,
  ExternalLink,
  Check,
  X as XIcon,
  FileText,
  DollarSign,
  Clock,
  BadgeCheck,
  Star,
  AlertCircle,
  Pencil,
  ChevronLeft,
  Trash2,
} from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { getCategoryLabel, getCategoryIcon } from "@/lib/serviceCategories";
import { SAUDI_CITIES_BILINGUAL } from "@/lib/saudiCities";
import { sendNotification } from "@/lib/notifications";

interface BookingDetailProps {
  currentLanguage: "en" | "ar";
}

export const BookingDetail = ({ currentLanguage }: BookingDetailProps) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionMessage, setRevisionMessage] = useState("");
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const { data: booking, isLoading } = useQuery<any>({
    queryKey: ["booking-detail", id],
    queryFn: async () => {
      const { data: bookingData, error } = await supabase
        .from("booking_requests")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      if (!bookingData) return null;

      if (bookingData.seller_id) {
        const { data: sellerProfile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", bookingData.seller_id)
          .maybeSingle();

        return { ...bookingData, profiles: sellerProfile };
      }

      return bookingData;
    },
    enabled: !!id,
  });

  const { data: contract } = useQuery({
    queryKey: ["booking-contract", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("contracts")
        .select("*")
        .eq("booking_id", id)
        .maybeSingle();
      return data;
    },
    enabled: !!id,
  });

  const t = {
    title: currentLanguage === "ar" ? "تفاصيل الحجز" : "Booking Details",
    serviceType: currentLanguage === "ar" ? "نوع الخدمة" : "Service Type",
    priceRange: currentLanguage === "ar" ? "نطاق السعر" : "Price Range",
    date: currentLanguage === "ar" ? "التاريخ" : "Date",
    time: currentLanguage === "ar" ? "الوقت" : "Time",
    customerNote: currentLanguage === "ar" ? "وصف الطلب" : "Request Description",
    location: currentLanguage === "ar" ? "الموقع" : "Location",
    openInMaps: currentLanguage === "ar" ? "فتح في الخرائط" : "Open in Maps",
    morning: currentLanguage === "ar" ? "صباحاً" : "Morning",
    afternoon: currentLanguage === "ar" ? "ظهراً" : "Afternoon",
    night: currentLanguage === "ar" ? "مساءً" : "Night",
    flexible: currentLanguage === "ar" ? "مرن" : "Flexible",
    chat: currentLanguage === "ar" ? "محادثة مع البائع" : "Chat with Seller",
    provider: currentLanguage === "ar" ? "مقدم الخدمة" : "Service Provider",
    awaitingResponse: currentLanguage === "ar" ? "في انتظار رد مقدم الخدمة" : "Awaiting provider response",
    providerResponse: currentLanguage === "ar" ? "رد مقدم الخدمة" : "Provider's Response",
    scheduledDate: currentLanguage === "ar" ? "التاريخ المحدد" : "Scheduled Date",
    scheduledTime: currentLanguage === "ar" ? "الوقت المحدد" : "Scheduled Time",
    agreedPrice: currentLanguage === "ar" ? "السعر المتفق" : "Agreed Price",
    providerNotes: currentLanguage === "ar" ? "ملاحظات مقدم الخدمة" : "Provider Notes",
    acceptOffer: currentLanguage === "ar" ? "قبول العرض" : "Accept Offer",
    requestEdit: currentLanguage === "ar" ? "طلب تعديل" : "Request Edit",
    rejectOffer: currentLanguage === "ar" ? "رفض العرض" : "Reject Offer",
    signContract: currentLanguage === "ar" ? "مراجعة وتوقيع العقد" : "Review & Sign Contract",
    contractPending: currentLanguage === "ar" ? "العقد في انتظار التوقيع" : "Contract pending signature",
    revisionSent: currentLanguage === "ar" ? "تم إرسال طلب التعديل" : "Edit request sent",
    awaitingRevision: currentLanguage === "ar" ? "في انتظار تعديل مقدم الخدمة" : "Awaiting provider's revision",
    awaitingSellerSignature: currentLanguage === "ar" ? "بانتظار توقيع مقدم الخدمة" : "Awaiting Provider's Signature",
    awaitingSellerSignatureDesc: currentLanguage === "ar" ? "تم توقيعك على العقد. بانتظار توقيع مقدم الخدمة لإتمام الاتفاقية." : "You've signed the contract. Waiting for provider to sign to complete the agreement.",
    withdrawSignature: currentLanguage === "ar" ? "سحب التوقيع" : "Withdraw Signature",
    viewContract: currentLanguage === "ar" ? "عرض العقد" : "View Contract",
  };

  const getTimePreferenceLabel = (slot: string) => {
    switch (slot) {
      case "morning": return t.morning;
      case "afternoon": return t.afternoon;
      case "night": return t.night;
      default: return slot || t.flexible;
    }
  };

  const getTimePreferenceIcon = (slot: string) => {
    switch (slot) {
      case "morning": return Sun;
      case "afternoon": return Sunset;
      case "night": return Moon;
      default: return Clock;
    }
  };

  const serviceIcon = booking ? getCategoryIcon(booking.service_category) : "🔧";

  // Detect flexible date/time from job_description
  const hasFlexibleDate = !booking?.proposed_start_date ||
    (booking?.job_description && (booking.job_description.includes("[Flexible Date]") || booking.job_description.includes("[تاريخ مرن]")));
  const hasFlexibleTime = !booking?.preferred_time_slot ||
    (booking?.job_description && (booking.job_description.includes("[Flexible Time]") || booking.job_description.includes("[وقت مرن]")));

  const TimeIcon = getTimePreferenceIcon(booking?.preferred_time_slot);
  const isActiveJob = booking?.status === "accepted" && contract?.status === "executed";

  const handleAcceptOffer = async () => {
    if (!booking) return;
    setIsAccepting(true);
    try {
      // Check for existing contract
      const { data: existingContract } = await supabase
        .from("contracts")
        .select("id, status")
        .eq("booking_id", booking.id)
        .maybeSingle();

      // If a contract already exists
      if (existingContract) {
        // If it's still a draft (not signed), reuse it
        if (existingContract.status === 'pending_buyer' || existingContract.status === 'pending') {
          queryClient.invalidateQueries({ queryKey: ["booking-detail", id] });
          navigate(`/app/buyer/contract/${existingContract.id}/sign`);
          return;
        }

        // If it was rejected or somehow orphaned, delete it first
        if (existingContract.status === 'rejected' || existingContract.status === 'pending_seller') {
          await supabase.from("binding_terms").delete().eq("contract_id", existingContract.id);
          await supabase.from("contract_signatures").delete().eq("contract_id", existingContract.id);
          await supabase.from("contracts").delete().eq("id", existingContract.id);
        } else {
          // Contract is executed or active, don't allow new one
          toast.error(currentLanguage === "ar" ? "يوجد عقد نشط لهذا الحجز" : "An active contract already exists for this booking");
          return;
        }
      }

      // Create new contract
      const { data: newContract, error: contractError } = await supabase
        .from("contracts")
        .insert({
          booking_id: booking.id,
          buyer_id: booking.buyer_id,
          seller_id: booking.seller_id,
          status: "pending_buyer",
          language_mode: "dual",
          metadata: {
            service_category: booking.service_category,
            job_description: booking.job_description,
            location_city: booking.location_city,
            location_address: booking.location_address,
            final_price: booking.seller_counter_proposal?.price || booking.final_amount,
            scheduled_date: booking.seller_counter_proposal?.scheduled_date,
            time_preference: booking.seller_counter_proposal?.time_preference,
          },
        })
        .select()
        .single();

      if (contractError) throw contractError;

      // Navigate to contract signing
      queryClient.invalidateQueries({ queryKey: ["booking-detail", id] });
      navigate(`/app/buyer/contract/${newContract.id}/sign`);
    } catch (error: any) {
      console.error("Accept error:", error);
      toast.error(error.message);
    } finally {
      setIsAccepting(false);
    }
  };

  const handleRejectOffer = async () => {
    if (!booking) return;
    const confirmed = window.confirm(
      currentLanguage === "ar" ? "هل أنت متأكد من رفض هذا العرض؟" : "Are you sure you want to reject this offer?"
    );
    if (!confirmed) return;

    setIsRejecting(true);
    try {
      await supabase
        .from("booking_requests")
        .update({ status: "declined" })
        .eq("id", booking.id);

      // Notify seller
      await supabase.from("notifications").insert({
        user_id: booking.seller_id,
        title: currentLanguage === "ar" ? "تم رفض عرضك" : "Your offer was rejected",
        message: currentLanguage === "ar" ? "قام المشتري برفض عرضك" : "The buyer rejected your offer",
        notification_type: "booking_declined",
        content_id: booking.id,
      });

      toast.success(currentLanguage === "ar" ? "تم رفض العرض" : "Offer rejected");
      navigate("/app/buyer/home");
    } catch (error: any) {
      console.error("Reject error:", error);
      toast.error(error.message);
    } finally {
      setIsRejecting(false);
    }
  };

  const handleDeleteBooking = async () => {
    if (!booking) return;
    const confirmed = window.confirm(
      currentLanguage === "ar" ? "هل أنت متأكد من حذف هذا الحجز؟" : "Are you sure you want to delete this booking?"
    );
    if (!confirmed) return;

    try {
      await supabase
        .from("booking_requests")
        .delete()
        .eq("id", booking.id);

      toast.success(currentLanguage === "ar" ? "تم حذف الحجز بنجاح" : "Booking deleted successfully");
      navigate("/app/buyer/home");
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error(currentLanguage === "ar" ? "فشل حذف الحجز" : "Failed to delete booking");
    }
  };

  const handleRevisionSubmit = async (message: string) => {
    if (!booking) return;
    try {
      await supabase
        .from("booking_requests")
        .update({
          status: "revision_requested",
          seller_response: message,
        })
        .eq("id", booking.id);

      // Notify seller
      await sendNotification({
        user_id: booking.seller_id,
        title: currentLanguage === "ar" ? "طلب تعديل" : "Edit Request",
        message: currentLanguage === "ar" ? "المشتري طلب تعديلات على عرضك" : "The buyer requested changes to your offer",
        notification_type: "revision_requested",
        content_id: booking.id,
      });

      toast.success(currentLanguage === "ar" ? "تم إرسال طلب التعديل" : "Edit request sent");
      setShowRevisionModal(false);
      queryClient.invalidateQueries({ queryKey: ["booking-detail", id] });
    } catch (error: any) {
      console.error("Revision error:", error);
      toast.error(error.message);
    }
  };

  if (isLoading) {
    return (
      <div className="pb-20" dir={currentLanguage === "ar" ? "rtl" : "ltr"}>
        <GradientHeader title={t.title} showBack onBack={() => navigate('/app/buyer/requests')} />
        <div className="px-4 py-6 space-y-4">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="pb-20" dir={currentLanguage === "ar" ? "rtl" : "ltr"}>
        <GradientHeader title={t.title} showBack onBack={() => navigate('/app/buyer/requests')} />
        <div className="px-6 py-20 text-center">
          <p className="text-muted-foreground">
            {currentLanguage === "ar" ? "لم يتم العثور على الحجز" : "Booking not found"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-36 min-h-screen bg-background" dir={currentLanguage === "ar" ? "rtl" : "ltr"}>
      <GradientHeader title={t.title} showBack onBack={() => navigate('/app/buyer/requests')} />

      <div className="px-4 py-6 space-y-6">
        {/* Warranty Card for Completed Jobs */}
        {booking.warranty_activated_at && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <WarrantyCard
              warrantyActivatedAt={booking.warranty_activated_at}
              warrantyExpiresAt={booking.warranty_expires_at}
              warrantyClaimed={booking.warranty_claimed}
              currentLanguage={currentLanguage}
              onClaimWarranty={() => { }}
            />
          </motion.div>
        )}

        {/* Provider Response Card - When seller has responded */}
        {booking.status === "seller_responded" && booking.seller_counter_proposal && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <p className={cn(
              "text-sm text-foreground font-semibold",
              currentLanguage === "ar" && "font-['Noto_Sans_Arabic']"
            )}>{t.providerResponse}</p>

            <div className="bg-green-50/50 rounded-2xl p-4 border border-green-100 space-y-4">
              {/* Response Details Grid */}

              {/* Date */}
              <div className="bg-white rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-4 h-4 text-green-600" />
                  <span className="text-xs text-muted-foreground">{t.scheduledDate}</span>
                </div>
                {(booking.seller_counter_proposal.previous_scheduled_date &&
                  String(booking.seller_counter_proposal.previous_scheduled_date) !== String(booking.seller_counter_proposal.scheduled_date)) ? (
                  <div className="flex flex-col">
                    <span className="text-xs line-through text-muted-foreground">
                      {booking.seller_counter_proposal.previous_scheduled_date
                        ? format(new Date(booking.seller_counter_proposal.previous_scheduled_date), "EEE, MMM d", { locale: currentLanguage === "ar" ? ar : enUS })
                        : t.flexible}
                    </span>
                    <p className={cn(
                      "font-semibold text-green-700",
                      currentLanguage === "ar" && "font-['Noto_Sans_Arabic']"
                    )}>
                      {booking.seller_counter_proposal.scheduled_date
                        ? format(new Date(booking.seller_counter_proposal.scheduled_date), "EEE, MMM d", { locale: currentLanguage === "ar" ? ar : enUS })
                        : t.flexible}
                    </p>
                  </div>
                ) : (
                  <p className={cn(
                    "font-semibold",
                    currentLanguage === "ar" && "font-['Noto_Sans_Arabic']"
                  )}>
                    {booking.seller_counter_proposal.scheduled_date
                      ? format(new Date(booking.seller_counter_proposal.scheduled_date), "EEE, MMM d", { locale: currentLanguage === "ar" ? ar : enUS })
                      : t.flexible}
                  </p>
                )}
              </div>

              {/* Time */}
              <div className="bg-white rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  {(() => {
                    const RespTimeIcon = getTimePreferenceIcon(booking.seller_counter_proposal.time_preference);
                    return <RespTimeIcon className="w-4 h-4 text-green-600" />;
                  })()}
                  <span className="text-xs text-muted-foreground">{t.scheduledTime}</span>
                </div>
                {(booking.seller_counter_proposal.previous_time_preference &&
                  String(booking.seller_counter_proposal.previous_time_preference) !== String(booking.seller_counter_proposal.time_preference)) ? (
                  <div className="flex flex-col">
                    <span className="text-xs line-through text-muted-foreground">
                      {getTimePreferenceLabel(booking.seller_counter_proposal.previous_time_preference)}
                    </span>
                    <p className={cn(
                      "font-semibold text-green-700",
                      currentLanguage === "ar" && "font-['Noto_Sans_Arabic']"
                    )}>
                      {getTimePreferenceLabel(booking.seller_counter_proposal.time_preference)}
                    </p>
                  </div>
                ) : (
                  <p className={cn(
                    "font-semibold",
                    currentLanguage === "ar" && "font-['Noto_Sans_Arabic']"
                  )}>
                    {getTimePreferenceLabel(booking.seller_counter_proposal.time_preference)}
                  </p>
                )}
              </div>

              {/* Price */}
              <div className="bg-white rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    <span className="text-xs text-muted-foreground">{t.agreedPrice}</span>
                  </div>
                  {(booking.seller_counter_proposal.previous_price !== undefined &&
                    Number(booking.seller_counter_proposal.previous_price) !== Number(booking.seller_counter_proposal.price)) ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm line-through text-muted-foreground">
                        SAR {booking.seller_counter_proposal.previous_price}
                      </span>
                      <span className="text-muted-foreground">
                        {currentLanguage === "ar" ? "←" : "→"}
                      </span>
                      <p className="font-bold text-green-700 text-lg">
                        SAR {booking.seller_counter_proposal.price || booking.final_amount}
                      </p>
                    </div>
                  ) : (
                    <p className="font-bold text-green-700 text-lg">
                      SAR {booking.seller_counter_proposal.price || booking.final_amount}
                    </p>
                  )}
                </div>
              </div>

              {/* Notes */}
              {booking.seller_counter_proposal.notes && (
                <div className="bg-white rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-1">{t.providerNotes}</p>
                  <p className={cn(
                    "text-sm text-foreground",
                    currentLanguage === "ar" && "font-['Noto_Sans_Arabic']"
                  )}>
                    {booking.seller_counter_proposal.notes}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Awaiting Seller Signature - When buyer has signed but seller hasn't */}
        {contract?.signed_at_buyer && !contract?.signed_at_seller && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center space-y-3">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className={cn(
                  "font-semibold text-amber-800",
                  currentLanguage === "ar" && "font-['Noto_Sans_Arabic']"
                )}>{t.awaitingSellerSignature}</p>
                <p className={cn(
                  "text-sm text-amber-600 mt-1",
                  currentLanguage === "ar" && "font-['Noto_Sans_Arabic']"
                )}>{t.awaitingSellerSignatureDesc}</p>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 rounded-full border-amber-300 text-amber-700 hover:bg-amber-100"
                  onClick={() => navigate(`/app/buyer/contract/${contract.id}/sign`)}
                >
                  {t.viewContract}
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Active Job Display */}
        {isActiveJob && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <JobTrackingCard
              jobId={booking.id}
              jobType="booking"
              title={currentLanguage === 'ar' ? `حجز مع ${((booking.profiles as any)?.full_name || (booking.profiles as any)?.company_name || 'مقدم الخدمة')}` : `A Booking with ${((booking.profiles as any)?.full_name || (booking.profiles as any)?.company_name || 'Service Provider')}`}
              description={booking.job_description}
              currentLanguage={currentLanguage}
              userRole="buyer"
              status={booking.status}
              sellerOnWayAt={booking.seller_on_way_at}
              workStartedAt={booking.work_started_at}
              sellerMarkedComplete={booking.seller_marked_complete}
              buyerMarkedComplete={booking.buyer_marked_complete}
              sellerId={booking.seller_id}
              sellerName={(booking.profiles as any)?.full_name || "Seller"}
              paymentMethod={booking.payment_method}
              location={booking.location_city}
              contractId={contract?.id}
              completionPhotos={Array.isArray(booking.completion_photos) ? booking.completion_photos as string[] : undefined}
            />
          </motion.div>
        )}

        {/* Service Details Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-4 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center">
                <span className="text-3xl">{serviceIcon}</span>
              </div>
              <div>
                <p className={cn(
                  "text-sm text-muted-foreground font-medium",
                  currentLanguage === "ar" && "font-['Noto_Sans_Arabic']"
                )}>{t.serviceType}</p>
                <p className={cn(
                  "font-bold text-foreground text-lg",
                  currentLanguage === "ar" && "font-['Noto_Sans_Arabic']"
                )}>
                  {getCategoryLabel(booking.service_category, currentLanguage)}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Date & Time Pills */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-2 gap-3"
        >
          {/* Date Pill */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-primary" />
              <span className={cn(
                "text-xs text-muted-foreground",
                currentLanguage === "ar" && "font-['Noto_Sans_Arabic']"
              )}>{t.date}</span>
            </div>
            <p className={cn(
              "font-semibold text-foreground",
              currentLanguage === "ar" && "font-['Noto_Sans_Arabic']"
            )}>
              {hasFlexibleDate ? t.flexible :
                (booking.proposed_start_date ?
                  format(new Date(booking.proposed_start_date), "EEE, MMM d", { locale: currentLanguage === "ar" ? ar : enUS })
                  : t.flexible
                )
              }
            </p>
          </div>

          {/* Time Pill */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <TimeIcon className="w-4 h-4 text-primary" />
              <span className={cn(
                "text-xs text-muted-foreground",
                currentLanguage === "ar" && "font-['Noto_Sans_Arabic']"
              )}>{t.time}</span>
            </div>
            <p className={cn(
              "font-semibold text-foreground",
              currentLanguage === "ar" && "font-['Noto_Sans_Arabic']"
            )}>
              {hasFlexibleTime ? t.flexible : getTimePreferenceLabel(booking.preferred_time_slot)}
            </p>
          </div>
        </motion.div>

        {/* Request Description */}
        {booking.job_description && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <p className={cn(
              "text-sm text-foreground font-semibold mb-3",
              currentLanguage === "ar" && "font-['Noto_Sans_Arabic']"
            )}>{t.customerNote}</p>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className={cn(
                "text-muted-foreground leading-relaxed",
                currentLanguage === "ar" && "font-['Noto_Sans_Arabic']"
              )}>
                "{booking.job_description
                  .replace(/\n\n\[Flexible Date\]/g, '')
                  .replace(/\n\n\[Flexible Time\]/g, '')
                  .replace(/\[Flexible Date\]/g, '')
                  .replace(/\[Flexible Time\]/g, '')
                  .replace(/\[تاريخ مرن\]/g, '')
                  .replace(/\[وقت مرن\]/g, '')
                  .replace(/\n\nTime Window: \w+/gi, '')
                  .trim()}"
              </p>
            </div>
          </motion.div>
        )}


        {/* Photos */}
        {booking.photos && booking.photos.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className={cn(
                "text-sm text-foreground font-semibold",
                currentLanguage === "ar" && "font-['Noto_Sans_Arabic']"
              )}>{currentLanguage === "ar" ? "الصور" : "Photos"}</p>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
              {booking.photos.map((photo: string, index: number) => (
                <a
                  key={index}
                  href={photo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0"
                >
                  <img
                    src={photo}
                    alt={`Photo ${index + 1}`}
                    className="w-24 h-24 object-cover rounded-xl border border-border hover:opacity-80 transition-opacity"
                  />
                </a>
              ))}
            </div>
          </motion.div>
        )}

        {/* Location */}
        {(booking.location_address || booking.location_city) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className={cn(
                "text-sm text-foreground font-semibold",
                currentLanguage === "ar" && "font-['Noto_Sans_Arabic']"
              )}>{t.location}</p>
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(booking.location_address || booking.location_city)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary flex items-center gap-1"
              >
                {t.openInMaps}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
              <div className="h-24 relative bg-gradient-to-br from-[#e8f4ea] via-[#f5f5f0] to-[#e8eef4]">
                <div className="absolute inset-0" style={{
                  backgroundImage: "linear-gradient(90deg, rgba(200,200,200,0.3) 1px, transparent 1px), linear-gradient(rgba(200,200,200,0.3) 1px, transparent 1px)",
                  backgroundSize: "20px 20px"
                }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg">
                    <MapPin className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>
              <div className="p-3">
                <p className={cn(
                  "text-sm font-medium",
                  currentLanguage === "ar" && "font-['Noto_Sans_Arabic']"
                )}>
                  {booking.location_address}
                  {booking.location_city && `, ${(() => {
                    const cityData = SAUDI_CITIES_BILINGUAL.find(c =>
                      c.en.toLowerCase() === booking.location_city.toLowerCase() ||
                      c.ar === booking.location_city
                    );
                    return cityData
                      ? (currentLanguage === "ar" ? cityData.ar : cityData.en)
                      : booking.location_city;
                  })()}`}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Provider Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <p className={cn(
            "text-sm text-foreground font-semibold mb-3",
            currentLanguage === "ar" && "font-['Noto_Sans_Arabic']"
          )}>{t.provider}</p>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
              <Avatar className="w-14 h-14 ring-2 ring-primary/20">
                <AvatarImage src={(booking.profiles as any)?.profile_photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${booking.seller_id}`} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                  {(booking.profiles as any)?.full_name?.substring(0, 2) || "SP"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className={cn(
                    "font-bold text-lg",
                    currentLanguage === "ar" && "font-['Noto_Sans_Arabic']"
                  )}>
                    {(booking.profiles as any)?.full_name || (booking.profiles as any)?.company_name || "Service Provider"}
                  </p>
                  {(booking.profiles as any)?.is_verified && (
                    <BadgeCheck className="w-5 h-5 text-primary fill-primary/20" />
                  )}
                </div>
                {(booking.profiles as any)?.seller_rating ? (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                    <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                    <span className="font-medium">{(booking.profiles as any).seller_rating.toFixed(1)}</span>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {currentLanguage === "ar" ? "مقدم خدمة" : "Service Provider"}
                  </p>
                )}
              </div>
              <button
                onClick={() => navigate(`/app/buyer/vendor/${booking.seller_id}`)}
                className="w-10 h-10 rounded-full bg-muted/50 hover:bg-muted flex items-center justify-center transition-colors shrink-0"
              >
                <ChevronLeft className={cn("w-5 h-5 text-muted-foreground", currentLanguage === "ar" && "rotate-180")} />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Status: Pending - Awaiting Seller Response */}
        {booking.status === "pending" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 text-center">
              <Clock className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className={cn(
                "text-blue-700 font-medium",
                currentLanguage === "ar" && "font-['Noto_Sans_Arabic']"
              )}>{t.awaitingResponse}</p>
            </div>
          </motion.div>
        )}

        {/* Status: Revision Requested - Showing Original Response and Edit Request */}
        {booking.status === "revision_requested" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="space-y-4"
          >
            {/* Awaiting Revision Banner */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-center">
              <Pencil className="w-8 h-8 text-amber-600 mx-auto mb-2" />
              <p className={cn(
                "text-amber-700 font-medium",
                currentLanguage === "ar" && "font-['Noto_Sans_Arabic']"
              )}>{t.awaitingRevision}</p>
            </div>

            {/* Original Response from Seller */}
            {booking.seller_counter_proposal && (
              <>
                <p className={cn(
                  "text-sm text-foreground font-semibold",
                  currentLanguage === "ar" && "font-['Noto_Sans_Arabic']"
                )}>{currentLanguage === "ar" ? "العرض السابق" : "Previous Offer"}</p>
                <div className="bg-muted/30 rounded-2xl p-4 border border-border space-y-4">
                  {/* Response Details Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Date */}
                    <div className="bg-white rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{t.scheduledDate}</span>
                      </div>
                      <p className={cn(
                        "font-semibold",
                        currentLanguage === "ar" && "font-['Noto_Sans_Arabic']"
                      )}>
                        {booking.seller_counter_proposal.scheduled_date
                          ? format(new Date(booking.seller_counter_proposal.scheduled_date), "EEE, MMM d", { locale: currentLanguage === "ar" ? ar : enUS })
                          : t.flexible}
                      </p>
                    </div>

                    {/* Time */}
                    <div className="bg-white rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-1">
                        {(() => {
                          const RespTimeIcon = getTimePreferenceIcon(booking.seller_counter_proposal.time_preference);
                          return <RespTimeIcon className="w-4 h-4 text-muted-foreground" />;
                        })()}
                        <span className="text-xs text-muted-foreground">{t.scheduledTime}</span>
                      </div>
                      <p className={cn(
                        "font-semibold",
                        currentLanguage === "ar" && "font-['Noto_Sans_Arabic']"
                      )}>
                        {getTimePreferenceLabel(booking.seller_counter_proposal.time_preference)}
                      </p>
                    </div>

                    {/* Price */}
                    <div className="bg-white rounded-xl p-3 col-span-2">
                      <div className="flex items-center justify-center gap-2">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{t.agreedPrice}</span>
                        <p className="font-bold text-foreground text-lg">
                          SAR {booking.seller_counter_proposal.price || booking.final_amount}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Buyer's Edit Request Message */}
            {booking.seller_response && (
              <>
                <p className={cn(
                  "text-sm text-foreground font-semibold",
                  currentLanguage === "ar" && "font-['Noto_Sans_Arabic']"
                )}>{currentLanguage === "ar" ? "طلب التعديل" : "Your Edit Request"}</p>
                <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200">
                  <p className={cn(
                    "text-amber-800",
                    currentLanguage === "ar" && "font-['Noto_Sans_Arabic']"
                  )}>
                    "{booking.seller_response}"
                  </p>
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* Contract Pending - Sign Contract */}
        {booking.status === "contract_pending" && contract && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 text-center mb-4">
              <FileText className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className={cn(
                "text-green-700 font-medium",
                currentLanguage === "ar" && "font-['Noto_Sans_Arabic']"
              )}>{t.contractPending}</p>
            </div>
            <Button
              onClick={() => navigate(`/app/buyer/contract/${contract.id}/sign`)}
              className="w-full h-14 rounded-full"
            >
              <FileText className="w-5 h-5 mr-2" />
              {t.signContract}
            </Button>
          </motion.div>
        )}
      </div>

      {/* Bottom Action Buttons - For Pending Status (no seller response yet) */}
      {
        booking.status === "pending" && !booking.seller_counter_proposal && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
            <div className="max-w-md mx-auto">
              {/* Delete Button */}
              <Button
                onClick={handleDeleteBooking}
                variant="outline"
                className="w-full h-14 rounded-full text-red-500 hover:text-red-600 border-red-200 hover:bg-red-50"
              >
                <Trash2 className="w-5 h-5 mr-2" />
                {currentLanguage === "ar" ? "حذف الحجز" : "Delete Booking"}
              </Button>
            </div>
          </div>
        )
      }

      {/* Bottom Action Buttons - For Seller Responded Status (only if buyer hasn't signed contract yet) */}
      {
        booking.status === "seller_responded" && !contract?.signed_at_buyer && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
            <div className="max-w-md mx-auto space-y-3">
              {/* Accept Button */}
              <Button
                onClick={handleAcceptOffer}
                disabled={isAccepting}
                className="w-full h-12 rounded-full bg-primary hover:bg-primary/90 text-white font-bold text-sm shadow-lg"
              >
                <Check className="w-4 h-4 mr-2" />
                {isAccepting ? "..." : t.acceptOffer}
              </Button>

              {/* Request Edit & Reject */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => setShowRevisionModal(true)}
                  variant="outline"
                  className="h-10 rounded-full text-sm"
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  {t.requestEdit}
                </Button>
                <Button
                  onClick={handleRejectOffer}
                  disabled={isRejecting}
                  className="flex-1 bg-destructive/10 text-destructive rounded-full text-sm font-medium flex items-center justify-center h-10 hover:bg-destructive/20"
                >
                  <XIcon className="w-4 h-4 mr-2" />
                  {t.rejectOffer}
                </Button>
              </div>
            </div>
          </div>
        )
      }

      {/* Bottom Action Buttons - For Revision Requested Status (waiting for seller response) */}
      {
        booking.status === "revision_requested" && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
            <div className="max-w-md mx-auto">
              {/* Only Reject Button - no Edit button while waiting for seller's response */}
              <Button
                onClick={handleRejectOffer}
                disabled={isRejecting}
                className="w-full h-14 flex-1 bg-destructive/10 text-destructive rounded-full text-sm font-medium flex items-center justify-center hover:bg-destructive/20"
              >
                <XIcon className="w-5 h-5 mr-2" />
                {t.rejectOffer}
              </Button>
            </div>
          </div>
        )
      }

      {/* Bottom Status Bar - For Awaiting Seller Signature */}
      {
        contract?.signed_at_buyer && !contract?.signed_at_seller && (
          <div className="fixed bottom-0 left-0 right-0 bg-gray-100 border-t border-gray-300 p-4 pb-safe">
            <div className="max-w-md mx-auto text-center space-y-1">
              <p className={cn(
                "text-sm font-medium text-gray-900",
                currentLanguage === "ar" && "font-['Noto_Sans_Arabic']"
              )}>{t.awaitingSellerSignature}</p>
              <p className={cn(
                "text-xs text-gray-600",
                currentLanguage === "ar" && "font-['Noto_Sans_Arabic']"
              )}>
                {currentLanguage === "ar"
                  ? "يمكنك سحب العقد من صفحة تفاصيل العقد طالما لم يوقع مقدم الخدمة"
                  : "You can withdraw the contract from the contract details page as long as the provider hasn't signed"}
              </p>
            </div>
          </div>
        )
      }

      {/* Revision Request Modal */}
      <Dialog open={showRevisionModal} onOpenChange={setShowRevisionModal}>
        <DialogContent className="sm:max-w-md" dir={currentLanguage === "ar" ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle className={cn(currentLanguage === "ar" && "font-['Noto_Sans_Arabic']")}
            >
              {currentLanguage === "ar" ? "طلب تعديل" : "Request Edit"}
            </DialogTitle>
            <DialogDescription className={cn(currentLanguage === "ar" && "font-['Noto_Sans_Arabic']")}
            >
              {currentLanguage === "ar" ? "أخبر مقدم الخدمة بما تريد تغييره" : "Tell the provider what you'd like to change"}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={revisionMessage}
              onChange={(e) => setRevisionMessage(e.target.value)}
              placeholder={currentLanguage === "ar" ? "مثال: هل يمكنك تخفيض السعر؟" : "e.g., Can you lower the price?"}
              rows={4}
              className={cn("resize-none rounded-2xl", currentLanguage === "ar" && "font-['Noto_Sans_Arabic']")}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowRevisionModal(false)}
              className="rounded-full"
            >
              {currentLanguage === "ar" ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              onClick={() => {
                handleRevisionSubmit(revisionMessage);
                setRevisionMessage("");
              }}
              disabled={!revisionMessage.trim()}
              className="rounded-full"
            >
              {currentLanguage === "ar" ? "إرسال" : "Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  );
};
