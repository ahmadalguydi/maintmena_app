import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { GradientHeader } from '@/components/mobile/GradientHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { BookingNegotiationSheet } from '@/components/mobile/BookingNegotiationSheet';
import { JobTrackingCard } from '@/components/mobile/JobTrackingCard';
import { WarrantyCard } from '@/components/mobile/WarrantyCard';
import { SignContractButton, RejectButton, ActionButtonGroup, FixedBottomBar } from '@/components/mobile/ActionButtons';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { sendNotification } from '@/lib/notifications';

import { useJourneyProgress } from '@/hooks/useJourneyProgress';
import { MessageCircle, Calendar, Sun, Sunset, Moon, MapPin, ExternalLink, Image as ImageIcon, Check, X as XIcon, Pencil, Trash2, DollarSign, Clock, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { getCategoryLabel, getCategoryIcon } from '@/lib/serviceCategories';
import { SAUDI_CITIES_BILINGUAL } from '@/lib/saudiCities';

interface SellerBookingDetailProps {
  currentLanguage: 'en' | 'ar';
}

export const SellerBookingDetail = ({ currentLanguage }: SellerBookingDetailProps) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showNegotiationSheet, setShowNegotiationSheet] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const edit = searchParams.get('edit') === 'true';
    const accept = searchParams.get('accept') === 'true';

    if (edit) {
      setIsEditMode(true);
      setShowNegotiationSheet(true);
    } else if (accept) {
      setIsEditMode(false);
      setShowNegotiationSheet(true);
    }
  }, [searchParams]);

  const { data: booking, isLoading } = useQuery<any>({
    queryKey: ['seller-booking-detail', id, user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data: bookingData, error } = await supabase
        .from('booking_requests')
        .select('*')
        .eq('id', id)
        .eq('seller_id', user.id)
        .maybeSingle();

      if (error) throw error;
      if (!bookingData) return null;

      if (bookingData.buyer_id) {
        const { data: buyerProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', bookingData.buyer_id)
          .maybeSingle();

        return { ...bookingData, profiles: buyerProfile };
      }

      return bookingData;
    },
    enabled: !!id && !!user?.id
  });

  const { data: contract } = useQuery({
    queryKey: ['booking-contract', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('contracts')
        .select('*')
        .eq('booking_id', id)
        .maybeSingle();
      return data;
    },
    enabled: !!id
  });

  // Reject contract mutation
  const rejectMutation = useMutation({
    mutationFn: async () => {
      if (!contract) throw new Error('No contract found');

      // Update contract status to rejected
      const { error } = await supabase
        .from('contracts')
        .update({ status: 'rejected' })
        .eq('id', contract.id);

      if (error) throw error;

      // Notify buyer
      await sendNotification({
        user_id: contract.buyer_id,
        title: currentLanguage === 'ar' ? 'تم رفض العقد' : 'Contract Rejected',
        message: currentLanguage === 'ar' ? 'قام مقدم الخدمة برفض العقد' : 'The provider has rejected the contract',
        notification_type: 'contract_rejected',
        content_id: contract.id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-contract', id] });
      queryClient.invalidateQueries({ queryKey: ['seller-bookings'] });
      setShowRejectDialog(false);
      navigate('/app/seller/quotes');
    }
  });

  const t = {
    title: currentLanguage === 'ar' ? 'تفاصيل الخدمة' : 'Service Details',
    serviceType: currentLanguage === 'ar' ? 'نوع الخدمة' : 'Service Type',
    priceRange: currentLanguage === 'ar' ? 'نطاق السعر' : 'Price Range',
    date: currentLanguage === 'ar' ? 'التاريخ' : 'Date',
    preference: currentLanguage === 'ar' ? 'الوقت' : 'Time',
    customerNote: currentLanguage === 'ar' ? 'ملاحظة العميل' : 'Customer Note',
    attachedPhotos: currentLanguage === 'ar' ? 'الصور المرفقة' : 'Attached Photos',
    location: currentLanguage === 'ar' ? 'الموقع' : 'Location',
    openInMaps: currentLanguage === 'ar' ? 'فتح في الخرائط' : 'Open in Maps',
    acceptRequest: currentLanguage === 'ar' ? 'إرسال عرض' : 'Send Offer',
    askInfo: currentLanguage === 'ar' ? 'طلب معلومات' : 'Ask Info',
    reject: currentLanguage === 'ar' ? 'رفض' : 'Reject',
    morning: currentLanguage === 'ar' ? 'صباحاً' : 'Morning',
    afternoon: currentLanguage === 'ar' ? 'ظهراً' : 'Afternoon',
    night: currentLanguage === 'ar' ? 'مساءً' : 'Night',
    flexible: currentLanguage === 'ar' ? 'مرن' : 'Flexible',
    chat: currentLanguage === 'ar' ? 'محادثة العميل' : 'Chat with Client',
    reviewContract: currentLanguage === 'ar' ? 'مراجعة العقد' : 'Review Contract',
    waitingBuyer: currentLanguage === 'ar' ? 'في انتظار رد المشتري' : 'Waiting for buyer response',
    yourResponse: currentLanguage === 'ar' ? 'ردك' : 'Your Response',
    scheduledDate: currentLanguage === 'ar' ? 'التاريخ المحدد' : 'Scheduled Date',
    scheduledTime: currentLanguage === 'ar' ? 'الوقت المحدد' : 'Scheduled Time',
    agreedPrice: currentLanguage === 'ar' ? 'السعر المتفق' : 'Agreed Price',
    yourNotes: currentLanguage === 'ar' ? 'ملاحظاتك' : 'Your Notes',
    editResponse: currentLanguage === 'ar' ? 'تعديل الرد' : 'Edit Response',
    deleteResponse: currentLanguage === 'ar' ? 'حذف الرد' : 'Delete Response',
    buyerPending: currentLanguage === 'ar' ? 'في انتظار موافقة المشتري' : 'Awaiting buyer approval',
    revisionRequested: currentLanguage === 'ar' ? 'المشتري طلب تعديلات' : 'Buyer requested changes',
    buyerEditRequest: currentLanguage === 'ar' ? 'طلب المشتري' : 'Buyer\'s Request',
  };

  const getTimePreferenceLabel = (slot: string) => {
    switch (slot) {
      case 'morning': return t.morning;
      case 'afternoon': return t.afternoon;
      case 'night': return t.night;
      default: return slot;
    }
  };

  const getTimePreferenceIcon = (slot: string) => {
    switch (slot) {
      case 'morning': return Sun;
      case 'afternoon': return Sunset;
      case 'night': return Moon;
      default: return Moon;
    }
  };

  const isActiveJob = booking?.status === 'accepted' && contract?.status === 'executed';

  if (isLoading) {
    return (
      <div className="pb-20" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
        <GradientHeader title={t.title} onBack={() => navigate('/app/seller/quotes')} />
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
      <div className="pb-20" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
        <GradientHeader title={t.title} onBack={() => navigate('/app/seller/quotes')} />
        <div className="px-6 py-20 text-center">
          <p className="text-muted-foreground">
            {currentLanguage === 'ar' ? 'لم يتم العثور على الحجز' : 'Booking not found'}
          </p>
        </div>
      </div>
    );
  }

  const serviceIcon = getCategoryIcon(booking.service_category);
  const TimeIcon = getTimePreferenceIcon(booking.preferred_time_slot);

  // Detect flexible date/time from job_description since they're stored as text markers
  const hasFlexibleDate = !booking.proposed_start_date ||
    (booking.job_description && (booking.job_description.includes('[Flexible Date]') || booking.job_description.includes('[تاريخ مرن]')));
  const hasFlexibleTime = !booking.preferred_time_slot ||
    (booking.job_description && (booking.job_description.includes('[Flexible Time]') || booking.job_description.includes('[وقت مرن]')));

  // Parse photos from job_description or separate field - filter out empty values
  const photos: string[] = (booking.photos || []).filter((p: string) => p && p.trim());

  return (
    <div className="pb-36 min-h-screen bg-background" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      <GradientHeader title={t.title} showBack onBack={() => navigate('/app/seller/quotes')} />

      <div className="px-4 py-6 space-y-6">
        {/* Warranty Card for Completed Jobs */}
        {booking.warranty_activated_at && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <WarrantyCard
              warrantyActivatedAt={booking.warranty_activated_at}
              warrantyExpiresAt={booking.warranty_expires_at}
              warrantyClaimed={booking.warranty_claimed}
              currentLanguage={currentLanguage}
            />
          </motion.div>
        )}

        {/* Active Job Display */}
        {isActiveJob && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <JobTrackingCard
              jobId={booking.id}
              jobType="booking"
              title={currentLanguage === 'ar' ? `حجز مع ${((booking.profiles as any)?.full_name || (booking.profiles as any)?.company_name || 'العميل')}` : `A Booking with ${((booking.profiles as any)?.full_name || (booking.profiles as any)?.company_name || 'Client')}`}
              description={booking.job_description}
              currentLanguage={currentLanguage}
              userRole="seller"
              status={booking.status}
              sellerOnWayAt={booking.seller_on_way_at}
              workStartedAt={booking.work_started_at}
              sellerMarkedComplete={booking.seller_marked_complete}
              buyerMarkedComplete={booking.buyer_marked_complete}
              sellerId={booking.seller_id}
              sellerName={(booking.profiles as any)?.full_name || 'Client'}
              paymentMethod={booking.payment_method}
              location={booking.location_city}
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
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
                <span className="text-2xl">{serviceIcon}</span>
              </div>
              <div>
                <p className={cn(
                  "text-xs text-muted-foreground",
                  currentLanguage === 'ar' && "font-['Noto_Sans_Arabic']"
                )}>{t.serviceType}</p>
                <p className={cn(
                  "font-semibold text-foreground",
                  currentLanguage === 'ar' && "font-['Noto_Sans_Arabic']"
                )}>
                  {getCategoryLabel(booking.service_category, currentLanguage)}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className={cn(
                "text-xs text-muted-foreground",
                currentLanguage === 'ar' && "font-['Noto_Sans_Arabic']"
              )}>{t.priceRange}</p>
              <p className="font-bold text-primary">
                {booking.budget_range || booking.final_amount ?
                  (booking.final_amount ? `SAR ${booking.final_amount}` : `SAR ${booking.budget_range}`)
                  : 'SAR -'}
              </p>
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
                currentLanguage === 'ar' && "font-['Noto_Sans_Arabic']"
              )}>{t.date}</span>
            </div>
            <p className={cn(
              "font-semibold text-foreground",
              currentLanguage === 'ar' && "font-['Noto_Sans_Arabic']"
            )}>
              {hasFlexibleDate ? t.flexible :
                (booking.proposed_start_date ?
                  format(new Date(booking.proposed_start_date), 'EEE, MMM d', { locale: currentLanguage === 'ar' ? ar : enUS })
                  : t.flexible
                )
              }
            </p>
          </div>

          {/* Time Preference Pill */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <TimeIcon className="w-4 h-4 text-primary" />
              <span className={cn(
                "text-xs text-muted-foreground",
                currentLanguage === 'ar' && "font-['Noto_Sans_Arabic']"
              )}>{t.preference}</span>
            </div>
            <p className={cn(
              "font-semibold text-foreground",
              currentLanguage === 'ar' && "font-['Noto_Sans_Arabic']"
            )}>
              {hasFlexibleTime ? t.flexible : getTimePreferenceLabel(booking.preferred_time_slot)}
            </p>
          </div>
        </motion.div>

        {/* Customer Note */}
        {booking.job_description && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <p className={cn(
              "text-sm font-semibold text-foreground mb-2",
              currentLanguage === 'ar' && "font-['Noto_Sans_Arabic']"
            )}>{t.customerNote}</p>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className={cn(
                "text-muted-foreground leading-relaxed",
                currentLanguage === 'ar' && "font-['Noto_Sans_Arabic']"
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

        {/* Attached Photos */}
        {photos.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <p className={cn(
              "text-sm font-semibold text-foreground mb-2",
              currentLanguage === 'ar' && "font-['Noto_Sans_Arabic']"
            )}>{t.attachedPhotos}</p>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {photos.map((photo: string, idx: number) => (
                <div key={idx} className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 bg-gray-100">
                  <img src={photo} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Location */}
        {booking.location_address && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <p className={cn(
              "text-sm font-semibold text-foreground mb-2",
              currentLanguage === 'ar' && "font-['Noto_Sans_Arabic']"
            )}>
              {currentLanguage === 'ar' ? 'عنوان العميل' : "Client's Address"}
            </p>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-4">
                {/* Map Thumbnail */}
                <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 relative bg-gradient-to-br from-[#e8f4ea] via-[#f5f5f0] to-[#e8eef4]">
                  {/* Map grid pattern */}
                  <div className="absolute inset-0" style={{
                    backgroundImage: 'linear-gradient(90deg, rgba(200,200,200,0.4) 1px, transparent 1px), linear-gradient(rgba(200,200,200,0.4) 1px, transparent 1px)',
                    backgroundSize: '8px 8px'
                  }} />
                  {/* Location marker */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow">
                      <MapPin className="w-3 h-3 text-white" />
                    </div>
                  </div>
                </div>

                {/* Address Info */}
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "font-semibold text-foreground mb-1",
                    currentLanguage === 'ar' && "font-['Noto_Sans_Arabic']"
                  )}>
                    {(() => {
                      const cityData = SAUDI_CITIES_BILINGUAL.find(c =>
                        c.en.toLowerCase() === booking.location_city?.toLowerCase() ||
                        c.ar === booking.location_city ||
                        c.aliases?.some(a => a.toLowerCase() === booking.location_city?.toLowerCase())
                      );
                      if (cityData) {
                        return currentLanguage === 'ar' ? cityData.ar : cityData.en;
                      }
                      return booking.location_city || (currentLanguage === 'ar' ? 'الموقع' : 'Location');
                    })()}
                  </p>
                  <p className={cn(
                    "text-sm text-muted-foreground truncate",
                    currentLanguage === 'ar' && "font-['Noto_Sans_Arabic']"
                  )}>
                    {booking.location_address}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Chat Button for Active Jobs */}
        {isActiveJob && (
          <Button
            onClick={() => navigate(`/app/messages/thread?booking=${booking.id}`)}
            variant="outline"
            className="w-full rounded-full h-12"
          >
            <MessageCircle size={18} className="mr-2" />
            {t.chat}
          </Button>
        )}

        {/* Contract Review for Contract Pending - only show if NOT pending_seller (that's handled by fixed bottom button) */}
        {
          contract && contract.status !== 'rejected' && contract.status !== 'executed' && contract.status !== 'pending_seller' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              {contract.signed_at_buyer ? (
                <Button
                  onClick={() => navigate(`/app/seller/contract/${contract.id}/review`)}
                  className="w-full h-14 rounded-full"
                >
                  <FileText size={18} className="mr-2" />
                  {t.reviewContract}
                </Button>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
                  <p className={cn(
                    "text-amber-700",
                    currentLanguage === 'ar' && "font-['Noto_Sans_Arabic']"
                  )}>{t.waitingBuyer}</p>
                </div>
              )}
            </motion.div>
          )
        }

        {/* Seller Response Card - When seller has responded */}
        {
          (booking.status === 'seller_responded' || booking.status === 'revision_requested') && booking.seller_counter_proposal && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between">
                <p className={cn(
                  "text-sm text-primary font-semibold mb-2",
                  currentLanguage === 'ar' && "font-['Noto_Sans_Arabic']"
                )}>{t.yourResponse}</p>
              </div>

              <div className="bg-[#fffcfb] rounded-3xl p-4 border border-[#f5efe9] space-y-4 shadow-sm">
                {/* Status Banner */}
                {contract?.status === 'pending_seller' ? (
                  <div className="flex items-center gap-2 p-4 rounded-2xl bg-green-50 border border-green-100/50 justify-center text-center">
                    <Check className="w-5 h-5 text-green-600" />
                    <span className={cn(
                      "text-sm text-green-700 font-medium",
                      currentLanguage === 'ar' && "font-['Noto_Sans_Arabic']"
                    )}>{currentLanguage === 'ar' ? 'المشتري وافق - وقّع العقد' : 'Buyer accepted - Sign the contract'}</span>
                  </div>
                ) : booking.status === 'revision_requested' ? (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-100">
                    <Clock className="w-5 h-5 text-amber-600" />
                    <span className={cn(
                      "text-sm text-amber-700 font-medium",
                      currentLanguage === 'ar' && "font-['Noto_Sans_Arabic']"
                    )}>{t.revisionRequested}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-4 rounded-2xl bg-blue-50 border border-blue-100/50 justify-center text-center">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <span className={cn(
                      "text-sm text-blue-700 font-medium",
                      currentLanguage === 'ar' && "font-['Noto_Sans_Arabic']"
                    )}>{t.buyerPending}</span>
                  </div>
                )}

                {/* Response Details Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Date */}
                  <div className="bg-white rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.02)] border border-gray-100/50 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <span className={cn(
                        "text-xs text-muted-foreground flex items-center gap-1",
                        currentLanguage === 'ar' && "font-['Noto_Sans_Arabic']"
                      )}>
                        <Calendar className="w-3 h-3" />
                        {t.scheduledDate}
                      </span>
                      <p className={cn(
                        "font-bold text-foreground",
                        currentLanguage === 'ar' && "font-['Noto_Sans_Arabic']"
                      )}>
                        {booking.seller_counter_proposal.scheduled_date
                          ? format(new Date(booking.seller_counter_proposal.scheduled_date), 'EEE, MMM d', { locale: currentLanguage === 'ar' ? ar : enUS })
                          : t.flexible}
                      </p>
                    </div>
                  </div>

                  {/* Time */}
                  <div className="bg-white rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.02)] border border-gray-100/50 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <span className={cn(
                        "text-xs text-muted-foreground flex items-center gap-1",
                        currentLanguage === 'ar' && "font-['Noto_Sans_Arabic']"
                      )}>
                        {(() => {
                          const TimeIcon = getTimePreferenceIcon(booking.seller_counter_proposal.time_preference);
                          return <TimeIcon className="w-3 h-3" />;
                        })()}
                        {t.scheduledTime}
                      </span>
                      <p className={cn(
                        "font-bold text-foreground",
                        currentLanguage === 'ar' && "font-['Noto_Sans_Arabic']"
                      )}>
                        {getTimePreferenceLabel(booking.seller_counter_proposal.time_preference)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Price */}
                <div className="bg-white rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.02)] border border-gray-100/50">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-[#8B4513] text-xl">
                      SAR {booking.seller_counter_proposal.price || booking.final_amount}
                    </p>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <span className={cn(
                        "text-xs text-muted-foreground",
                        currentLanguage === 'ar' && "font-['Noto_Sans_Arabic']"
                      )}>{t.agreedPrice}</span>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {booking.seller_counter_proposal.notes && (
                  <div className="bg-white rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.02)] border border-gray-100/50">
                    <p className={cn(
                      "text-xs text-muted-foreground mb-2",
                      currentLanguage === 'ar' && "font-['Noto_Sans_Arabic']"
                    )}>{t.yourNotes}</p>
                    <p className={cn(
                      "text-sm text-foreground",
                      currentLanguage === 'ar' && "font-['Noto_Sans_Arabic']"
                    )}>
                      {booking.seller_counter_proposal.notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Buyer's Edit Request Message */}
              {booking.status === 'revision_requested' && booking.seller_response && (
                <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200">
                  <p className={cn(
                    "text-xs text-amber-700 font-medium mb-2",
                    currentLanguage === 'ar' && "font-['Noto_Sans_Arabic']"
                  )}>{t.buyerEditRequest}</p>
                  <p className={cn(
                    "text-sm text-amber-800",
                    currentLanguage === 'ar' && "font-['Noto_Sans_Arabic']"
                  )}>
                    "{booking.seller_response}"
                  </p>
                </div>
              )}
            </motion.div>
          )
        }
      </div >

      {/* Bottom Action Buttons - For Pending Status (seller hasn't responded yet) */}
      {(() => {
        const hasSellerResponse = !!booking.seller_counter_proposal || !!booking.seller_response;
        // Whitelist of statuses where Accept buttons should be shown
        const showableStatuses = ['pending', 'buyer_countered', null, undefined];
        const isShowableStatus = showableStatuses.includes(booking.status) || !booking.status;
        // Show Accept buttons only if: no response yet, status allows it, not an active job
        const showAcceptButtons = !hasSellerResponse && !isActiveJob && isShowableStatus;
        console.log('[SellerBookingDetail] Accept button debug:', { status: booking.status, hasSellerResponse, isActiveJob, isShowableStatus, showAcceptButtons });
        return showAcceptButtons && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
            <div className="max-w-md mx-auto space-y-3">
              {/* Accept & Reject Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => {
                    setIsEditMode(false);
                    setShowNegotiationSheet(true);
                  }}
                  className="h-14 rounded-full bg-primary hover:bg-primary/90 text-white font-semibold"
                >
                  <Check className="w-5 h-5 mr-2" />
                  {t.acceptRequest}
                </Button>
                <Button
                  onClick={async () => {
                    const confirmed = window.confirm(
                      currentLanguage === 'ar' ? 'هل أنت متأكد من رفض هذا الطلب؟' : 'Are you sure you want to reject this request?'
                    );
                    if (confirmed) {
                      await supabase.from('booking_requests').update({ status: 'declined' }).eq('id', booking.id);
                      queryClient.invalidateQueries({ queryKey: ['seller-booking-detail', id] });
                      navigate('/app/seller/home');
                    }
                  }}
                  variant="outline"
                  className="h-14 rounded-full text-red-500 hover:text-red-600 border-red-200 hover:bg-red-50"
                >
                  <XIcon className="w-5 h-5 mr-2" />
                  {t.reject}
                </Button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Bottom Action Buttons - For Seller Responded Status (Edit/Delete) */}
      {(() => {
        const hasSellerResponse = !!booking.seller_counter_proposal || !!booking.seller_response;
        const isTerminalStatus = ['accepted', 'declined', 'completed', 'contract_pending', 'in_progress'].includes(booking.status);
        const showEditButtons = hasSellerResponse && !isActiveJob && !isTerminalStatus;
        return showEditButtons && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
            <div className="max-w-md mx-auto grid grid-cols-2 gap-3">
              <Button
                onClick={() => {
                  setIsEditMode(true);
                  setShowNegotiationSheet(true);
                }}
                className="h-12 rounded-full"
              >
                <Pencil className="w-4 h-4 mr-2" />
                {t.editResponse}
              </Button>
              <Button
                onClick={async () => {
                  const confirmed = window.confirm(
                    currentLanguage === 'ar' ? 'هل أنت متأكد من حذف ردك؟' : 'Are you sure you want to delete your response?'
                  );
                  if (confirmed) {
                    await supabase.from('booking_requests').update({
                      status: 'pending',
                      seller_counter_proposal: null,
                      seller_response: null,
                      final_amount: null,
                    }).eq('id', booking.id);
                    queryClient.invalidateQueries({ queryKey: ['seller-booking-detail', id] });
                  }
                }}
                variant="outline"
                className="h-12 rounded-full text-red-500 hover:text-red-600 border-red-200 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {t.deleteResponse}
              </Button>
            </div>
          </div>
        )
      })()}

      {/* Bottom Action Buttons - Contract Pending Seller Signature */}
      {contract?.status === 'pending_seller' && (
        <FixedBottomBar>
          <ActionButtonGroup className="gap-3">
            <SignContractButton
              currentLanguage={currentLanguage}
              onClick={() => navigate(`/app/seller/contract/${contract.id}/review`)}
              size="lg"
            />
            <RejectButton
              currentLanguage={currentLanguage}
              onClick={() => setShowRejectDialog(true)}
              size="lg"
            />
          </ActionButtonGroup>
        </FixedBottomBar>
      )}

      {/* Reject Contract Confirmation Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent className="rounded-2xl mx-4">
          <AlertDialogHeader>
            <AlertDialogTitle className={currentLanguage === 'ar' ? "font-['Noto_Sans_Arabic'] text-right" : ""}>
              {currentLanguage === 'ar' ? 'رفض العقد' : 'Reject Contract'}
            </AlertDialogTitle>
            <AlertDialogDescription className={currentLanguage === 'ar' ? "font-['Noto_Sans_Arabic'] text-right" : ""}>
              {currentLanguage === 'ar'
                ? 'هل أنت متأكد من رفض هذا العقد؟ لا يمكن التراجع عن هذا الإجراء.'
                : 'Are you sure you want to reject this contract? This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className={currentLanguage === 'ar' ? "flex-row-reverse gap-2" : ""}>
            <AlertDialogCancel className="rounded-full">
              {currentLanguage === 'ar' ? 'إلغاء' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => rejectMutation.mutate()}
              className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {rejectMutation.isPending
                ? (currentLanguage === 'ar' ? 'جاري الرفض...' : 'Rejecting...')
                : (currentLanguage === 'ar' ? 'نعم، رفض' : 'Yes, Reject')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Negotiation Sheet */}
      <BookingNegotiationSheet
        open={showNegotiationSheet}
        onOpenChange={setShowNegotiationSheet}
        booking={booking}
        currentLanguage={currentLanguage}
        isEditMode={isEditMode}
        existingResponse={isEditMode ? booking.seller_counter_proposal : undefined}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['seller-booking-detail', id] });
          setIsEditMode(false);
        }}
      />
    </div >
  );
};
