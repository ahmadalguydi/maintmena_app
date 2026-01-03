import { useState, useEffect } from "react";
import { Check, Star, ChevronLeft, ChevronRight, Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { getCategoryLabel, getCategoryIcon } from "@/lib/serviceCategories";
import { format } from "date-fns";
import { useConfetti } from "@/hooks/useConfetti";

interface ContractProgressTrackerProps {
    contract: any;
    currentLanguage: "en" | "ar";
}

export const ContractProgressTracker = ({ contract, currentLanguage }: ContractProgressTrackerProps) => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState("");
    const isArabic = currentLanguage === "ar";
    const isBuyer = user?.id === contract.buyer_id;
    const { fire } = useConfetti();

    useEffect(() => {
        if (contract.status === 'completed') {
            fire();
        }
    }, [contract.status, fire]);

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

    // Steps Configuration matching the visual style
    const steps = [
        { label: isArabic ? "تم القبول" : "Accepted", completed: true },
        {
            label: isArabic ? "تم التوقيع" : "Signed",
            completed: !!contract.seller_signed_at || ["executed", "active", "completed"].includes(contract.status),
            active: ["pending_seller", "pending_buyer", "pending_signatures", "pending_signature"].includes(contract.status)
        },
        {
            label: isArabic ? "العمل" : "Work",
            completed: ["active", "completed"].includes(contract.status),
            active: contract.status === 'executed' || contract.status === 'active'
        },
        {
            label: isArabic ? "مكتمل" : "Done",
            completed: contract.status === "completed",
            active: false
        }
    ];

    const currentStepIndex = steps.reduce((acc, step, index) => (step.completed || step.active) ? index : acc, 0);

    const { data: existingReview } = useQuery<any>({
        queryKey: ["contract-review", contract.id],
        queryFn: async () => {
            // Priority: Check by contract_id first (safest)
            if (contract.id) {
                // @ts-expect-error - Supabase type inference too deep
                const { data } = await supabase
                    .from("seller_reviews")
                    .select("*")
                    .eq("contract_id", contract.id)
                    .maybeSingle();
                if (data) return data;
            }

            // Fallback: Check by request_id
            const requestId = contract.request_id || contract.maintenance_request?.id;
            if (!requestId) return null;
            const { data } = await supabase
                .from("seller_reviews")
                .select("*")
                .eq("request_id", requestId)
                .eq("buyer_id", user?.id)
                .maybeSingle();
            return data;
        },
        enabled: !!user && contract.status === "completed",
    });

    const submitReview = useMutation({
        mutationFn: async () => {
            if (!user) throw new Error("Not authenticated");

            if (existingReview) {
                const { error } = await supabase.from("seller_reviews").update({
                    rating,
                    review_text: comment,
                }).eq('id', existingReview.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from("seller_reviews").insert({
                    request_id: contract.request_id || contract.maintenance_request?.id,
                    contract_id: contract.id,
                    buyer_id: user.id,
                    seller_id: contract.seller_id,
                    rating,
                    review_text: comment,
                });
                if (error) throw error;
            }
        },
        onSuccess: () => {
            const successMsg = isArabic
                ? (existingReview ? "تم تعديل التقييم بنجاح" : "تم إرسال التقييم بنجاح")
                : (existingReview ? "Review updated successfully" : "Review submitted successfully");

            toast.success(successMsg);
            queryClient.invalidateQueries({ queryKey: ["contract-review"] });
            // Don't navigate away if editing? Or maybe still navigate? 
            // Usually if editing from tracker, user might want to stay or go home. 
            // User request implied they just want it to work. Keeping behavior same + success msg.
            navigate('/app/buyer/home');
        },
        onError: (err) => {
            console.error(err);
            toast.error(isArabic ? "فشل إرسال التقييم" : "Failed to submit review");
        },
    });

    const buyer = contract.buyer;
    const seller = contract.seller;
    const request = contract.maintenance_request;
    const booking = contract.booking;
    const quote = Array.isArray(contract.quote) ? contract.quote[0] : contract.quote;

    const jobTitle = booking
        ? (isArabic ? `حجز مع ${seller?.company_name || seller?.full_name || 'مقدم الخدمة'}` : `A Booking with ${seller?.company_name || seller?.full_name || 'Provider'}`)
        : (isArabic
            ? (request?.title_ar || request?.title || booking?.service_category || "طلب")
            : (request?.title || booking?.service_category || "Request"));

    const price = (contract.metadata as any)?.final_price ||
        (contract.quote as any)?.price ||
        (contract.booking as any)?.final_agreed_price || 0;

    const jobImage = request?.photos?.[0] || null;

    // Determine Status Title and Description
    const getStatusTitle = () => {
        if (contract.status === 'completed') return isArabic ? "صار يومك أخف👌" : "Job Complete!";
        if (contract.status === 'active' || contract.status === 'executed') return isArabic ? "العمل جاري" : "Job Active";
        if (contract.status === 'pending_seller') return isArabic ? "بانتظار الموافقة" : "Pending Provider";
        return isArabic ? "تم قبول العرض!" : "Offer Accepted!";
    };

    const getStatusDesc = () => {
        if (contract.status === 'completed') return isArabic ? "شكراً لتأكيدك! جاهزين لأي خدمة جاية.  تقدر تقيّم مقدم الخدمة الآن ✨" : "Job finished.";
        if (contract.status === 'pending_seller') return isArabic ? "بانتظار توقيع مقدم الخدمة." : "Waiting for seller's signature.";
        return isArabic ? "بانتظار تأكيد و توقيع مقدم الخدمة." : "Waiting for seller's confirmation and signature.";
    };

    // Category Label Logic
    const categoryKey = request?.category || booking?.service_category || "others";
    const categoryLabel = getCategoryLabel(categoryKey, isArabic ? "ar" : "en");

    // Start Date Logic
    const startDate = booking?.booking_date || contract.start_date || request?.preferred_dates?.[0] || null;
    const formattedStartDate = startDate ? format(new Date(startDate), "PPP") : null;

    // Warm dark theme colors
    const BG_COLOR = "bg-[#14120F]"; // Almost black warm brown
    const ACCENT_COLOR = "text-[#D97725]"; // Rich copper
    const ACCENT_BG = "bg-[#D97725]";
    const CARD_BG = "bg-[#1E1B18]"; // Slightly lighter warm brown

    const handleClose = () => {
        if (contract.quote_id) {
            navigate(`/app/buyer/quote/${contract.quote_id}`);
        } else {
            navigate('/app/buyer/home');
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



            <div className="flex-1 px-6 pb-8 flex flex-col items-center max-w-md mx-auto w-full">

                {/* Big Check Icon with Minimal Glow */}
                <motion.div variants={checkVariants} className="mt-4 mb-6 relative">
                    {/* Minimal Glow */}
                    <div className="absolute inset-0 bg-[#D97725]/10 blur-xl rounded-full" />

                    <div className={`w-28 h-28 ${ACCENT_BG} rounded-full flex items-center justify-center relative shadow-lg shadow-[#D97725]/20`}>
                        <AnimatePresence mode="wait">
                            {contract.status === 'completed' ? (
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
                                    key="check"
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0, opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <Check className="w-14 h-14 text-white" strokeWidth={4} />
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

                {/* Price Box - White Text Price */}
                <motion.div
                    variants={itemVariants}
                    className={`w-full ${CARD_BG} rounded-[2rem] p-8 text-center border border-white/5 mb-10 shadow-2xl shadow-black/20`}
                >
                    <p className={`text-xs ${ACCENT_COLOR} uppercase tracking-[0.2em] font-bold mb-3 opacity-90`}>
                        {isArabic ? "السعر المتفق عليه" : "AGREED PRICE"}
                    </p>
                    <div className="text-5xl font-black text-white tracking-tight">
                        <span className={`text-3xl align-top opacity-60 mr-1 font-bold ${ACCENT_COLOR}`}>SAR</span>
                        {price.toFixed(2)}
                    </div>
                </motion.div>

                {/* Stepper - RTL Safe (No dir=ltr) */}
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
                                        (isCompleted || isActive) ? "text-[#D97725] opacity-100" : "text-white/20 opacity-100" // Always visible
                                    )}>
                                        {step.label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </motion.div>

                {/* Rating Form Area if Complete (Moved ABOVE Job Summary) */}
                {contract.status === 'completed' && !existingReview && (
                    <motion.div variants={itemVariants} className={`w-full ${CARD_BG} p-6 rounded-[2rem] border border-white/5 mb-8 space-y-5`}>
                        <h3 className="text-center font-bold text-xl">{isArabic ? "كيف كانت التجربة؟" : "How was it?"}</h3>
                        <div className="flex justify-center gap-3">
                            {[1, 2, 3, 4, 5].map(s => (
                                <button key={s} onClick={() => setRating(s)} className="text-yellow-500 hover:scale-125 hover:-rotate-6 transition-all duration-300">
                                    <Star size={32} className={rating >= s ? "fill-current drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]" : "text-white/10 fill-white/5"} />
                                </button>
                            ))}
                        </div>
                        <Textarea
                            className="bg-black/20 border-white/10 text-white placeholder:text-white/20 min-h-[100px] rounded-xl focus:border-[#D97725]/50 transition-colors"
                            placeholder={isArabic ? "شاركنا رأيك..." : "Share your thoughts..."}
                            value={comment}
                            onChange={e => setComment(e.target.value)}
                        />
                        <Button onClick={() => submitReview.mutate()} className={`w-full ${ACCENT_BG} hover:opacity-90 text-white rounded-xl h-12 font-bold shadow-lg shadow-[#D97725]/20`}>
                            {isArabic ? "إرسال التقييم" : "Submit Review"}
                        </Button>
                    </motion.div>
                )}

                {existingReview && (
                    <motion.div variants={itemVariants} className={`w-full ${CARD_BG} p-6 rounded-[2rem] border border-green-500/20 mb-8 text-center bg-green-950/20`}>
                        <div className="w-14 h-14 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                            <Check className="text-green-500 w-7 h-7" strokeWidth={3} />
                        </div>
                        <h3 className="font-bold text-white text-lg mb-2">{isArabic ? "شكراً لك!" : "Thank You!"}</h3>
                        <p className="text-white/60 text-sm">
                            {isArabic ? "تم استلام تقييمك بنجاح." : "Your review has been verified."}
                        </p>
                    </motion.div>
                )}

                {/* Job Summary */}
                <motion.div variants={itemVariants} className="w-full text-left rtl:text-right mb-8">
                    <h3 className="text-sm font-bold text-white/50 mb-3 ml-1 rtl:mr-1">{isArabic ? "ملخص العمل" : "JOB SUMMARY"}</h3>
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
                                    <span>{isBuyer ? (isArabic ? "مقدم الخدمة:" : "Provider:") : (isArabic ? "العميل:" : "Client:")}</span>
                                    <span className="text-white font-medium">{isBuyer ? (seller?.company_name || seller?.full_name) : buyer?.full_name}</span>
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

                        {/* Seller Quote Description */}
                        {quote?.description && (
                            <div className="pt-4 border-t border-white/5">
                                <h5 className="text-xs font-bold text-white/40 mb-2 uppercase tracking-wider">{isArabic ? "وصف العرض" : "QUOTE DESCRIPTION"}</h5>
                                <p className="text-sm text-white/80 leading-relaxed line-clamp-2"> {/* Line clamp 2 */}
                                    {quote.description}
                                </p>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Info / Message Box - Fixed Logic */}
                {contract.status !== 'completed' && (
                    <motion.div variants={itemVariants} className="w-full bg-[#D97725]/10 rounded-2xl p-4 flex gap-3 text-[#D97725] border border-[#D97725]/20 mb-8 backdrop-blur-sm">
                        <Info className="shrink-0 mt-0.5" size={18} />
                        <p className="text-xs leading-relaxed font-semibold opacity-90">
                            {["active", "executed"].includes(contract.status)
                                ? (isArabic ? "العمل جاري حالياً." : "Work is currently in progress.")
                                : (
                                    // Check if user needs to sign
                                    ((!contract.signed_at_buyer && !contract.buyer_signed_at) && isBuyer) ||
                                        ((!contract.signed_at_seller && !contract.seller_signed_at) && !isBuyer)
                                        ? (isArabic ? "بانتظار توقيعك." : "Waiting for your signature to proceed.")
                                        : (isBuyer
                                            ? (isArabic ? "بانتظار توقيع مقدم الخدمة." : "Waiting for provider's signature to proceed.")
                                            : (isArabic ? "بانتظار توقيع العميل." : "Waiting for client's signature to proceed.")
                                        )
                                )
                            }
                        </p>
                    </motion.div>
                )}



                {/* Confirm / Action Button */}
                <motion.div variants={itemVariants} className="mt-auto w-full pb-safe">
                    <Button
                        size="lg"
                        onClick={() => navigate('/app/buyer/home')}
                        className={`w-full h-16 rounded-full ${ACCENT_BG} hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] text-white font-bold text-lg shadow-[0_8px_30px_rgba(217,119,37,0.3)] transition-all duration-300`}
                    >
                        {isArabic ? <ChevronRight className="mr-1 ml-0 opacity-60" /> : <ChevronLeft className="mr-1 opacity-60" />}
                        {isArabic ? "العودة للصفحة الرئيسية" : "Return to Home Screen"}
                    </Button>

                    <div className="text-center mt-6 mb-2">
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
