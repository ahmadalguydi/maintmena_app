import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const TIME_SLOTS = [
    { key: '09:00', en: '9:00 AM (Morning)', ar: '٩:٠٠ ص (صباحاً)' },
    { key: '13:00', en: '1:00 PM (Afternoon)', ar: '١:٠٠ م (ظهراً)' },
    { key: '17:00', en: '5:00 PM (Evening)', ar: '٥:٠٠ م (مساءً)' },
] as const;

interface EditRequestProps {
    currentLanguage: 'en' | 'ar';
}

export const EditRequest = ({ currentLanguage }: EditRequestProps) => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const isRTL = currentLanguage === 'ar';

    const [description, setDescription] = useState('');
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

    // Query only columns that definitely exist in the schema
    const { data: request, isLoading } = useQuery({
        queryKey: ['edit-request', id],
        queryFn: async () => {
            if (!id || !user?.id) return null;
            const { data, error } = await (supabase as any)
                .from('maintenance_requests')
                .select('id, title, description, description_ar, category, status, preferred_start_date, assigned_seller_id, buyer_id, latitude, longitude, city, urgency, location')
                .eq('id', id)
                .eq('buyer_id', user.id)
                .maybeSingle();
            if (error) throw error;
            return data;
        },
        enabled: !!id && !!user?.id,
    });

    // Pre-fill form
    useEffect(() => {
        if (!request) return;
        const desc = isRTL && request.description_ar ? request.description_ar : request.description;
        // Strip appended metadata from description
        const clean = (desc || '')
            .split(/(?:Preferred Date:|Time Window:)/i)[0]
            .replace(/\s?\[Flexible Date\]/g, '')
            .replace(/\s?\[Flexible Time\]/g, '')
            .replace(/\s?\[تاريخ مرن\]/g, '')
            .replace(/\s?\[وقت مرن\]/g, '')
            .trim();
        setDescription(clean);

        const dateStr = request.preferred_start_date;
        if (dateStr) {
            const d = new Date(dateStr);
            if (!isNaN(d.getTime())) {
                setSelectedDate(d.toISOString().split('T')[0]);
                const hours = d.getHours();
                if (hours <= 11) setSelectedSlot('09:00');
                else if (hours <= 15) setSelectedSlot('13:00');
                else setSelectedSlot('17:00');
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [request]);

    const content = {
        en: {
            title: 'Edit Request',
            descLabel: 'Description',
            descPlaceholder: 'Describe the issue...',
            dateLabel: 'Preferred Date',
            slotLabel: 'Preferred Time',
            save: 'Save Changes',
            cancel: 'Cancel',
            success: 'Request updated',
            error: 'Failed to update request',
            notEditable: 'This request can no longer be edited because a provider has been assigned.',
        },
        ar: {
            title: 'تعديل الطلب',
            descLabel: 'الوصف',
            descPlaceholder: 'صف المشكلة...',
            dateLabel: 'التاريخ المفضل',
            slotLabel: 'الوقت المفضل',
            save: 'حفظ التعديلات',
            cancel: 'إلغاء',
            success: 'تم تحديث الطلب',
            error: 'فشل تحديث الطلب',
            notEditable: 'لا يمكن تعديل هذا الطلب لأنه تم تعيين فني.',
        },
    };
    const t = content[currentLanguage];
    const today = new Date().toISOString().split('T')[0];

    // Only NOT editable if a provider is already assigned
    const hasProvider = request?.assigned_seller_id;

    const saveMutation = useMutation({
        mutationFn: async () => {
            if (!id || !user?.id || !request) throw new Error('Missing context');

            // Build the update patch using only columns that exist
            const patch: Record<string, unknown> = {
                updated_at: new Date().toISOString(),
            };

            if (description.trim()) {
                patch.description = description.trim();
                if (isRTL) patch.description_ar = description.trim();
            }

            if (selectedDate) {
                const timeStr = selectedSlot ?? '09:00';
                const newDateTime = new Date(`${selectedDate}T${timeStr}:00`).toISOString();
                patch.preferred_start_date = newDateTime;
            }

            const { error } = await (supabase as any)
                .from('maintenance_requests')
                .update(patch)
                .eq('id', id)
                .eq('buyer_id', user.id);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success(t.success);
            queryClient.invalidateQueries({ queryKey: ['request-tracking', id] });
            queryClient.invalidateQueries({ queryKey: ['edit-request', id] });
            queryClient.invalidateQueries({ queryKey: ['buyer-dispatch-requests'] });
            queryClient.invalidateQueries({ queryKey: ['buyer-activity'] });
            navigate(-1);
        },
        onError: () => {
            toast.error(t.error);
        },
    });

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (hasProvider) {
        return (
            <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
                <header className="px-5 py-4 flex items-center gap-3 border-b border-border/40 bg-card">
                    <button onClick={() => navigate(-1)} className="p-2 -mx-2 rounded-full hover:bg-muted">
                        <ArrowLeft className={cn('h-5 w-5', isRTL && 'rotate-180')} />
                    </button>
                    <h1 className={cn('text-lg font-bold', isRTL ? 'font-ar-heading' : 'font-heading')}>{t.title}</h1>
                </header>
                <div className="p-8 text-center">
                    <p className={cn('text-muted-foreground', isRTL ? 'font-ar-body' : '')}>{t.notEditable}</p>
                    <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
                        {t.cancel}
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-app bg-background flex flex-col pt-safe" dir={isRTL ? 'rtl' : 'ltr'}>
            <header className="px-5 py-4 flex items-center gap-3 border-b border-border/40 bg-card">
                <button onClick={() => navigate(-1)} className="p-2 -mx-2 rounded-full hover:bg-muted">
                    <ArrowLeft className={cn('h-5 w-5', isRTL && 'rotate-180')} />
                </button>
                <h1 className={cn('text-lg font-bold', isRTL ? 'font-ar-heading' : 'font-heading')}>{t.title}</h1>
            </header>

            <main className="flex-1 overflow-y-auto">
                <div className="p-5 space-y-6">
                    {/* Description */}
                    <div className="space-y-2">
                        <p className={cn('text-sm font-semibold text-foreground', isRTL ? 'font-ar-body' : '')}>
                            {t.descLabel}
                        </p>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={t.descPlaceholder}
                            rows={4}
                            className={cn(
                                'w-full rounded-2xl border border-border/60 bg-card px-4 py-3 text-sm text-foreground resize-none',
                                'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40',
                                isRTL ? 'text-right font-ar-body' : '',
                            )}
                        />
                    </div>

                    {/* Date */}
                    <div className="space-y-2">
                        <p className={cn('text-sm font-semibold text-foreground', isRTL ? 'font-ar-body' : '')}>
                            {t.dateLabel}
                        </p>
                        <input
                            type="date"
                            min={today}
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className={cn(
                                'w-full rounded-2xl border border-border/60 bg-card px-4 py-3 text-sm text-foreground',
                                'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40',
                                isRTL ? 'text-right' : '',
                            )}
                        />
                    </div>

                    {/* Time slot */}
                    <div className="space-y-2">
                        <p className={cn('text-sm font-semibold text-foreground', isRTL ? 'font-ar-body' : '')}>
                            {t.slotLabel}
                        </p>
                        <div className="space-y-2">
                            {TIME_SLOTS.map((slot) => {
                                const isSelected = selectedSlot === slot.key;
                                return (
                                    <button
                                        key={slot.key}
                                        onClick={() => setSelectedSlot(slot.key)}
                                        className={cn(
                                            'w-full flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-start transition-colors',
                                            isSelected
                                                ? 'border-primary/40 bg-primary/5 text-primary'
                                                : 'border-border/60 bg-card text-foreground hover:bg-muted/40',
                                        )}
                                    >
                                        <div className={cn(
                                            'h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center',
                                            isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/40',
                                        )}>
                                            {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
                                        </div>
                                        <span className={cn('text-sm font-medium', isRTL ? 'font-ar-body' : '')}>
                                            {isRTL ? slot.ar : slot.en}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </main>

            <div className="px-5 pb-safe-or-6 pt-4 space-y-3 border-t border-border/30 bg-background">
                <Button
                    size="lg"
                    className="w-full h-12 rounded-2xl font-bold"
                    disabled={saveMutation.isPending}
                    onClick={() => saveMutation.mutate()}
                >
                    {saveMutation.isPending ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                        <>
                            <Save className={cn('h-4 w-4', isRTL ? 'ml-2' : 'mr-2')} />
                            {t.save}
                        </>
                    )}
                </Button>
                <Button
                    variant="ghost"
                    size="lg"
                    className="w-full h-12 rounded-2xl font-semibold text-muted-foreground"
                    disabled={saveMutation.isPending}
                    onClick={() => navigate(-1)}
                >
                    {t.cancel}
                </Button>
            </div>
        </div>
    );
};
