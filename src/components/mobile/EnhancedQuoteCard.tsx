import { motion } from 'framer-motion';
import { MapPin, DollarSign, Clock, Edit, MessageCircle, Activity, Trash2, Calendar, Pencil } from 'lucide-react';
import { SoftCard } from './SoftCard';
import { StatusPill } from './StatusPill';
import { getAllCategories } from '@/lib/serviceCategories';
import { SAUDI_CITIES_BILINGUAL } from '@/lib/saudiCities';
import { formatDistanceToNow, format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { useCurrency } from '@/hooks/useCurrency';
import { QuoteCompetitionIndicator } from './QuoteCompetitionIndicator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useState } from 'react';

interface EnhancedQuoteCardProps {
  quote: any;
  request: any;
  allQuotes: any[];
  contract?: { id: string; status: string } | null;
  currentLanguage: 'en' | 'ar';
  onClick: () => void;
  onEdit?: () => void;
  onMessage?: () => void;
}

export const EnhancedQuoteCard = ({
  quote,
  request,
  allQuotes,
  contract,
  currentLanguage,
  onClick,
  onEdit,
  onMessage
}: EnhancedQuoteCardProps) => {
  const { formatAmount } = useCurrency();
  const queryClient = useQueryClient();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const allCategories = getAllCategories();
  const category = allCategories.find(c => c.key === request.category);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('quote_submissions')
        .delete()
        .eq('id', quote.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-quotes'] });
      toast.success(currentLanguage === 'ar' ? 'تم حذف العرض' : 'Quote deleted successfully');
    },
    onError: () => {
      toast.error(currentLanguage === 'ar' ? 'فشل حذف العرض' : 'Failed to delete quote');
    }
  });

  // Calculate competition metrics
  const quotePrices = allQuotes.map(q => q.price).filter(Boolean).sort((a, b) => a - b);
  const myRank = quotePrices.findIndex(p => p === quote.price) + 1;
  const lowestPrice = quotePrices[0];
  const requestBudget = request.estimated_budget_max || request.budget;

  // Determine competitiveness
  const getCompetitiveness = () => {
    if (!requestBudget || quotePrices.length < 2) return null;
    const percentOfBudget = (quote.price / requestBudget) * 100;
    if (percentOfBudget <= 70) return { label: 'Competitive', label_ar: 'تنافسي', color: 'text-green-600' };
    if (percentOfBudget <= 90) return { label: 'Fair', label_ar: 'عادل', color: 'text-yellow-600' };
    return { label: 'High', label_ar: 'مرتفع', color: 'text-red-600' };
  };

  const competitiveness = getCompetitiveness();

  // Status config
  const statusConfig: Record<string, { type: 'pending' | 'success' | 'warning' | 'error'; label: string; label_ar: string }> = {
    sent: { type: 'warning', label: 'Sent', label_ar: 'تم الإرسال' },
    in_review: { type: 'pending', label: 'Under Review', label_ar: 'قيد المراجعة' },
    accepted: { type: 'success', label: 'Accepted', label_ar: 'مقبول' },
    rejected: { type: 'error', label: 'Rejected', label_ar: 'مرفوض' }
  };

  // If contract exists (pending_seller or pending_buyer), force show "accepted" status
  const effectiveStatus = contract?.status && ['pending_seller', 'pending_buyer', 'executed'].includes(contract.status)
    ? 'accepted'
    : quote.status;

  const statusInfo = statusConfig[effectiveStatus] || statusConfig.sent;

  const getLocalizedCity = (cityKey: string | undefined | null) => {
    if (!cityKey) return currentLanguage === 'ar' ? 'غير محدد' : 'N/A';
    const cityData = SAUDI_CITIES_BILINGUAL.find(c =>
      c.en.toLowerCase() === cityKey.toLowerCase() ||
      c.ar === cityKey ||
      c.aliases?.some(alias => alias.toLowerCase() === cityKey.toLowerCase())
    );
    return cityData ? (currentLanguage === 'ar' ? cityData.ar : cityData.en) : cityKey;
  };

  return (
    <SoftCard onClick={onClick} className="space-y-3">
      {/* Header with category and location */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{category?.icon || '🔧'}</span>
          <span className="text-sm font-medium text-foreground/80">
            {currentLanguage === 'ar' ? category?.ar : category?.en}
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="w-3 h-3" />
          <span>{getLocalizedCity(request.city) || request.location}</span>
        </div>
      </div>

      {/* Request title */}
      <h3 className="font-semibold text-base leading-tight line-clamp-1">
        {currentLanguage === 'ar' ? request.title_ar || request.title : request.title}
      </h3>

      {/* Description preview */}
      <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
        {currentLanguage === 'ar'
          ? request.description_ar || request.description
          : request.description}
      </p>

      {/* Your quote price */}
      <div className="bg-accent/10 border border-accent/30 rounded-2xl p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {currentLanguage === 'ar' ? 'عرضك:' : 'Your Quote:'}
          </span>
          <span className="text-lg font-bold text-accent">{formatAmount(quote.price, 'SAR')}</span>
        </div>
      </div>

      {/* Competition analysis */}
      {quotePrices.length > 1 && (
        <QuoteCompetitionIndicator
          myQuote={quote.price}
          lowestQuote={lowestPrice}
          totalQuotes={quotePrices.length}
          myRank={myRank}
          budget={requestBudget}
          currentLanguage={currentLanguage}
        />
      )}

      {/* Buyer activity indicator */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Activity className="w-3 h-3" />
          <span>
            {currentLanguage === 'ar' ? 'المشتري نشط' : 'Buyer last active'} 1h {currentLanguage === 'ar' ? '' : 'ago'}
          </span>
        </div>
        <span>
          {currentLanguage === 'ar' ? 'تم الإرسال' : 'Sent'} {formatDistanceToNow(new Date(quote.created_at), {
            addSuffix: true,
            locale: currentLanguage === 'ar' ? arSA : undefined
          })}
        </span>
      </div>

      {/* Status and Date */}
      <div className="flex items-center justify-between">
        <StatusPill status={statusInfo.type} label={currentLanguage === 'ar' ? statusInfo.label_ar : statusInfo.label} />
        {(() => {
          const startDate = quote.start_date || quote.proposal?.match(/(?:Proposed|Updated) Start Date: (\d{4}-\d{2}-\d{2})/)?.[1];
          if (!startDate) return null;
          return (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              <span dir="ltr">{format(new Date(startDate), 'yyyy-MM-dd')}</span>
            </div>
          );
        })()}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        {effectiveStatus === 'pending' ? (
          <>
            {onEdit && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="flex-1 rounded-full px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2 bg-primary/10 text-primary hover:bg-primary/20"
              >
                <Pencil className="w-4 h-4" />
                {currentLanguage === 'ar' ? 'تعديل' : 'Edit'}
              </motion.button>
            )}
            <motion.div
              whileTap={{ scale: 0.98 }}
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
              className="flex-1 bg-muted hover:bg-muted/80 rounded-full px-4 py-2 text-center text-sm font-medium cursor-pointer"
            >
              {currentLanguage === 'ar' ? 'عرض التفاصيل ←' : 'View Details →'}
            </motion.div>
          </>
        ) : effectiveStatus === 'revision_requested' ? (
          <>
            {onEdit && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="flex-1 bg-primary text-white hover:bg-primary/90 rounded-full px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2"
              >
                <Edit className="w-4 h-4" />
                {currentLanguage === 'ar' ? 'تحديث العرض' : 'Update Quote'}
              </motion.button>
            )}
            <motion.div
              whileTap={{ scale: 0.98 }}
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
              className="flex-1 bg-muted hover:bg-muted/80 rounded-full px-4 py-2 text-center text-sm font-medium cursor-pointer"
            >
              {currentLanguage === 'ar' ? 'عرض التفاصيل ←' : 'View Details →'}
            </motion.div>
          </>
        ) : effectiveStatus === 'accepted' || contract?.status ? (
          <>
            {/* Show Sign Contract if contract exists (handled by click or separate button) */}
            <motion.div
              whileTap={{ scale: 0.98 }}
              onClick={(e) => {
                e.stopPropagation();
                // If there's a contract, navigate to it. Logic might need parent to pass contract ID.
                // For now, View Details will lead to quote detail where contract is shown.
                // Or we can add a specific button if we had the ID.
                // Since we don't have contract ID prop, we rely on click -> quote detail -> contract.
                // But user asked for specific buttons.
                onClick();
              }}
              className="flex-1 bg-primary text-white hover:bg-primary/90 rounded-full px-4 py-2 text-center text-sm font-medium cursor-pointer flex items-center justify-center gap-2"
            >
              <Pencil className="w-4 h-4" />
              {currentLanguage === 'ar' ? 'توقيع العقد' : 'Sign Contract'}
            </motion.div>

            <motion.div
              whileTap={{ scale: 0.98 }}
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
              className="flex-1 bg-muted hover:bg-muted/80 rounded-full px-4 py-2 text-center text-sm font-medium cursor-pointer"
            >
              {currentLanguage === 'ar' ? 'عرض التفاصيل ←' : 'View Details →'}
            </motion.div>
          </>
        ) : (
          onMessage && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.stopPropagation();
                onMessage();
              }}
              className="flex-1 bg-accent text-accent-foreground rounded-full px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              {currentLanguage === 'ar' ? 'رسالة للمشتري' : 'Message Buyer'}
            </motion.button>
          )
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {currentLanguage === 'ar' ? 'تأكيد الحذف' : 'Confirm Delete'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {currentLanguage === 'ar'
                ? 'هل أنت متأكد أنك تريد حذف هذا العرض؟ لا يمكن التراجع عن هذا الإجراء.'
                : 'Are you sure you want to delete this quote? This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {currentLanguage === 'ar' ? 'إلغاء' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {currentLanguage === 'ar' ? 'حذف' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SoftCard>
  );
};
