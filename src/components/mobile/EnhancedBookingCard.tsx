import { motion } from 'framer-motion';
import { MapPin, DollarSign, Calendar, Clock, Star } from 'lucide-react';
import { SoftCard } from './SoftCard';
import { StatusPill } from './StatusPill';
import { getAllCategories } from '@/lib/serviceCategories';
import { format, formatDistanceToNow } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { useCurrency } from '@/hooks/useCurrency';
import { AvatarBadge } from './AvatarBadge';
import { cn } from '@/lib/utils';
import { SAUDI_CITIES_BILINGUAL } from '@/lib/saudiCities';
import {
  ActionButtonGroup,
  SignContractButton,
  SendOfferButton,
  EditButton,
  EditQuoteButton,
  ViewContractButton,
  DeleteButton,
  AcceptButton,
  ViewDetailsButton,
} from './ActionButtons';

interface EnhancedBookingCardProps {
  booking: any;
  seller: any;
  contract?: any;
  currentLanguage: 'en' | 'ar';
  onClick: () => void;
  onAccept?: () => void;
  onMessage?: () => void;
  onDelete?: () => void;
  viewerRole?: 'buyer' | 'seller';
}

export const EnhancedBookingCard = ({
  booking,
  seller,
  contract,
  currentLanguage,
  onClick,
  onAccept,
  onMessage,
  onDelete,
  viewerRole = 'seller'
}: EnhancedBookingCardProps) => {
  const { formatAmount } = useCurrency();
  const allCategories = getAllCategories();
  const category = allCategories.find(c => c.key === booking.service_category);

  // Helper to clean description of markers
  const cleanDescription = (desc: string) => {
    if (!desc) return '';
    return desc
      .replace(/\n\n\[Flexible Date\]/g, '')
      .replace(/\n\n\[Flexible Time\]/g, '')
      .replace(/\[Flexible Date\]/g, '')
      .replace(/\[Flexible Time\]/g, '')
      .replace(/\[تاريخ مرن\]/g, '')
      .replace(/\[وقت مرن\]/g, '')
      .replace(/\n\nTime Window: \w+/gi, '')
      .trim();
  };

  // Status config - with different labels for buyer vs seller
  const statusConfig: Record<string, { type: 'pending' | 'success' | 'warning' | 'error'; label: string; label_ar: string }> = {
    sent: { type: 'warning', label: '⏳ Awaiting Response', label_ar: '⏳ في انتظار الرد' },
    reviewed: { type: 'pending', label: '👀 Under Review', label_ar: '👀 قيد المراجعة' },
    pending_seller_signature: { type: 'success', label: '✅ Sign Contract', label_ar: '✅ وقّع العقد' },
    revision_requested_seller: { type: 'warning', label: '📝 Buyer Requested Changes', label_ar: '📝 المشتري طلب تعديلات' },
    waiting_seller_signature: { type: 'warning', label: '⏳ Awaiting Provider Signature', label_ar: '⏳ بانتظار توقيع مقدم الخدمة' },
    accepted: { type: 'success', label: '✓ Accepted', label_ar: '✓ مقبول' },
    rejected: { type: 'error', label: '✗ Declined', label_ar: '✗ مرفوض' }
  };

  // Determine if buyer has signed but seller hasn't
  const isPendingSellerSignature = contract?.signed_at_buyer && !contract?.signed_at_seller;

  // Determine status based on role and contract state
  const getStatus = () => {
    if (isPendingSellerSignature) return viewerRole === 'buyer' ? 'waiting_seller_signature' : 'pending_seller_signature';
    if (booking.status === 'revision_requested' && viewerRole === 'seller') return 'revision_requested_seller';
    if (booking.status === 'seller_responded' || booking.status === 'reviewed' || booking.responded_at) return 'reviewed';
    return 'sent';
  };

  const status = getStatus();
  const statusInfo = statusConfig[status] || statusConfig.sent;

  // Time slot translation
  const timeSlotMap: Record<string, { en: string; ar: string }> = {
    morning: { en: '🌅 Morning', ar: '🌅 صباحاً' },
    afternoon: { en: '☀️ Afternoon', ar: '☀️ بعد الظهر' },
    evening: { en: '🌆 Evening', ar: '🌆 مساءً' },
    flexible: { en: '🕐 Flexible', ar: '🕐 مرن' }
  };

  const timeSlot = timeSlotMap[booking.preferred_time_slot] || timeSlotMap.flexible;

  return (
    <SoftCard onClick={onClick} className="space-y-4">
      {/* Header badge */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-accent bg-accent/10 px-3 py-1 rounded-full">
          {currentLanguage === 'ar' ? '📍 حجز مباشر' : '📍 Direct Booking'}
        </span>
        <StatusPill status={statusInfo.type} label={currentLanguage === 'ar' ? statusInfo.label_ar : statusInfo.label} />
      </div>

      {/* Seller profile */}
      <div className="flex items-center gap-3">
        <AvatarBadge
          src={seller?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${seller?.id || 'default'}`}
          fallback={seller?.company_name?.[0] || seller?.full_name?.[0] || 'V'}
          size="md"
        />
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm truncate">
            {seller?.company_name || seller?.full_name || 'Unknown Vendor'}
          </h4>
          {seller?.seller_rating > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              <span>{seller.seller_rating.toFixed(1)}</span>
              {seller.completed_projects && (
                <span>({seller.completed_projects} {currentLanguage === 'ar' ? 'مشروع' : 'reviews'})</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Service category with icon */}
      <div className="flex items-center gap-2">
        <span className="text-lg">{category?.icon || '🔧'}</span>
        <span className="text-sm font-medium">
          {currentLanguage === 'ar' ? category?.ar : category?.en}
        </span>
      </div>

      {/* Description preview */}
      <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
        {cleanDescription(booking.job_description || '')}
      </p>

      {/* Scheduled date and time */}
      {booking.proposed_start_date && (
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span>{format(new Date(booking.proposed_start_date), 'MMM d, yyyy')}</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>{currentLanguage === 'ar' ? timeSlot.ar : timeSlot.en}</span>
          </div>
        </div>
      )}

      {/* Location */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <MapPin className="w-3 h-3" />
        <span>
          {(() => {
            const cityKey = booking.location_city;
            if (!cityKey) return currentLanguage === 'ar' ? 'غير محدد' : 'Not specified';
            const cityData = SAUDI_CITIES_BILINGUAL.find(c =>
              c.en.toLowerCase() === cityKey.toLowerCase() ||
              c.ar === cityKey ||
              c.aliases?.some((a: string) => a.toLowerCase() === cityKey.toLowerCase())
            );
            return cityData
              ? (currentLanguage === 'ar' ? cityData.ar : cityData.en)
              : cityKey;
          })()}
        </span>
      </div>

      {/* Budget */}
      {booking.budget_range && (
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-accent" />
          <span className="text-sm font-medium">
            {booking.budget_range.replace(/_/g, ' ')}
          </span>
        </div>
      )}

      {/* Timestamp */}
      <div className="text-xs text-muted-foreground">
        {currentLanguage === 'ar' ? 'تم الإرسال' : 'Sent'} {formatDistanceToNow(new Date(booking.created_at), {
          addSuffix: true,
          locale: currentLanguage === 'ar' ? arSA : undefined
        })}
      </div>

      {/* Action buttons */}
      <ActionButtonGroup>
        {/* For SELLER: different buttons based on state */}
        {viewerRole === 'seller' && (
          <>
            {/* Sign Contract button - buyer has accepted and signed, waiting for seller */}
            {isPendingSellerSignature && contract && (
              <SignContractButton
                currentLanguage={currentLanguage}
                onClick={() => {
                  window.location.href = `/app/seller/contract/${contract.id}/review`;
                }}
              />
            )}
            {/* Accept button - seller hasn't responded yet - PRIMARY ACTION */}
            {!isPendingSellerSignature && onAccept && !booking.seller_counter_proposal && !booking.seller_response && (
              <SendOfferButton
                currentLanguage={currentLanguage}
                onClick={onAccept}
              />
            )}
            {/* Edit button - seller has responded but NOT pending signature */}
            {!isPendingSellerSignature && onAccept && (booking.seller_counter_proposal || booking.seller_response) && (
              booking.status === 'revision_requested' ? (
                <EditQuoteButton
                  currentLanguage={currentLanguage}
                  onClick={onAccept}
                  primary={true}
                />
              ) : (
                <EditButton
                  currentLanguage={currentLanguage}
                  onClick={onAccept}
                />
              )
            )}
          </>
        )}

        {/* For BUYER: Different buttons based on booking state */}
        {viewerRole === 'buyer' && (
          <>
            {/* When pending seller signature - show View Contract button */}
            {isPendingSellerSignature && contract && (
              <ViewContractButton
                currentLanguage={currentLanguage}
                onClick={() => {
                  window.location.href = `/app/buyer/contract/${contract.id}/sign`;
                }}
              />
            )}
            {/* Delete button */}
            {!isPendingSellerSignature && onDelete && (
              (!booking.seller_counter_proposal && booking.status !== 'seller_responded') ||
              booking.status === 'revision_requested'
            ) && booking.status !== 'accepted' && booking.status !== 'declined' && (
                <DeleteButton
                  currentLanguage={currentLanguage}
                  onClick={onDelete}
                />
              )}
            {/* Accept button */}
            {!isPendingSellerSignature && onAccept && (booking.seller_counter_proposal || booking.status === 'seller_responded') &&
              booking.status !== 'revision_requested' &&
              booking.status !== 'accepted' &&
              booking.status !== 'declined' && (
                <AcceptButton
                  currentLanguage={currentLanguage}
                  onClick={onAccept}
                />
              )}
          </>
        )}
        <ViewDetailsButton
          currentLanguage={currentLanguage}
          onClick={onClick}
        />
      </ActionButtonGroup>
    </SoftCard>
  );
};
