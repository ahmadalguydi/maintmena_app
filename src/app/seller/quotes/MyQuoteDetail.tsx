import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/hooks/useCurrency';
import { GradientHeader } from '@/components/mobile/GradientHeader';
import { LoadingShimmer } from '@/components/LoadingShimmer';
import { Heading2, Heading3, Body, BodySmall, Label } from '@/components/mobile/Typography';
import { DollarSign, Clock, FileText, MessageCircle, Edit3, MapPin, Calendar, AlertCircle, Quote, Trash2, Image as ImageIcon, Pencil } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useJourneyProgress } from '@/hooks/useJourneyProgress';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { formatDuration } from '@/utils/formatDuration';
import { getCategoryIcon, getCategoryLabel } from '@/lib/serviceCategories';
import { SAUDI_CITIES_BILINGUAL } from '@/lib/saudiCities';

interface MyQuoteDetailProps {
  currentLanguage: 'en' | 'ar';
}

export const MyQuoteDetail = ({ currentLanguage }: MyQuoteDetailProps) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { formatAmount } = useCurrency();
  const [showJourneyOverlay, setShowJourneyOverlay] = useState(true);

  const { data: quote, isLoading, refetch } = useQuery({
    queryKey: ['seller-quote-detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quote_submissions')
        .select(`
          *,
          maintenance_requests(
            id,
            title,
            title_ar,
            description,
            description_ar,
            city,
            title_ar,
            description,
            description_ar,
            category,
            city,
            location,
            budget,
            urgency,
            created_at,
            preferred_start_date,
            buyer_id,
            photos
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id
  });

  // Check if there's a pending contract for this quote
  const { data: pendingContract } = useQuery({
    queryKey: ['quote-pending-contract', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contracts')
        .select('id, status')
        .eq('quote_id', id)
        .in('status', ['pending_seller', 'pending_buyer'])
        .single();

      if (error && error.code !== 'PGRST116') throw error; // Ignore "no rows" error
      return data;
    },
    enabled: !!id  // Always check for contract, not dependent on quote status
  });

  // Fetch full contract data for journey tracking
  const { data: fullContract } = useQuery({
    queryKey: ['quote-contract-full', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('quote_id', id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!id
  });

  // Journey progress for dopamine timeline
  const journeyProgress = useJourneyProgress({
    flowType: 'quote',
    role: 'seller',
    entityId: quote?.request_id || '',
    entityTable: 'maintenance_requests',
    quoteStatus: quote?.status,
    contractStatus: fullContract?.status,
    buyerSigned: !!fullContract?.signed_at_buyer,
    sellerSigned: !!fullContract?.signed_at_seller,
    lastSeenStage: (quote?.maintenance_requests as any)?.seller_last_seen_stage ?? null,
  });

  const content = {
    en: {
      title: 'Quote Detail',
      status: 'Status',
      sent: 'Sent',
      inReview: 'In Review',
      accepted: 'Accepted',
      rejected: 'Rejected',
      jobDetails: 'Request Details',
      yourQuote: 'Your Quote',
      price: 'Price',
      duration: 'Duration',
      proposal: 'Proposal',
      chat: 'Chat',
      edit: 'Edit Quote',
      notFound: 'Quote not found',
      location: 'Location',
      urgency: 'Urgency',
      posted: 'Posted',
      priceBreakdown: 'Price Breakdown',
      revisionRequested: 'Revision Requested',
      buyerMessage: 'Buyer\'s Message',
      updateQuote: 'Update Quote',
      signContract: 'Sign Contract',
      viewContract: 'View Contract'
    },
    ar: {
      title: 'تفاصيل العرض',
      status: 'الحالة',
      sent: 'مرسل',
      inReview: 'قيد المراجعة',
      accepted: 'مقبول',
      rejected: 'مرفوض',
      jobDetails: 'تفاصيل الطلب',
      yourQuote: 'عرضك',
      price: 'السعر',
      duration: 'المدة',
      proposal: 'محتوى العرض',
      chat: 'محادثة',
      edit: 'تعديل',
      notFound: 'العرض غير موجود',
      location: 'الموقع',
      urgency: 'الأهمية',
      posted: 'نُشر',
      priceBreakdown: 'تفاصيل السعر',
      revisionRequested: 'طلب تعديل',
      buyerMessage: 'رسالة المشتري',
      updateQuote: 'تحديث العرض',
      signContract: 'توقيع العقد',
      viewContract: 'عرض العقد'
    }
  };

  const t = content[currentLanguage];

  if (isLoading) {
    return (
      <div className="pb-28 min-h-screen bg-background" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
        <GradientHeader
          title={t.title}
          showBack={true}
          onBack={() => navigate('/app/seller/quotes')}
          className="sticky top-0 z-50 bg-background/95 backdrop-blur-md"
        />
        <div className="px-6 py-6 space-y-4">
          <LoadingShimmer type="card" />
          <LoadingShimmer type="card" />
        </div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="pb-28 min-h-screen bg-background" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
        <GradientHeader
          title={t.title}
          showBack={true}
          onBack={() => navigate('/app/seller/quotes')}
          className="sticky top-0 z-50 bg-background/95 backdrop-blur-md"
        />
        <div className="px-6 py-20 text-center">
          <BodySmall lang={currentLanguage} className="text-muted-foreground">{t.notFound}</BodySmall>
        </div>
      </div>
    );
  }

  const request = quote.maintenance_requests as any;
  const isPending = quote.status === 'pending';
  const isRevisionRequested = quote.status === 'revision_requested';

  // Status Logic
  const getStatusColor = (s: string) => {
    switch (s) {
      case 'accepted': return 'bg-green-100 text-green-700 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
      case 'revision_requested': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-primary/10 text-primary border-primary/20'; // Pending/Open
    }
  };

  const getStatusLabel = (s: string) => {
    if (s === 'revision_requested') return t.revisionRequested;
    if (s === 'accepted') return t.accepted;
    if (s === 'rejected') return t.rejected;
    return t.sent;
  };

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
    <div className="min-h-screen bg-background pb-32" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      <GradientHeader
        title={t.title}
        showBack={true}
        onBack={() => navigate('/app/seller/quotes')}
        className="sticky top-0 z-50 bg-background/95 backdrop-blur-md"
      />

      <div className="px-4 py-6 space-y-6">

        {/* Contract Pending Seller Signature Alert */}
        {pendingContract && pendingContract.status === 'pending_seller' && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-400 rounded-2xl p-5 shadow-lg animate-fadeIn"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className={cn("font-bold text-amber-800 text-lg", currentLanguage === 'ar' ? 'font-ar-display' : 'font-display')}>
                  {currentLanguage === 'ar' ? '🎉 تم قبول عرضك!' : '🎉 Your Quote Was Accepted!'}
                </h3>
                <p className="text-sm text-amber-700">
                  {currentLanguage === 'ar' ? 'قم بتوقيع العقد لبدء العمل' : 'Sign the contract to start the job'}
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate(`/app/seller/contract/${pendingContract.id}/review`)}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-base shadow-md flex items-center justify-center gap-2 hover:from-amber-600 hover:to-orange-600 transition-all transform hover:scale-[1.02]"
            >
              <Pencil className="w-4 h-4" />
              {t.signContract}
            </button>
          </motion.div>
        )}

        {/* Contract Signed - Waiting for Buyer */}
        {pendingContract && pendingContract.status === 'pending_buyer' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-50 border border-green-200 rounded-2xl p-4 animate-fadeIn"
          >
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-5 h-5 text-green-600" />
              <h3 className="font-bold text-green-800">
                {currentLanguage === 'ar' ? 'تم توقيع العقد' : 'Contract Signed'}
              </h3>
            </div>
            <p className="text-sm text-green-700">
              {currentLanguage === 'ar' ? 'بانتظار توقيع المشتري للبدء بالعمل' : 'Waiting for buyer signature to start the job'}
            </p>
          </motion.div>
        )}

        {/* Revision Alert */}
        {isRevisionRequested && quote.revision_message && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 animate-fadeIn">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              <h3 className="font-bold text-amber-800">{t.revisionRequested}</h3>
            </div>
            <p className="text-sm text-amber-800/90 leading-relaxed bg-white/50 p-3 rounded-xl">
              {quote.revision_message}
            </p>
          </div>
        )}

        {/* Job Summary Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="bg-card rounded-[2rem] p-5 shadow-sm border border-border/50">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                {/* Service Badge */}
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border bg-background shadow-sm">
                  <span className="text-sm">{getCategoryIcon((quote.maintenance_requests as any)?.category)}</span>
                  <span className="text-xs font-medium text-foreground">
                    {getCategoryLabel((quote.maintenance_requests as any)?.category, currentLanguage)}
                  </span>
                </div>
              </div>
              {!isRevisionRequested && (
                <span className={cn("text-xs px-2.5 py-1 rounded-full font-bold border", getStatusColor(quote.status))}>
                  {getStatusLabel(quote.status)}
                </span>
              )}
            </div>

            <div className="mb-4">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">{t.jobDetails}</span>
              <h2 className={cn(
                "text-xl font-bold text-foreground leading-tight mb-2",
                currentLanguage === 'ar' ? 'font-ar-display' : 'font-display'
              )}>
                {currentLanguage === 'ar' && request.title_ar ? request.title_ar : request.title}
              </h2>
              <p className={cn(
                "text-sm text-foreground/80 leading-relaxed",
                currentLanguage === 'ar' ? 'font-ar-body' : 'font-body'
              )}>
                {currentLanguage === 'ar' && request.description_ar ? request.description_ar : request.description}
              </p>
            </div>

            <div className="flex flex-wrap gap-3 text-sm pt-2 border-t border-border/40">
              <div className="flex items-center gap-1.5 text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-full">
                <MapPin className="w-3.5 h-3.5" />
                <span>{getLocalizedCity(request.city) || request.location}</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-full">
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  {request.preferred_start_date
                    ? format(new Date(request.preferred_start_date), 'dd MMM', { locale: currentLanguage === 'ar' ? ar : enUS })
                    : t.posted}
                </span>
              </div>
            </div>

            {/* Request Photos */}
            {request.photos && (request.photos as string[]).length > 0 && (
              <div className="pt-3">
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {(request.photos as string[]).map((photo: string, index: number) => (
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
                        className="w-16 h-16 object-cover rounded-xl border border-border hover:opacity-80 transition-opacity"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Quote Details Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <div className="bg-card rounded-[2rem] p-6 shadow-sm border border-border/50 space-y-6">
            <div className="flex justify-between items-baseline border-b border-border/40 pb-4">
              <span className="text-muted-foreground font-medium">{t.price}</span>
              <span className="text-3xl font-bold text-primary font-display">
                {formatAmount(quote.price)}
              </span>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Duration */}
              <div className="bg-background border border-border/50 rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-2 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-[#8B4513]/10 flex items-center justify-center text-[#8B4513]">
                  <Clock className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t.duration}</span>
                <span className="text-lg font-bold text-foreground">
                  {formatDuration(quote.estimated_duration, currentLanguage)}
                </span>
              </div>

              {/* Start Date */}
              <div className="bg-background border border-border/50 rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-2 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-[#8B4513]/10 flex items-center justify-center text-[#8B4513]">
                  <Calendar className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{currentLanguage === 'ar' ? 'تاريخ البدء' : 'START DATE'}</span>
                <span className="text-lg font-bold text-foreground">
                  {(() => {
                    const dateVal = quote.start_date || (quote.proposal?.match(/(?:Proposed|Updated) Start Date: (\d{4}-\d{2}-\d{2})/)?.[1]);
                    if (!dateVal) return t.posted; // Fallback

                    const date = new Date(dateVal);
                    const today = new Date();
                    const d1 = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                    const d2 = new Date(today.getFullYear(), today.getMonth(), today.getDate());

                    // Check Today/Tomorrow
                    if (d1.getTime() === d2.getTime()) return currentLanguage === 'ar' ? 'اليوم' : 'Today';

                    const tomorrow = new Date(d2);
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    if (d1.getTime() === tomorrow.getTime()) return currentLanguage === 'ar' ? 'غداً' : 'Tomorrow';

                    return format(date, 'd MMM', { locale: currentLanguage === 'ar' ? ar : enUS });
                  })()}
                </span>
              </div>
            </div>

            {/* Description Card */}
            <div className="relative bg-background rounded-xl p-5 shadow-sm border border-border/50 border-s-4 border-s-[#8B4513] overflow-hidden">
              <div className="flex items-center gap-2 mb-3 text-[#8B4513]">
                <Quote className="w-5 h-5 fill-current opacity-50" />
                <span className="font-bold text-sm">{currentLanguage === 'ar' ? 'الوصف' : 'Description'}</span>
              </div>

              <p className={cn(
                "text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap italic",
                currentLanguage === 'ar' ? 'font-ar-body' : 'font-body'
              )}>
                "{(() => {
                  const cleanProposal = (currentLanguage === 'ar' && quote.proposal_ar ? quote.proposal_ar : quote.proposal)
                    .replace(/(?:Proposed|Updated) Start Date:.*$/gim, '')
                    .trim();
                  return cleanProposal;
                })()}"
              </p>
            </div>

            {/* Quote Photos (seller's attachments) */}
            {(quote as any).attachments && ((quote as any).attachments as string[]).length > 0 && (
              <div className="bg-background rounded-xl p-5 shadow-sm border border-border/50">
                <div className="flex items-center gap-2 mb-3 text-[#8B4513]">
                  <ImageIcon className="w-5 h-5" />
                  <span className="font-bold text-sm">{currentLanguage === 'ar' ? 'مرفقات العرض' : 'Quote Attachments'}</span>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {((quote as any).attachments as string[]).map((photo, index) => (
                    <a
                      key={index}
                      href={photo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0"
                    >
                      <img
                        src={photo}
                        alt={`Quote photo ${index + 1}`}
                        className="w-20 h-20 object-cover rounded-xl border border-border hover:opacity-80 transition-opacity"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>


      </div>

      {/* Sticky Bottom Actions */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.3 }}
        className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-md border-t border-border/50 flex gap-3 z-40 pb-safe"
      >
        {(isPending || isRevisionRequested) && !pendingContract && (
          <>
            <button
              onClick={async () => {
                if (!confirm(currentLanguage === 'ar' ? 'هل أنت متأكد من حذف هذا العرض؟' : 'Are you sure you want to delete this quote?')) return;
                const { error } = await supabase.from('quote_submissions').delete().eq('id', id);
                if (!error) navigate('/app/seller/quotes');
              }}
              className="flex-1 h-11 rounded-full bg-[#EF4444] text-white font-bold text-base shadow-lg flex items-center justify-center gap-2 hover:bg-[#DC2626] transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              {currentLanguage === 'ar' ? 'حذف' : 'Delete'}
            </button>

            <button
              onClick={() => navigate(`/app/seller/quote/${quote.id}/edit`)}
              className="flex-1 h-11 rounded-full bg-[#A0522D] text-white font-bold text-base shadow-lg flex items-center justify-center gap-2 hover:bg-[#8B4513] transition-colors"
            >
              <Edit3 className="w-4 h-4" />
              {isRevisionRequested ? (currentLanguage === 'ar' ? 'تحديث' : 'Update') : (currentLanguage === 'ar' ? 'تعديل' : 'Edit')}
            </button>
          </>
        )}

        {pendingContract && (
          <button
            onClick={() => navigate(`/app/seller/contract/${pendingContract.id}/review`)}
            className="w-full h-12 rounded-full bg-gradient-to-r from-accent to-primary text-white font-bold text-base shadow-lg flex items-center justify-center gap-2 transform hover:scale-[1.02] transition-all"
          >
            <Pencil className="w-4 h-4" />
            {t.signContract}
          </button>
        )}

        {quote.status === 'accepted' && !pendingContract && (
          <div className="w-full text-center py-2 text-muted-foreground text-sm">
            {currentLanguage === 'ar' ? 'بانتظار إنشاء العقد...' : 'Waiting for contract generation...'}
          </div>
        )}
      </motion.div>

    </div>
  );
};
