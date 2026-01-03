import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { SignatureCanvas } from "@/components/SignatureCanvas";
import { GeneralTerms } from "./GeneralTerms";
import { ContractProgressTracker } from "./ContractProgressTracker";
import { SellerContractProgressTracker } from "./SellerContractProgressTracker";
import {
    FileText, Calendar, MapPin, User, CheckCircle, PenTool, ShieldCheck,
    DollarSign, Briefcase, Clock, Sun, Sunset, Moon, Download, ImageIcon,
    ArrowLeft, Lock, Undo
} from 'lucide-react';
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { SAUDI_CITIES_BILINGUAL } from "@/lib/saudiCities";
import { useCurrency } from "@/hooks/useCurrency";
import { formatDuration } from "@/utils/formatDuration";
import { useNavigate } from "react-router-dom";

interface ContractAgreementScreenProps {
    contractId: string;
    currentUserRole: 'buyer' | 'seller';
    currentLanguage: 'en' | 'ar';
}

export const ContractAgreementScreen = ({
    contractId,
    currentUserRole,
    currentLanguage
}: ContractAgreementScreenProps) => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const { formatAmount } = useCurrency();

    // Inline signature state
    const [signatureData, setSignatureData] = useState<string>("");
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [isSigning, setIsSigning] = useState(false);

    // State to control showing the success tracker after signing
    const [showSuccessTracker, setShowSuccessTracker] = useState(false);

    // Fetch contract data
    const { data: contract, isLoading } = useQuery({
        queryKey: ['contract-agreement', contractId],
        queryFn: async () => {
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
            title, title_ar, description, description_ar, category, city, location, photos, seller_marked_complete, buyer_marked_complete
          ),
          booking:booking_requests!contracts_booking_id_fkey(
            job_description, service_category, location_city, photos, seller_response, seller_counter_proposal, proposed_start_date, final_amount, preferred_time_slot, seller_marked_complete, buyer_marked_complete
          )
        `)
                .eq('id', contractId)
                .single();

            if (error) throw error;
            return data;
        },
    });

    const hasSignature = signatureData.length > 0;
    const canSign = hasSignature && termsAccepted;

    const handleSignContract = async () => {
        if (!canSign || !contract) return;

        setIsSigning(true);
        try {
            const timestamp = new Date().toISOString();
            const updateData: any = {};

            // Only update the timestamp columns (not signature data - that goes to contract_signatures table)
            if (currentUserRole === 'buyer') {
                updateData.signed_at_buyer = timestamp;
            } else {
                updateData.signed_at_seller = timestamp;
            }

            // Check for execution
            const isExecuted =
                (currentUserRole === 'buyer' && contract?.signed_at_seller) ||
                (currentUserRole === 'seller' && contract?.signed_at_buyer);

            if (isExecuted) {
                updateData.status = 'executed';
                updateData.executed_at = timestamp;
            } else {
                // If not executed, update status to reflect who we are waiting for
                // If buyer signs, we are now waiting for seller
                // If seller signs, we are now waiting for buyer
                if (currentUserRole === 'buyer') {
                    updateData.status = 'pending_seller';
                } else {
                    updateData.status = 'pending_buyer';
                }
            }

            // 1. Update Contract timestamps
            const { error } = await supabase
                .from('contracts')
                .update(updateData)
                .eq('id', contractId);

            if (error) throw error;

            // 2. Insert into contract_signatures table for audit trail
            await supabase.from("contract_signatures").insert({
                contract_id: contractId,
                user_id: currentUserRole === 'buyer' ? contract.buyer_id : contract.seller_id,
                version: contract.version || 1,
                signature_hash: signatureData,
                signature_method: "digital",
            });

            // 3. Update Booking Request if executed
            if (isExecuted && contract.booking_id) {
                await supabase.from("booking_requests")
                    .update({ status: "accepted" })
                    .eq("id", contract.booking_id);
            }

            toast.success(currentLanguage === 'ar' ? 'تم توقيع العقد بنجاح' : 'Contract signed successfully');
            queryClient.invalidateQueries({ queryKey: ['contract-agreement', contractId] });

            // Show the success tracker
            setShowSuccessTracker(true);

        } catch (error) {
            console.error('Error signing contract:', error);
            toast.error(currentLanguage === 'ar' ? 'فشل توقيع العقد' : 'Failed to sign contract');
        } finally {
            setIsSigning(false);
        }
    };

    const handleWithdrawSignature = async () => {
        if (currentUserRole !== 'buyer' || contract?.signed_at_seller) return;

        try {
            const { error } = await supabase
                .from('contracts')
                .update({
                    signed_at_buyer: null,
                    status: 'pending_buyer'
                })
                .eq('id', contractId);

            if (error) throw error;

            setSignatureData("");
            setTermsAccepted(false);

            toast.success(currentLanguage === 'ar' ? 'تم سحب التوقيع بنجاح' : 'Signature withdrawn successfully');
            queryClient.invalidateQueries({ queryKey: ['contract-agreement', contractId] });

        } catch (error) {
            console.error('Error withdrawing signature:', error);
            toast.error(currentLanguage === 'ar' ? 'فشل سحب التوقيع' : 'Failed to withdraw signature');
        }
    };

    const content = {
        en: {
            draftContract: 'Contract Agreement',
            quote: 'Quote',
            review: 'Review',
            work: 'Work',
            serviceAgreement: 'Service Agreement',
            between: 'Between',
            andProvider: 'and Provider',
            reqDesc: 'Request Description',
            quoteDesc: 'Quote Description',
            timelineLoc: 'Timeline & Location',
            startDate: 'Start Date',
            duration: 'Duration',
            buyerDocs: 'Supporting Documents',
            financials: 'Financial Details',
            subtotal: 'Subtotal',
            total: 'Total',
            buyerSig: 'Buyer Signature',
            providerSig: 'Provider Signature',
            signed: 'Signed',
            pending: 'Pending',
            signContract: 'Sign Contract',
            waitingForCustomer: 'Waiting for customer signature',
            waitingForProvider: 'Waiting for provider signature',
            noDescription: 'No description',
            directBooking: 'Direct booking',
            timeSlot: 'Time Preference',
            tbd: 'TBD',
            serviceType: 'Service Type',
            morning: 'Morning',
            afternoon: 'Afternoon',
            night: 'Night',
            executed: 'Contract Executed',
            yourSignature: 'Your Signature',
            signHere: 'Sign here',
            clear: 'Clear',
            termsCheckbox: 'I have read and agree to the terms and conditions',
            signatureStatus: 'Signature Status',
            withdraw: 'Withdraw',
            buyerWithdrew: 'Customer withdrew their signature',
            buyerWithdrewDesc: 'The customer needs to sign before you can proceed.',
        },
        ar: {
            draftContract: 'اتفاقية العقد',
            quote: 'العرض',
            review: 'مراجعة',
            work: 'العمل',
            serviceAgreement: 'اتفاقية خدمة',
            between: 'بين',
            andProvider: 'ومقدم الخدمة',
            reqDesc: 'وصف الطلب',
            quoteDesc: 'وصف العرض',
            timelineLoc: 'الجدول الزمني والموقع',
            startDate: 'تاريخ البدء',
            duration: 'المدة',
            buyerDocs: 'المستندات الداعمة',
            financials: 'التفاصيل المالية',
            subtotal: 'المجموع الفرعي',
            total: 'الإجمالي',
            buyerSig: 'توقيع المشتري',
            providerSig: 'توقيع مقدم الخدمة',
            signed: 'تم التوقيع',
            pending: 'قيد الانتظار',
            signContract: 'توقيع العقد',
            waitingForCustomer: 'بانتظار توقيع العميل',
            waitingForProvider: 'بانتظار توقيع مقدم الخدمة',
            noDescription: 'لا يوجد وصف',
            directBooking: 'حجز مباشر',
            timeSlot: 'الوقت',
            tbd: 'غير محدد',
            serviceType: 'نوع الخدمة',
            morning: 'صباحاً',
            afternoon: 'ظهراً',
            night: 'مساءً',
            executed: 'تم تنفيذ العقد',
            yourSignature: 'توقيعك',
            signHere: 'وقّع هنا',
            clear: 'مسح',
            termsCheckbox: 'لقد قرأت ووافقت على الشروط والأحكام',
            signatureStatus: 'حالة التوقيع',
            withdraw: 'تراجع',
            buyerWithdrew: 'تراجع العميل عن توقيعه',
            buyerWithdrewDesc: 'يجب أن يقوم العميل بالتوقيع أولاً قبل أن تتمكن من المتابعة.',
        }
    };

    const t = content[currentLanguage];

    if (isLoading) {
        return (
            <div className="p-4 space-y-4 max-w-lg mx-auto">
                <Skeleton className="h-14 w-full rounded-none mb-6" />
                <Skeleton className="h-64 w-full rounded-3xl" />
                <Skeleton className="h-40 w-full rounded-3xl" />
            </div>
        );
    }

    if (!contract) return null;

    // Data Extraction Logic
    const isBookingContract = !!contract.booking_id;
    const terms = Array.isArray(contract.binding_terms) ? contract.binding_terms[0] : contract.binding_terms;
    const quote = Array.isArray(contract.quote) ? contract.quote[0] : contract.quote;
    const mr = contract.maintenance_request as any;
    const booking = contract.booking as any;
    const metadata = contract.metadata as any;
    const sellerCounterProposal = booking?.seller_counter_proposal;

    // Helper to clean bracketed metadata from descriptions
    const cleanDescription = (text: string | undefined | null): string => {
        if (!text) return t.noDescription;
        // Remove bracketed metadata like [وقت مرن], [تاريخ مرن], flexible date, flexible time, etc.
        return text
            .replace(/\[وقت مرن\]/g, '')
            .replace(/\[تاريخ مرن\]/g, '')
            .replace(/\[flexible time\]/gi, '')
            .replace(/\[flexible date\]/gi, '')
            .replace(/\[ASAP\]/gi, '')
            .replace(/\[عاجل\]/g, '')
            .trim() || t.noDescription;
    };

    // Unified display values
    const rawDescription = isBookingContract
        ? (booking?.job_description || metadata?.job_description)
        : mr?.description;
    const requestDescription = cleanDescription(rawDescription);

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

    // City localization
    const rawCity = (isBookingContract ? (booking?.location_city || metadata?.location_city) : mr?.city || "");
    const cityKey = rawCity.toLowerCase();
    const cityObj = SAUDI_CITIES_BILINGUAL.find(c => c.en.toLowerCase() === cityKey);
    const displayCity = currentLanguage === 'ar' ? (cityObj?.ar || rawCity) : (cityObj?.en || rawCity);

    const rawAddress = (contract.metadata as any)?.location_address || booking?.location_address || mr?.location;
    const displayLocation = (rawAddress && rawAddress.toLowerCase() !== cityKey && displayCity)
        ? `${rawAddress}, ${displayCity}`
        : (rawAddress || displayCity || t.tbd);

    const getTimeLabel = (slot: string) => {
        const labels: Record<string, string> = {
            morning: t.morning,
            afternoon: t.afternoon,
            night: t.night,
        };
        return labels[slot] || slot;
    };

    const isBuyerSigned = !!contract.signed_at_buyer;
    const isSellerSigned = !!contract.signed_at_seller;
    const isExecuted = contract.status === 'executed';
    const isSignedByMe = currentUserRole === 'buyer' ? isBuyerSigned : isSellerSigned;
    const isActive = ['executed', 'active', 'completed'].includes(contract.status);

    // Show progress tracker if we just signed OR if contract is already executed/active/completed
    if (showSuccessTracker || isActive) {
        // Render the appropriate progress tracker based on role
        if (currentUserRole === 'buyer') {
            return (
                <ContractProgressTracker
                    contract={contract}
                    currentLanguage={currentLanguage}
                />
            );
        } else {
            // For seller, use SellerContractProgressTracker
            const job = (contract.booking || contract.maintenance_request) as any;
            return (
                <SellerContractProgressTracker
                    contract={contract}
                    currentLanguage={currentLanguage}
                    sellerMarkedComplete={job?.seller_marked_complete}
                    buyerMarkedComplete={job?.buyer_marked_complete}
                />
            );
        }
    }

    return (
        <motion.div
            className="min-h-screen bg-paper pb-40 font-sans"
            dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
        >
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

            <div className="p-4 space-y-4 max-w-lg mx-auto">
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
                            <div className="font-bold text-lg text-foreground mb-3">
                                {(contract.buyer as any)?.company_name || (contract.buyer as any)?.full_name || 'Buyer'}
                            </div>
                            <div className="text-sm text-muted-foreground mb-1">{t.andProvider}</div>
                            <div className="font-bold text-lg text-primary">
                                {(contract.seller as any)?.company_name || (contract.seller as any)?.full_name || 'Provider'}
                            </div>
                        </div>
                    </div>

                    {/* Content Section */}
                    <div className="p-5 space-y-8">
                        {/* Service Category */}
                        {isBookingContract && serviceCategory && (
                            <>
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
                                <div className="h-px bg-gray-100 w-full" />
                            </>
                        )}

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
                            <>
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
                                <div className="h-px bg-gray-100 w-full" />
                            </>
                        )}

                        {/* Terms Component */}
                        <GeneralTerms currentLanguage={currentLanguage} />
                    </div>
                </div>

                {/* Signature Status Card */}
                <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-4">
                    <h3 className="font-bold text-ink text-center mb-2">{t.signatureStatus}</h3>

                    {/* Buyer Sig */}
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
                        {isBuyerSigned && !isSellerSigned && currentUserRole === 'buyer' && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleWithdrawSignature}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 px-2"
                            >
                                <Undo size={14} className="mr-1 rtl:ml-1 rtl:mr-0" />
                                <span className="text-xs">{t.withdraw}</span>
                            </Button>
                        )}
                    </div>

                    {/* Seller Sig - Show lock if buyer hasn't signed */}
                    <div className={cn(
                        "bg-gray-50/50 p-4 rounded-2xl border border-gray-100 flex items-center justify-between",
                        !isBuyerSigned && "opacity-60"
                    )}>
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center",
                                isSellerSigned ? "bg-green-100 text-green-600" :
                                    !isBuyerSigned ? "bg-amber-100 text-amber-600" : "bg-gray-100 text-gray-400"
                            )}>
                                {isSellerSigned ? <CheckCircle size={20} /> :
                                    !isBuyerSigned ? <Lock size={20} /> : <PenTool size={20} />}
                            </div>
                            <div>
                                <div className="text-sm font-semibold text-ink">{t.providerSig}</div>
                                <div className={cn("text-xs",
                                    isSellerSigned ? "text-green-600" :
                                        !isBuyerSigned ? "text-amber-600" : "text-muted-foreground"
                                )}>
                                    {isSellerSigned
                                        ? `${t.signed} ${format(new Date(contract.signed_at_seller), 'MMM d, h:mm a')}`
                                        : !isBuyerSigned
                                            ? t.waitingForCustomer
                                            : t.waitingForProvider}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Inline Signature Section (only if not signed by me AND buyer has signed if I'm seller) */}
                {!isSignedByMe && (currentUserRole === 'buyer' || isBuyerSigned) && (
                    <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-4">
                        <h3 className="font-bold text-ink text-center">{t.yourSignature}</h3>

                        {/* Signature Canvas */}
                        <SignatureCanvas
                            onChange={setSignatureData}
                            signLabel={t.signHere}
                            clearLabel={t.clear}
                        />

                        {/* Terms Checkbox */}
                        <div className="flex items-start gap-3 pt-2">
                            <Checkbox
                                id="terms"
                                checked={termsAccepted}
                                onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                                className="mt-0.5"
                            />
                            <label
                                htmlFor="terms"
                                className="text-sm text-muted-foreground leading-relaxed cursor-pointer"
                            >
                                {t.termsCheckbox}
                            </label>
                        </div>
                    </div>
                )}

                {/* Message for seller when buyer has withdrawn */}
                {currentUserRole === 'seller' && !isBuyerSigned && !isSellerSigned && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center space-y-2">
                        <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
                            <Lock size={24} className="text-amber-600" />
                        </div>
                        <p className="font-semibold text-amber-800">{t.buyerWithdrew}</p>
                        <p className="text-sm text-amber-600">{t.buyerWithdrewDesc}</p>
                    </div>
                )}
            </div>

            {/* Bottom Action Bar - Hide for seller if buyer hasn't signed */}
            {!isSignedByMe && (currentUserRole === 'buyer' || isBuyerSigned) && (
                <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-20">
                    <div className="max-w-md mx-auto flex items-center justify-between gap-4">
                        {/* Price on Right (in RTL it will flip) */}
                        <div className="text-right rtl:text-left">
                            <div className="text-xs text-muted-foreground uppercase tracking-wider">{t.total}</div>
                            <div className="text-xl font-bold text-primary">{formatAmount(priceValue, "SAR", 2)}</div>
                        </div>

                        {/* Sign Button on Left (in RTL it will flip) */}
                        <Button
                            size="lg"
                            className={cn(
                                "rounded-full font-semibold shadow-lg h-12 flex-1 max-w-[200px] transition-all",
                                canSign
                                    ? "bg-primary hover:bg-primary/90 text-white"
                                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                            )}
                            disabled={!canSign || isSigning}
                            onClick={handleSignContract}
                        >
                            {isSigning ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <PenTool size={18} className="mr-2 rtl:ml-2 rtl:mr-0" />
                                    {t.signContract}
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            )}
        </motion.div>
    );
};