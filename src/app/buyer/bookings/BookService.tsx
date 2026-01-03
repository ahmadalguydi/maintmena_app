
import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/hooks/useCurrency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Star, BadgeCheck, Camera, X, Sun, Sunset, Moon, MapPin, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { getAllCategories, getCategoryLabel } from "@/lib/serviceCategories";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { AddressPicker } from "@/components/mobile/AddressPicker";
import { RequestSubmittedSheet } from "@/components/mobile/RequestSubmittedSheet";
import { sendNotification } from "@/lib/notifications";
import { AuthTriggerModal } from "@/components/mobile/AuthTriggerModal";

interface BookServiceProps {
    currentLanguage: "en" | "ar";
}

export const BookService = ({ currentLanguage }: BookServiceProps) => {
    const { vendorId } = useParams<{ vendorId: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const { formatAmount } = useCurrency();
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form state
    const [serviceType, setServiceType] = useState<string>("");
    const [description, setDescription] = useState("");
    const [photos, setPhotos] = useState<File[]>([]);
    const [photoPreview, setPhotoPreview] = useState<string[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [preferredTime, setPreferredTime] = useState<"morning" | "afternoon" | "night">("afternoon");
    const [minPrice, setMinPrice] = useState("");
    const [maxPrice, setMaxPrice] = useState("");
    const [selectedCity, setSelectedCity] = useState("");
    const [selectedAddress, setSelectedAddress] = useState("");
    const [flexibleDate, setFlexibleDate] = useState(false);
    const [flexibleTime, setFlexibleTime] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submittedBooking, setSubmittedBooking] = useState<{ id: string } | null>(null);
    const [showAuthModal, setShowAuthModal] = useState(false);

    // Persistence Logic
    useEffect(() => {
        if (!vendorId) return;
        const key = `pendingBooking_${vendorId}`;
        const saved = localStorage.getItem(key);
        if (saved) {
            try {
                const data = JSON.parse(saved);
                if (data.serviceType) setServiceType(data.serviceType);
                if (data.description) setDescription(data.description);
                if (data.selectedDate) setSelectedDate(new Date(data.selectedDate));
                if (data.preferredTime) setPreferredTime(data.preferredTime);
                if (data.minPrice) setMinPrice(data.minPrice);
                if (data.maxPrice) setMaxPrice(data.maxPrice);
                if (data.selectedCity) setSelectedCity(data.selectedCity);
                if (data.selectedAddress) setSelectedAddress(data.selectedAddress);
                if (data.flexibleDate !== undefined) setFlexibleDate(data.flexibleDate);
                if (data.flexibleTime !== undefined) setFlexibleTime(data.flexibleTime);
            } catch (e) {
                console.error("Failed to restore booking data", e);
            }
        }
    }, [vendorId]);

    useEffect(() => {
        if (!vendorId) return;
        const key = `pendingBooking_${vendorId}`;
        const data = {
            serviceType,
            description,
            selectedDate: selectedDate?.toISOString(),
            preferredTime,
            minPrice,
            maxPrice,
            selectedCity,
            selectedAddress,
            flexibleDate,
            flexibleTime
        };
        localStorage.setItem(key, JSON.stringify(data));
    }, [vendorId, serviceType, description, selectedDate, preferredTime, minPrice, maxPrice, selectedCity, selectedAddress, flexibleDate, flexibleTime]);

    const INSPECTION_FEE = 50;

    const t = {
        bookService: currentLanguage === 'ar' ? 'حجز خدمة' : 'Book Service',
        verifiedPro: currentLanguage === 'ar' ? 'محترف موثق' : 'Verified Pro',
        serviceDetails: currentLanguage === 'ar' ? 'تفاصيل الخدمة' : 'Service Details',
        selectServiceType: currentLanguage === 'ar' ? 'اختر نوع الخدمة' : 'Select Service Type',
        chooseService: currentLanguage === 'ar' ? 'اختر الخدمة' : 'Choose a service',
        descriptionOfIssue: currentLanguage === 'ar' ? 'وصف المشكلة' : 'Description of Issue',
        descriptionPlaceholder: currentLanguage === 'ar' ? 'صف المشكلة (مثال: التكييف لا يبرد...)' : 'Please describe the problem (e.g., AC is not cooling...)',
        addPhotosVideo: currentLanguage === 'ar' ? 'إضافة صور/فيديو' : 'Add Photos/Video',
        preferredSchedule: currentLanguage === 'ar' ? 'الموعد المفضل' : 'Preferred Schedule',
        selectDate: currentLanguage === 'ar' ? 'اختر التاريخ' : 'Select Date',
        preferredTime: currentLanguage === 'ar' ? 'الوقت المفضل' : 'Preferred Time',
        morning: currentLanguage === 'ar' ? 'صباحاً' : 'Morning',
        afternoon: currentLanguage === 'ar' ? 'ظهراً' : 'Afternoon',
        night: currentLanguage === 'ar' ? 'مساءً' : 'Night',
        expectedPrice: currentLanguage === 'ar' ? 'السعر المتوقع' : 'Expected Price',
        expectedPriceHint: currentLanguage === 'ar' ? 'ما هي ميزانيتك المتوقعة لهذه الخدمة؟' : 'What is your expected budget for this service?',
        minPrice: currentLanguage === 'ar' ? 'الحد الأدنى' : 'Min Price',
        maxPrice: currentLanguage === 'ar' ? 'الحد الأقصى' : 'Max Price',
        serviceLocation: currentLanguage === 'ar' ? 'الموقع' : 'Location',
        flexibleDate: currentLanguage === 'ar' ? 'تاريخ مرن' : 'Flexible Date',
        flexibleTime: currentLanguage === 'ar' ? 'وقت مرن' : 'Flexible Time',
        inspectionFee: currentLanguage === 'ar' ? 'رسوم المعاينة' : 'Inspection Fee',
        confirmRequest: currentLanguage === 'ar' ? 'تأكيد الطلب' : 'Confirm Request',
    };

    // Fetch vendor data
    const { data: vendor, isLoading: vendorLoading } = useQuery({
        queryKey: ["vendor-profile", vendorId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", vendorId)
                .single();
            if (error) throw error;
            return data;
        },
        enabled: !!vendorId,
    });

    // Fetch user's saved address
    const { data: userProfile } = useQuery({
        queryKey: ["user-profile", user?.id],
        queryFn: async () => {
            if (!user?.id) return null;
            const { data, error } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", user.id)
                .single();
            if (error) throw error;
            return data;
        },
        enabled: !!user?.id,
    });

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            setPhotos((prev) => [...prev, ...newFiles]);

            newFiles.forEach((file) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setPhotoPreview((prev) => [...prev, reader.result as string]);
                };
                reader.readAsDataURL(file);
            });
        }
    };

    const removePhoto = (index: number) => {
        setPhotos(prev => prev.filter((_, i) => i !== index));
        setPhotoPreview(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!user) {
            setShowAuthModal(true);
            return;
        }

        if (!serviceType) {
            toast.error(currentLanguage === 'ar' ? 'يرجى اختيار نوع الخدمة' : 'Please select a service type');
            return;
        }

        if (!description) {
            toast.error(currentLanguage === 'ar' ? 'يرجى وصف المشكلة' : 'Please describe the issue');
            return;
        }

        if (!selectedCity || !selectedAddress) {
            toast.error(currentLanguage === 'ar' ? 'يرجى تحديد الموقع' : 'Please select a location');
            return;
        }

        if (!selectedDate) {
            toast.error(currentLanguage === 'ar' ? 'يرجى اختيار التاريخ' : 'Please select a date');
            return;
        }

        setIsSubmitting(true);
        try {
            // Upload photos if any
            const uploadedUrls: string[] = [];
            for (const photo of photos) {
                const fileName = `${user.id}/${Date.now()}_${photo.name}`;
                const { error: uploadError } = await supabase.storage
                    .from("request-photos")
                    .upload(fileName, photo);

                if (!uploadError) {
                    const { data: urlData } = supabase.storage
                        .from("request-photos")
                        .getPublicUrl(fileName);
                    uploadedUrls.push(urlData.publicUrl);
                }
            }

            // Create booking request
            const { data: booking, error } = await supabase
                .from("booking_requests")
                .insert({
                    buyer_id: user.id,
                    seller_id: vendorId,
                    service_category: serviceType,
                    job_description: description + (flexibleDate ? (currentLanguage === 'ar' ? '\n[تاريخ مرن]' : '\n[Flexible Date]') : '') + (flexibleTime ? (currentLanguage === 'ar' ? '\n[وقت مرن]' : '\n[Flexible Time]') : ''),
                    proposed_start_date: flexibleDate ? null : selectedDate.toISOString(),
                    proposed_end_date: flexibleDate ? null : selectedDate.toISOString(),
                    preferred_time_slot: flexibleTime ? null : preferredTime,
                    budget_range: minPrice && maxPrice ? `${minPrice} - ${maxPrice}` : (minPrice ? `≥ ${minPrice}` : (maxPrice ? `≤ ${maxPrice}` : null)),
                    location_city: selectedCity,
                    location_address: selectedAddress,
                    status: "pending",
                })
                .select()
                .single();

            if (error) throw error;

            // Update booking with photos if any were uploaded (photos column may not exist yet)
            if (uploadedUrls.length > 0 && booking) {
                try {
                    await supabase
                        .from("booking_requests")
                        .update({ photos: uploadedUrls } as any)
                        .eq("id", booking.id);
                } catch (photoError) {
                    console.warn("Could not save photos - column may not exist yet:", photoError);
                }
            }

            // Notify seller (wrapped in try-catch as RLS may prevent this)
            // Notify seller
            await sendNotification({
                user_id: vendorId,
                title: currentLanguage === 'ar' ? 'طلب حجز جديد' : 'New Booking Request',
                message: currentLanguage === 'ar' ? 'لديك طلب حجز جديد' : 'You have a new booking request',
                notification_type: 'booking_received',
                content_id: booking.id,
            });

            toast.success(currentLanguage === 'ar' ? 'تم إرسال الطلب بنجاح' : 'Request sent successfully');
            if (vendorId) localStorage.removeItem(`pendingBooking_${vendorId}`);
            queryClient.invalidateQueries({ queryKey: ["buyer-bookings"] });
            setSubmittedBooking(booking);
        } catch (error: any) {
            console.error("Booking error:", error);
            toast.error(error.message || (currentLanguage === 'ar' ? 'حدث خطأ' : 'An error occurred'));
        } finally {
            setIsSubmitting(false);
        }
    };

    // Filter categories to only show what the vendor offers
    const allCategories = getAllCategories();
    const vendorServiceCategories = (vendor as any)?.service_categories || [];
    const categories = vendorServiceCategories.length > 0
        ? allCategories.filter(cat => vendorServiceCategories.includes(cat.key))
        : allCategories;

    if (vendorLoading) {
        return (
            <div className="min-h-screen bg-background pb-32" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
                <div className="bg-white sticky top-0 z-10 border-b border-gray-100">
                    <div className="px-4 h-14 flex items-center gap-3">
                        <Skeleton className="w-9 h-9 rounded-full" />
                        <Skeleton className="h-6 w-32" />
                    </div>
                </div>
                <div className="p-4 space-y-6">
                    <Skeleton className="h-24 rounded-2xl" />
                    <Skeleton className="h-40 rounded-2xl" />
                    <Skeleton className="h-60 rounded-2xl" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-32" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
            {/* Header */}
            <div className="bg-white sticky top-0 z-10 border-b border-gray-100">
                <div className="px-4 h-14 flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
                        <ArrowLeft className="w-5 h-5 text-ink" />
                    </Button>
                    <div className="flex-1 text-center font-semibold text-lg text-ink">
                        {t.bookService}
                    </div>
                    <div className="w-9" />
                </div>
            </div>

            <div className="p-4 space-y-6">
                {/* Vendor Card */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm"
                >
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <img
                                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${vendor?.id}`}
                                alt={vendor?.full_name}
                                className="w-14 h-14 rounded-full object-cover border-2 border-primary/20"
                            />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-foreground">{vendor?.company_name || vendor?.full_name}</h3>
                            <p className="text-sm text-muted-foreground">{vendor?.bio_en || (currentLanguage === 'ar' ? 'مقدم خدمة' : 'Service Provider')}</p>
                            <div className="flex items-center gap-2 mt-1">
                                <BadgeCheck className="w-4 h-4 text-green-500" />
                                <span className="text-xs text-green-600">{t.verifiedPro}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg">
                            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                            <span className="text-sm font-semibold text-amber-700">{(vendor as any)?.seller_rating?.toFixed(1) || '4.8'}</span>
                        </div>
                    </div>
                </motion.div>

                {/* Service Details */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="space-y-4"
                >
                    <h2 className="text-lg font-bold text-foreground">{t.serviceDetails}</h2>

                    {/* Service Type Dropdown */}
                    <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground">{t.selectServiceType}</Label>
                        <Select value={serviceType} onValueChange={setServiceType}>
                            <SelectTrigger className={cn("w-full h-12 rounded-xl bg-white border-gray-200", currentLanguage === 'ar' && "font-['Noto_Sans_Arabic']")}>
                                <SelectValue placeholder={t.chooseService} />
                            </SelectTrigger>
                            <SelectContent className={cn(currentLanguage === 'ar' && "font-['Noto_Sans_Arabic']")}>
                                {categories.map((cat) => (
                                    <SelectItem key={cat.key} value={cat.key} className={cn(currentLanguage === 'ar' && "font-['Noto_Sans_Arabic']")}>
                                        <span className="flex items-center gap-2">
                                            <span>{cat.icon}</span>
                                            <span>{currentLanguage === 'ar' ? cat.ar : cat.en}</span>
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground">{t.descriptionOfIssue}</Label>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={t.descriptionPlaceholder}
                            className="min-h-[100px] rounded-xl bg-white border-gray-200 resize-none"
                        />
                    </div>

                    {/* Photo Upload */}
                    <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground">{t.addPhotosVideo}</Label>
                        <div className="flex gap-3 flex-wrap">
                            {/* Upload Button First */}
                            {photos.length < 5 && (
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-24 h-24 rounded-2xl border-2 border-dashed border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
                                >
                                    <Camera className="w-8 h-8 text-gray-400" />
                                </button>
                            )}
                            {/* Photo Previews */}
                            {photoPreview.map((preview, idx) => (
                                <div key={idx} className="relative w-24 h-24 rounded-2xl overflow-hidden border border-gray-200">
                                    <img src={preview} alt="" className="w-full h-full object-cover" />
                                    <button
                                        onClick={() => removePhoto(idx)}
                                        className="absolute top-1 right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow-md hover:bg-red-600 transition-colors"
                                    >
                                        <X className="w-4 h-4 text-white" />
                                    </button>
                                </div>
                            ))}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*,video/*"
                                multiple
                                onChange={handlePhotoUpload}
                                className="hidden"
                            />
                        </div>
                    </div>
                </motion.div>

                {/* Price Range */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="space-y-4"
                >
                    <div>
                        <h2 className="text-lg font-bold text-foreground">{t.expectedPrice}</h2>
                        <p className="text-sm text-muted-foreground">{t.expectedPriceHint}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-sm text-muted-foreground">{t.minPrice}</Label>
                            <div className="relative">
                                <Input
                                    type="number"
                                    value={minPrice}
                                    onChange={(e) => setMinPrice(e.target.value)}
                                    onKeyDown={(e) => ['e', 'E', '-', '+', '.'].includes(e.key) && e.preventDefault()}
                                    placeholder=""
                                    className="h-12 rounded-xl bg-white border-gray-200 pr-14"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">SAR</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm text-muted-foreground">{t.maxPrice}</Label>
                            <div className="relative">
                                <Input
                                    type="number"
                                    value={maxPrice}
                                    onChange={(e) => setMaxPrice(e.target.value)}
                                    onKeyDown={(e) => ['e', 'E', '-', '+', '.'].includes(e.key) && e.preventDefault()}
                                    placeholder=""
                                    className="h-12 rounded-xl bg-white border-gray-200 pr-14"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">SAR</span>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Preferred Schedule */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="space-y-4"
                >
                    <h2 className="text-lg font-bold text-foreground">{t.preferredSchedule}</h2>

                    {/* Calendar */}
                    <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground">{t.selectDate}</Label>
                        <div className={cn(
                            "bg-white rounded-2xl border border-gray-200 p-3 transition-opacity",
                            flexibleDate && "opacity-50 pointer-events-none"
                        )}>
                            <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={setSelectedDate}
                                locale={currentLanguage === 'ar' ? ar : enUS}
                                disabled={(date) => {
                                    const today = new Date();
                                    today.setHours(0, 0, 0, 0);
                                    return date < today;
                                }}
                                className="mx-auto"
                            />
                        </div>
                        {/* Flexible Date Checkbox */}
                        <div className="flex items-center gap-2 mt-3">
                            <Checkbox
                                id="flexibleDate"
                                checked={flexibleDate}
                                onCheckedChange={(checked) => setFlexibleDate(checked as boolean)}
                            />
                            <label
                                htmlFor="flexibleDate"
                                className={cn(
                                    "text-sm text-muted-foreground cursor-pointer",
                                    currentLanguage === 'ar' && "font-['Noto_Sans_Arabic']"
                                )}
                            >
                                {t.flexibleDate}
                            </label>
                        </div>
                    </div>

                    {/* Time Preference */}
                    <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground">{t.preferredTime}</Label>
                        <div className={cn(
                            "grid grid-cols-3 gap-3 transition-opacity",
                            flexibleTime && "opacity-50 pointer-events-none"
                        )}>
                            {[
                                { key: 'morning', icon: Sun, label: t.morning },
                                { key: 'afternoon', icon: Sunset, label: t.afternoon },
                                { key: 'night', icon: Moon, label: t.night },
                            ].map(({ key, icon: Icon, label }) => (
                                <button
                                    key={key}
                                    onClick={() => setPreferredTime(key as any)}
                                    className={cn(
                                        "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
                                        preferredTime === key
                                            ? "border-primary bg-primary/5 text-primary"
                                            : "border-gray-200 bg-white text-muted-foreground hover:border-gray-300"
                                    )}
                                >
                                    <Icon className={cn("w-6 h-6", preferredTime === key ? "text-primary" : "text-gray-400")} />
                                    <span className="text-sm font-medium">{label}</span>
                                </button>
                            ))}
                        </div>
                        {/* Flexible Time Checkbox */}
                        <div className="flex items-center gap-2 mt-3">
                            <Checkbox
                                id="flexibleTime"
                                checked={flexibleTime}
                                onCheckedChange={(checked) => setFlexibleTime(checked as boolean)}
                            />
                            <label
                                htmlFor="flexibleTime"
                                className={cn(
                                    "text-sm text-muted-foreground cursor-pointer",
                                    currentLanguage === 'ar' && "font-['Noto_Sans_Arabic']"
                                )}
                            >
                                {t.flexibleTime}
                            </label>
                        </div>
                    </div>
                </motion.div>

                {/* Service Location */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-4"
                >
                    <h2 className="text-lg font-bold text-foreground">{t.serviceLocation}</h2>

                    <AddressPicker
                        currentLanguage={currentLanguage}
                        selectedCity={selectedCity}
                        selectedAddress={selectedAddress}
                        onAddressSelect={({ city, full_address }) => {
                            setSelectedCity(city);
                            setSelectedAddress(full_address);
                        }}
                    />
                </motion.div>
            </div>

            {/* Bottom Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                <div className="max-w-md mx-auto">
                    {/* Expected Price Display */}
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-muted-foreground">{t.expectedPrice}</span>
                        <span className="text-lg font-bold text-primary">
                            {!minPrice && !maxPrice ? (
                                'SAR -'
                            ) : minPrice && maxPrice ? (
                                `SAR ${minPrice} - ${maxPrice}`
                            ) : minPrice && !maxPrice ? (
                                currentLanguage === 'ar' ? `SAR ${minPrice} ≤` : `≥ SAR ${minPrice}`
                            ) : (
                                currentLanguage === 'ar' ? `SAR ${maxPrice} ≥` : `≤ SAR ${maxPrice}`
                            )}
                        </span>
                    </div>
                    <Button
                        size="lg"
                        className="w-full rounded-full bg-amber-700 hover:bg-amber-800 text-white font-semibold h-12"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                        ) : (
                            <>
                                {t.confirmRequest}
                                <ChevronRight className="w-5 h-5 ml-2" />
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* Request Submitted Confirmation Sheet */}
            {submittedBooking && (
                <RequestSubmittedSheet
                    currentLanguage={currentLanguage}
                    requestId={submittedBooking.id}
                    serviceCategory={serviceType}
                    date={flexibleDate ? null : selectedDate?.toISOString()}
                    timeSlot={flexibleTime ? null : preferredTime}
                    location={`${selectedAddress}, ${selectedCity}`}
                    onClose={() => navigate('/app/buyer/home')}
                />
            )}

            {/* Auth Modal for Guests */}
            <AuthTriggerModal
                open={showAuthModal}
                onOpenChange={setShowAuthModal}
                currentLanguage={currentLanguage}
                pendingAction={{ type: 'navigation', returnPath: location.pathname }}
            />
        </div>
    );
};
