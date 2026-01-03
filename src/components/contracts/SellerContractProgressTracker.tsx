import { useState, useEffect } from "react";
import { Check, Star, ChevronLeft, ChevronRight, Info, X, MessageCircle, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { getCategoryLabel, getCategoryIcon } from "@/lib/serviceCategories";
import { format } from "date-fns";
import { useConfetti } from "@/hooks/useConfetti";

interface SellerContractProgressTrackerProps {
    contract: any;
    currentLanguage: "en" | "ar";
    sellerMarkedComplete?: boolean;
    buyerMarkedComplete?: boolean;
}

export const SellerContractProgressTracker = ({ contract, currentLanguage, sellerMarkedComplete = false, buyerMarkedComplete = false }: SellerContractProgressTrackerProps) => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState("");
    const isArabic = currentLanguage === "ar";
    const { fire: fireConfetti } = useConfetti();

    // Fire confetti when component mounts (celebration!)
    useEffect(() => {
        // Small delay to let the component render first
        const timer = setTimeout(() => {
            fireConfetti();
        }, 300);
        return () => clearTimeout(timer);
    }, [fireConfetti]);

    // Animation Variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.2
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { type: "spring" as const, stiffness: 300, damping: 24 }
        }
    };

    const checkVariants = {
        hidden: { scale: 0, opacity: 0 },
        visible: {
            scale: 1,
            opacity: 1,
            transition: {
                type: "spring" as const,
                stiffness: 400,
                damping: 15,
                delay: 0.2
            }
        }
    };

    // Check if seller marked complete but waiting for buyer
    const isPendingBuyerApproval = sellerMarkedComplete && !buyerMarkedComplete;

    // Seller-focused steps
    const steps = [
        { label: isArabic ? "مجدول" : "Scheduled", completed: true },
        {
            label: isArabic ? "تم التوقيع" : "Signed",
            completed: !!contract.signed_at_seller || ["executed", "active", "completed"].includes(contract.status),
            active: contract.status === 'pending_seller'
        },
        {
            label: isArabic ? "جاري العمل" : "In Progress",
            completed: ["active", "completed"].includes(contract.status) || isPendingBuyerApproval,
            active: contract.status === 'executed' && !isPendingBuyerApproval
        },
        {
            label: isArabic ? "مكتمل" : "Complete",
            completed: contract.status === "completed" && buyerMarkedComplete,
            active: isPendingBuyerApproval // Active (pulsing) but not checked
        }
    ];

    const currentStepIndex = steps.reduce((acc, step, index) => (step.completed || step.active) ? index : acc, 0);

    // Query for existing review from buyer (seller can see if buyer left a review)
    const { data: buyerReview } = useQuery({
        queryKey: ["buyer-contract-review", contract.id],
        queryFn: async () => {
            const requestId = contract.request_id || contract.maintenance_request?.id;
            if (!requestId) return null;
            const { data } = await supabase
                .from("seller_reviews")
                .select("*")
                .eq("request_id", requestId)
                .eq("buyer_id", contract.buyer_id)
                .maybeSingle();
            return data;
        },
        enabled: contract.status === "completed",
    });

    const buyer = contract.buyer;
    const seller = contract.seller;
    const request = contract.maintenance_request;
    const booking = contract.booking;
    const quote = Array.isArray(contract.quote) ? contract.quote[0] : contract.quote;

    const jobTitle = booking
        ? (isArabic ? `حجز مع ${buyer?.full_name || buyer?.company_name || 'العميل'}` : `A Booking with ${buyer?.full_name || buyer?.company_name || 'Client'}`)
        : (isArabic
            ? (request?.title_ar || request?.title || booking?.service_category || "طلب")
            : (request?.title || booking?.service_category || "Request"));

    const price = (contract.metadata as any)?.final_price ||
        (contract.quote as any)?.price ||
        (contract.booking as any)?.final_agreed_price || 0;

    const jobImage = request?.photos?.[0] || null;

    // Seller-specific status messages
    const getStatusTitle = () => {
        if (isPendingBuyerApproval) return isArabic ? "🎉 يعطيك العافية! " : "🎉 Great Work!";
        if (contract.status === 'completed') return isArabic ? "تم الإنجاز!" : "Job Complete!";
        if (contract.status === 'active' || contract.status === 'executed') return isArabic ? "العقد نشط" : "Contract Active";
        if (contract.status === 'pending_buyer') return isArabic ? "بانتظار العميل" : "Waiting for Client";
        if (contract.status === 'pending_seller') return isArabic ? "في انتظار توقيعك" : "Awaiting Your Signature";
        return isArabic ? "تهانينا! فزت بالمشروع" : "Congratulations! Job Won";
    };

    const getStatusDesc = () => {
        if (isPendingBuyerApproval) return isArabic
            ? " باقي تأكيد العميل، نتمنّى لك تقييم ممتاز. كلما زاد رضاهم…زادت فرصك✨"
            : "Pending buyer's approval. Make sure you left a good impression for a great rating!";
        if (contract.status === 'completed') return isArabic ? "تم الانتهاء من العمل بنجاح." : "Work completed successfully.";
        if (contract.status === 'pending_buyer') return isArabic ? "بانتظار توقيع العميل لتفعيل العقد." : "Waiting for client's signature to activate.";
        if (contract.status === 'pending_seller') return isArabic ? "قم بتوقيع العقد للمتابعة." : "Sign the contract to proceed.";
        return isArabic ? "العقد نشط. قم بإتمام العمل المطلوب." : "Contract is active. Complete the work.";
    };

    // Category Label Logic
    const categoryKey = request?.category || booking?.service_category || "others";
    const categoryLabel = getCategoryLabel(categoryKey, isArabic ? "ar" : "en");

    // Start Date Logic
    const startDate = booking?.booking_date || contract.start_date || request?.preferred_dates?.[0] || null;
    const formattedStartDate = startDate ? format(new Date(startDate), "PPP") : null;

    // Warm dark theme colors
    const BG_COLOR = "bg-[#14120F]";
    const ACCENT_COLOR = "text-[#D97725]";
    const ACCENT_BG = "bg-[#D97725]";
    const CARD_BG = "bg-[#1E1B18]";

    const handleClose = () => {
        navigate('/app/seller/home');
    };

    const handleViewJob = () => {
        const bookingId = contract.booking_id || booking?.id;
        const requestId = contract.request_id || contract.maintenance_request?.id;

        if (bookingId) {
            navigate(`/app/seller/job/${bookingId}?type=booking`);
        } else if (requestId) {
            navigate(`/app/seller/job/${requestId}?type=request`);
        } else {
            navigate('/app/seller/jobs'); // Fallback to list
        }
    };

    const handleMessageClient = () => {
        // Navigate to messages with this booking/quote context
        const bookingId = contract.booking_id || booking?.id;
        const quoteId = contract.quote_id || contract.quote?.id || (Array.isArray(contract.quote) ? contract.quote[0]?.id : null);
        const requestId = contract.request_id || contract.maintenance_request?.id;

        if (bookingId) {
            navigate(`/app/shared/messages?booking=${bookingId}`);
        } else if (quoteId) {
            navigate(`/app/shared/messages?quote=${quoteId}`);
        } else if (requestId) {
            navigate(`/app/shared/messages?request=${requestId}`);
        } else {
            navigate('/app/shared/messages');
        }
    };

    const handleSupport = () => {
        navigate('/app/help');
    };

    return (
        <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className={`fixed inset-0 z-50 ${BG_COLOR} text-white flex flex-col font-sans overflow-y-auto`}
            dir={isArabic ? "rtl" : "ltr"}
        >

            {/* Header - X Button only */}
            <motion.div variants={itemVariants} className="p-4 flex items-center justify-between">
                <Button variant="ghost" size="icon" className="text-white/50 hover:bg-white/10 rounded-full" onClick={handleClose}>
                    <X className="w-6 h-6" />
                </Button>
                <div className="w-10" />
            </motion.div>

            {/* Celebration Confetti for Pending Buyer Approval */}
            {isPendingBuyerApproval && (
                <div className="fixed inset-0 pointer-events-none overflow-hidden z-40">
                    {[...Array(20)].map((_, i) => (
                        <motion.div
                            key={i}
                            initial={{
                                y: -20,
                                x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 400),
                                opacity: 1,
                                scale: Math.random() * 0.5 + 0.5
                            }}
                            animate={{
                                y: (typeof window !== 'undefined' ? window.innerHeight : 800) + 50,
                                rotate: Math.random() * 360 * (Math.random() > 0.5 ? 1 : -1),
                                opacity: 0
                            }}
                            transition={{
                                duration: Math.random() * 3 + 2,
                                delay: Math.random() * 2,
                                ease: "easeIn"
                            }}
                            className="absolute w-3 h-3 rounded-sm"
                            style={{
                                backgroundColor: ['#D97725', '#FFD700', '#22C55E', '#3B82F6', '#EC4899'][Math.floor(Math.random() * 5)]
                            }}
                        />
                    ))}
                </div>
            )}

            <div className="flex-1 px-6 pb-8 flex flex-col items-center max-w-md mx-auto w-full">

                {/* Big Check Icon with Minimal Glow */}
                <motion.div variants={checkVariants} className="mt-4 mb-6 relative">
                    {/* Minimal Glow */}
                    <div className="absolute inset-0 bg-[#D97725]/10 blur-xl rounded-full" />

                    <div className={`w-28 h-28 ${ACCENT_BG} rounded-full flex items-center justify-center relative shadow-lg shadow-[#D97725]/20`}>
                        <AnimatePresence mode="wait">
                            {contract.status === 'completed' ? (
                                <motion.div
                                    key="check"
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0, opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <Check className="w-14 h-14 text-white" strokeWidth={4} />
                                </motion.div>
                            ) : isPendingBuyerApproval ? (
                                <motion.div
                                    key="party"
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0, opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <span className="text-5xl">🎉</span>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="briefcase"
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0, opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <Briefcase className="w-12 h-12 text-white" strokeWidth={2} />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>

                {/* Status Title */}
                <motion.div variants={itemVariants} className="text-center mb-10 space-y-2">
                    <h2 className="text-3xl font-extrabold tracking-tight">{getStatusTitle()}</h2>
                    <p className="text-white/60 text-sm max-w-[280px] mx-auto leading-relaxed">
                        {getStatusDesc()}
                    </p>
                </motion.div>

                {/* Earnings Box */}
                <motion.div
                    variants={itemVariants}
                    className={`w-full ${CARD_BG} rounded-[2rem] p-8 text-center border border-white/5 mb-10 shadow-2xl shadow-black/20`}
                >
                    <p className={`text-xs ${ACCENT_COLOR} uppercase tracking-[0.2em] font-bold mb-3 opacity-90`}>
                        {isArabic ? "أرباحك من هذا المشروع" : "YOUR EARNINGS"}
                    </p>
                    <div className="text-5xl font-black text-white tracking-tight">
                        <span className={`text-3xl align-top opacity-60 mr-1 font-bold ${ACCENT_COLOR}`}>SAR</span>
                        {price.toFixed(2)}
                    </div>
                </motion.div>

                {/* Stepper */}
                <motion.div variants={itemVariants} className="w-full mb-12">
                    <div className="relative flex justify-between items-center px-4">
                        {/* Progress Lines Container */}
                        <div className="absolute top-1/2 left-8 right-8 h-[3px] -z-10 -translate-y-1/2 pointer-events-none">
                            {/* Background Line */}
                            <div className="absolute inset-0 bg-white/10 rounded-full" />

                            {/* Active Progress Line */}
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
                                transition={{ delay: 0.5, duration: 1, ease: "easeOut" }}
                                className={`absolute inset-y-0 ${ACCENT_BG} rounded-full`}
                                style={isArabic ? { right: 0 } : { left: 0 }}
                            />
                        </div>

                        {steps.map((step, index) => {
                            const isCompleted = step.completed;
                            const isActive = step.active;

                            return (
                                <div key={index} className="flex flex-col items-center gap-4 relative z-10 w-8">
                                    <div className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 box-content border-4",
                                        isCompleted ? `bg-[#D97725] border-[#D97725] text-white scale-110` :
                                            isActive ? `bg-[#14120F] border-[#D97725] text-[#D97725] scale-100` :
                                                `bg-[#1E1B18] border-[#1E1B18] text-white/20 scale-90`
                                    )}>
                                        {isCompleted ? <Check size={14} strokeWidth={3} /> : <span className="text-xs font-bold">{index + 1}</span>}
                                    </div>
                                    <span className={cn(
                                        "text-[10px] font-bold absolute top-14 whitespace-nowrap transition-all duration-300",
                                        (isCompleted || isActive) ? "text-[#D97725] opacity-100" : "text-white/20 opacity-100"
                                    )}>
                                        {step.label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </motion.div>

                {/* Job Summary */}
                <motion.div variants={itemVariants} className="w-full text-left rtl:text-right mb-4">
                    <h3 className="text-sm font-bold text-white/50 mb-3 ml-1 rtl:mr-1">{isArabic ? "تفاصيل المشروع" : "JOB DETAILS"}</h3>
                    <div className={`${CARD_BG} rounded-3xl p-5 border border-white/5 space-y-4`}>
                        {/* Main Info */}
                        <div className="flex gap-4 items-center">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className={`text-[10px] ${ACCENT_COLOR} bg-[#D97725]/10 px-2.5 py-1 rounded-full font-bold uppercase tracking-wide`}>
                                        {categoryLabel}
                                    </span>
                                    {formattedStartDate && (
                                        <span className="text-[10px] text-white/30 truncate">{formattedStartDate}</span>
                                    )}
                                </div>
                                <h4 className="font-bold text-white text-lg mb-1 truncate leading-normal pb-0.5">{jobTitle}</h4>
                                <div className="flex items-center gap-1.5 text-sm text-white/60">
                                    <span>{isArabic ? "العميل:" : "Client:"}</span>
                                    <span className="text-white font-medium">{buyer?.full_name || buyer?.company_name || 'Client'}</span>
                                </div>
                            </div>
                            {jobImage ? (
                                <img src={jobImage} alt="Job" className="w-16 h-16 rounded-2xl object-cover bg-neutral-800 shadow-inner" />
                            ) : (
                                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-3xl border border-white/5 shadow-inner">
                                    {getCategoryIcon(categoryKey)}
                                </div>
                            )}
                        </div>

                        {/* Quote Description */}
                        {quote?.description && (
                            <div className="pt-4 border-t border-white/5">
                                <h5 className="text-xs font-bold text-white/40 mb-2 uppercase tracking-wider">{isArabic ? "تفاصيل العرض" : "YOUR QUOTE"}</h5>
                                <p className="text-sm text-white/80 leading-relaxed line-clamp-2">
                                    {quote.description}
                                </p>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Info / Message Box */}
                {contract.status !== 'completed' && (
                    <motion.div variants={itemVariants} className="w-full bg-[#D97725]/10 rounded-2xl p-4 flex gap-3 text-[#D97725] border border-[#D97725]/20 mb-8 backdrop-blur-sm">
                        <Info className="shrink-0 mt-0.5" size={18} />
                        <p className="text-xs leading-relaxed font-semibold opacity-90">
                            {contract.status === 'pending_buyer'
                                ? (isArabic ? "تم توقيع العقد. بانتظار موافقة العميل." : "You've signed. Waiting for client's signature.")
                                : contract.status === 'pending_seller'
                                    ? (isArabic ? "قم بتوقيع العقد لتفعيل المشروع." : "Sign the contract to activate the job.")
                                    : isPendingBuyerApproval
                                        ? (isArabic ? "فإنتظار تأكيد المشتري" : "Waiting for buyer confirmation")
                                        : (isArabic ? "استعد للبدء في العمل في الموعد المتفق عليه." : "Get ready to start work on the agreed date.")}
                        </p>
                    </motion.div>
                )}

                {/* Buyer Review Display (if completed and buyer left review) */}
                {contract.status === 'completed' && buyerReview && (
                    <motion.div variants={itemVariants} className={`w-full ${CARD_BG} p-6 rounded-[2rem] border border-green-500/20 mb-8 bg-green-950/20`}>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                                <Star className="text-yellow-500 w-5 h-5 fill-current" />
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-sm">{isArabic ? "تقييم العميل" : "Client Review"}</h3>
                                <div className="flex gap-0.5">
                                    {[1, 2, 3, 4, 5].map(s => (
                                        <Star key={s} size={12} className={buyerReview.rating >= s ? "text-yellow-500 fill-current" : "text-white/10"} />
                                    ))}
                                </div>
                            </div>
                        </div>
                        {buyerReview.review_text && (
                            <p className="text-white/60 text-sm leading-relaxed">{buyerReview.review_text}</p>
                        )}
                    </motion.div>
                )}

                {/* Action Buttons */}
                <motion.div variants={itemVariants} className="mt-auto w-full pb-safe space-y-3">
                    {/* Primary Action */}
                    <Button
                        size="lg"
                        onClick={handleViewJob}
                        className={`w-full h-14 rounded-full ${ACCENT_BG} hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] text-white font-bold text-base shadow-[0_8px_30px_rgba(217,119,37,0.3)] transition-all duration-300`}
                    >
                        <Briefcase className="w-5 h-5 mr-2 rtl:ml-2 rtl:mr-0" />
                        {isArabic ? "عرض تفاصيل العمل" : "View Work Details"}
                    </Button>

                    {/* Secondary Actions */}
                    <div className="flex gap-3">
                        <Button
                            variant="ghost"
                            onClick={handleClose}
                            className="flex-1 h-12 rounded-full bg-white/5 text-white hover:bg-white/10 hover:text-white border-0"
                        >
                            {isArabic ? <ChevronRight className="w-4 h-4 ml-1" /> : <ChevronLeft className="w-4 h-4 mr-1" />}
                            {isArabic ? "الصفحة الرئيسية" : "Back to Home"}
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={handleMessageClient}
                            className="flex-1 h-12 rounded-full bg-white/5 text-white hover:bg-white/10 hover:text-white border-0"
                        >
                            <MessageCircle className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
                            {isArabic ? "مراسلة العميل" : "Message Client"}
                        </Button>
                    </div>

                    <div className="text-center mt-4">
                        <button
                            onClick={handleSupport}
                            className="text-[10px] uppercase font-bold tracking-widest text-white/30 hover:text-white/60 transition-colors"
                        >
                            {isArabic ? "تواصل مع الدعم" : "Contact Support"}
                        </button>
                    </div>
                </motion.div>

            </div>
        </motion.div>
    );
};
