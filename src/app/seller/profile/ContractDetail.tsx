import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  FileText,
  Download,
  Calendar,
  CheckCircle,
  Clock,
  MapPin,
  BadgeCheck,
  Shield,
  MessageCircle,
  Sun,
  Sunset,
  Moon,
  PenTool,
  Wrench,
  Hammer,
  Briefcase,
  ArrowLeft,
  DollarSign,
  ShieldCheck,
  Image as ImageIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { getCategoryLabel, getCategoryIcon } from '@/lib/serviceCategories';
import { ContractDownloadButton } from "@/components/mobile/ContractDownloadButton";
import { GeneralTerms } from "@/components/contracts/GeneralTerms";
import { useCurrency } from "@/hooks/useCurrency";
import { SAUDI_CITIES_BILINGUAL } from "@/lib/saudiCities";
import { formatDuration } from "@/utils/formatDuration";

interface SellerContractDetailProps {
  currentLanguage: 'en' | 'ar';
}

export const SellerContractDetail = ({ currentLanguage }: SellerContractDetailProps) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { formatAmount } = useCurrency();

  const { data: contract, isLoading, error } = useQuery({
    queryKey: ['seller-contract-detail', id],
    queryFn: async () => {
      console.log('Fetching contract with ID:', id);
      const { data, error } = await supabase
        .from('contracts')
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
          booking:booking_requests(*)
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching contract:', error);
        throw error;
      }
      return data;
    },
    enabled: !!id
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
    signContract: currentLanguage === 'ar' ? 'توقيع العقد' : 'Sign Contract',
    cancel: currentLanguage === 'ar' ? 'إلغاء' : 'Cancel',
    download: currentLanguage === 'ar' ? 'تحميل العقد' : 'Download Contract',
    tbd: currentLanguage === 'ar' ? 'غير محدد' : 'TBD',
    timeSlot: currentLanguage === 'ar' ? 'الوقت' : 'Time Preference',
    morning: currentLanguage === 'ar' ? 'صباحاً' : 'Morning',
    afternoon: currentLanguage === 'ar' ? 'ظهراً' : 'Afternoon',
    night: currentLanguage === 'ar' ? 'مساءً' : 'Night',
  };

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
        <p className="text-muted-foreground">
          {currentLanguage === 'ar' ? 'العقد غير موجود' : 'Contract not found'}
          {error && <span className="block text-xs mt-2 text-red-500">{error.message}</span>}
        </p>
      </div>
    );
  }

  const terms = Array.isArray((contract as any).binding_terms) ? (contract as any).binding_terms[0] : (contract as any).binding_terms;
  // Handle inconsistent quote structure (could be array or object depending on query)
  const quote = Array.isArray(contract.quote) ? contract.quote[0] : contract.quote;
  const quotePrice = quote?.price;
  const quoteProposal = quote?.proposal || quote?.proposal_text;
  const quoteDuration = quote?.estimated_duration;

  const mr = (contract as any).maintenance_request;
  const booking = contract.booking as any;
  const sellerCounterProposal = booking?.seller_counter_proposal as any;

  // Helper to clean bracketed metadata
  const cleanDescription = (text: string | undefined | null): string => {
    if (!text) return "No description";
    return text
      .replace(/\[وقت مرن\]/g, '')
      .replace(/\[تاريخ مرن\]/g, '')
      .replace(/\[flexible time\]/gi, '')
      .replace(/\[flexible date\]/gi, '')
      .replace(/\[ASAP\]/gi, '')
      .replace(/\[عاجل\]/g, '')
      .trim() || "No description";
  };

  // Create fallback text from booking if maintenance request is missing or quote is partial
  const rawDescription = mr?.description || booking?.job_description;
  const displayDescription = cleanDescription(rawDescription);
  const displayProposal = quoteProposal || booking?.seller_response || sellerCounterProposal?.notes || "No proposal text";
  const displayStartDate = terms?.start_date || sellerCounterProposal?.scheduled_date || booking?.proposed_start_date;

  const priceValue = (contract.metadata as any)?.final_price || quotePrice || sellerCounterProposal?.price || booking?.final_agreed_price || booking?.final_amount || 0;

  const isBuyerSigned = !!contract.signed_at_buyer;
  const isSellerSigned = !!contract.signed_at_seller;
  const isExecuted = contract.status === 'executed';
  const needsAction = !isSellerSigned; // Seller needs to sign

  /* City & Location Logic */
  const metadata = contract.metadata as any;
  const isBookingContract = !!contract.booking_id;

  const rawCity = mr?.city || booking?.location_city || metadata?.location_city || "";
  const cityKey = rawCity.toLowerCase();
  const cityObj = SAUDI_CITIES_BILINGUAL.find(c => c.en.toLowerCase() === cityKey);
  const displayCity = currentLanguage === 'ar' ? (cityObj?.ar || rawCity) : (cityObj?.en || rawCity);

  const rawAddress = (contract.metadata as any)?.location_address || booking?.location_address || mr?.location;

  // Helper to localize city name in address string
  const localizeAddress = (address: string | null | undefined): string => {
    if (!address) return displayCity || t.tbd;

    // If in Arabic and we have a city match, replace English city name with Arabic
    if (currentLanguage === 'ar' && cityObj) {
      // Replace English city name with Arabic (case insensitive)
      const localizedAddress = address.replace(new RegExp(cityObj.en, 'gi'), cityObj.ar);
      return localizedAddress;
    }

    // Check if we need to append city
    const addressLower = address.toLowerCase();
    const addressContainsCity = addressLower.includes(cityKey) ||
      (cityObj?.ar && addressLower.includes(cityObj.ar)) ||
      (cityObj?.en && addressLower.includes(cityObj.en.toLowerCase()));

    // If address already contains city, return as-is; otherwise append localized city
    return addressContainsCity ? address : `${address}, ${displayCity}`;
  };

  const displayLocation = localizeAddress(rawAddress);

  const timeSlot = metadata?.time_preference || sellerCounterProposal?.time_preference || booking?.preferred_time_slot;

  const getTimeLabel = (slot: string) => {
    const labels: Record<string, string> = {
      morning: t.morning,
      afternoon: t.afternoon,
      night: t.night,
    };
    return labels[slot] || slot;
  };


  return (
    <div className="min-h-screen bg-paper pb-32 font-sans" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="bg-white sticky top-0 z-10 border-b border-gray-100">
        <div className="px-4 h-14 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
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
            {/* Request Description */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FileText size={18} className="text-primary" />
                <span className="text-sm font-bold text-foreground uppercase tracking-wider">{t.reqDesc}</span>
              </div>
              <div className="bg-muted/40 p-4 rounded-xl text-sm text-foreground/80 leading-relaxed border border-gray-100">
                {displayDescription}
              </div>
            </div>

            <div className="h-px bg-gray-100 w-full" />

            {/* Quote Description */}
            {displayProposal && (
              <>
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <FileText size={18} className="text-primary" />
                    <span className="text-sm font-bold text-foreground uppercase tracking-wider">{t.quoteDesc}</span>
                  </div>
                  <div className="bg-muted/40 p-4 rounded-xl text-sm text-foreground/80 leading-relaxed border border-gray-100">
                    {displayProposal}
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
                    {displayStartDate ? new Date(displayStartDate).toLocaleDateString() : "TBD"}
                  </div>
                </div>
                <div className="bg-muted/40 p-3 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                    <Clock size={12} />
                    <span>{isBookingContract ? t.timeSlot : t.duration}</span>
                  </div>
                  <div className="font-semibold text-foreground">
                    {isBookingContract
                      ? (timeSlot ? getTimeLabel(timeSlot) : t.tbd)
                      : (quoteDuration ? formatDuration(quoteDuration, currentLanguage) : t.tbd)}
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

            {/* Buyer Documents (From Request Photos) */}
            {mr?.photos && mr.photos.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Briefcase size={18} className="text-primary" />
                  <span className="text-sm font-bold text-foreground uppercase tracking-wider">{t.buyerDocs}</span>
                </div>
                <div className="space-y-2">
                  {mr.photos.map((url: string, idx: number) => (
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

            {mr?.photos && mr.photos.length > 0 && <div className="h-px bg-gray-100 w-full" />}

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

        {/* Download Button for executed contracts */}
        {isExecuted && (
          <ContractDownloadButton contractId={contract.id} pdfUrl={contract.pdf_url} currentLanguage={currentLanguage} />
        )}
      </div>

      {/* Bottom Action Bar - Only if seller needs to sign */}
      {needsAction && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
          <div className="max-w-md mx-auto">
            <Button
              size="lg"
              className="w-full rounded-full bg-primary hover:bg-primary/90 text-white font-semibold shadow-lg h-12"
              onClick={() => navigate(`/app/seller/contract/${contract.id}/review`)}
            >
              <PenTool size={18} className="mr-2" />
              {t.signContract}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
