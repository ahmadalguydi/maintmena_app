import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Clock, Calendar, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useHaptics } from '@/hooks/useHaptics';
import { format, addDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import { getSuggestedScheduleDefaults, getSuggestedTimeForDate } from '@/lib/flowDefaults';

interface TimeSelectorProps {
    currentLanguage: 'en' | 'ar';
    urgency: 'asap' | 'scheduled';
    scheduledDate: Date | null;
    scheduledTime: string | null; // "HH:MM" format (24h)
    onUrgencyChange: (urgency: 'asap' | 'scheduled') => void;
    onScheduleChange: (date: Date, time: string) => void;
}

// ── iOS-style Scroll Column ──
interface ScrollColumnProps {
    items: { value: string | number; label: string }[];
    selectedValue: string | number;
    onSelect: (value: string | number) => void;
    itemHeight?: number;
}

const ScrollColumn = ({ items, selectedValue, onSelect, itemHeight = 44 }: ScrollColumnProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const isScrolling = useRef(false);
    const scrollTimeout = useRef<ReturnType<typeof setTimeout>>();

    const selectedIndex = items.findIndex((item) => item.value === selectedValue);

    // Scroll to the selected item on mount and when selection changes
    useEffect(() => {
        if (containerRef.current && !isScrolling.current) {
            const scrollTop = selectedIndex * itemHeight;
            containerRef.current.scrollTo({ top: scrollTop, behavior: 'smooth' });
        }
    }, [selectedIndex, itemHeight]);

    const handleScroll = useCallback(() => {
        if (!containerRef.current) return;

        isScrolling.current = true;

        // Debounce: snap to nearest item after scroll stops
        if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
        scrollTimeout.current = setTimeout(() => {
            if (!containerRef.current) return;
            const scrollTop = containerRef.current.scrollTop;
            const index = Math.round(scrollTop / itemHeight);
            const clampedIndex = Math.max(0, Math.min(index, items.length - 1));

            // Snap
            containerRef.current.scrollTo({ top: clampedIndex * itemHeight, behavior: 'smooth' });

            // Update selection
            if (items[clampedIndex] && items[clampedIndex].value !== selectedValue) {
                onSelect(items[clampedIndex].value);
            }
            isScrolling.current = false;
        }, 80);
    }, [items, itemHeight, onSelect, selectedValue]);

    return (
        <div className="relative" style={{ height: itemHeight * 3 }}>
            {/* Selection highlight bar */}
            <div
                className="absolute left-0 right-0 pointer-events-none z-10 border-y border-primary/30 bg-primary/5 rounded-lg"
                style={{ top: itemHeight, height: itemHeight }}
            />
            {/* Fade masks */}
            <div className="absolute top-0 left-0 right-0 h-11 bg-gradient-to-b from-background to-transparent pointer-events-none z-20" />
            <div className="absolute bottom-0 left-0 right-0 h-11 bg-gradient-to-t from-background to-transparent pointer-events-none z-20" />

            {/* Scrollable items */}
            <div
                ref={containerRef}
                className="h-full overflow-y-auto scrollbar-hide snap-y snap-mandatory"
                onScroll={handleScroll}
                style={{ scrollSnapType: 'y mandatory' }}
            >
                {/* Top padding (1 empty slot) */}
                <div style={{ height: itemHeight }} />

                {items.map((item) => (
                    <div
                        key={item.value}
                        className={cn(
                            'flex items-center justify-center transition-all duration-150 snap-center cursor-pointer',
                            item.value === selectedValue
                                ? 'text-foreground font-bold text-xl'
                                : 'text-muted-foreground/60 text-base'
                        )}
                        style={{ height: itemHeight }}
                        onClick={() => {
                            onSelect(item.value);
                            if (containerRef.current) {
                                const idx = items.findIndex((i) => i.value === item.value);
                                containerRef.current.scrollTo({ top: idx * itemHeight, behavior: 'smooth' });
                            }
                        }}
                    >
                        {item.label}
                    </div>
                ))}

                {/* Bottom padding (1 empty slot) */}
                <div style={{ height: itemHeight }} />
            </div>
        </div>
    );
};

// ── Time Picker Bottom Sheet ──
interface TimePickerSheetProps {
    isOpen: boolean;
    currentLanguage: 'en' | 'ar';
    initialTime: string; // "HH:MM" 24h
    onConfirm: (time: string) => void;
    onClose: () => void;
}

const TimePickerSheet = ({ isOpen, currentLanguage, initialTime, onConfirm, onClose }: TimePickerSheetProps) => {
    const isRTL = currentLanguage === 'ar';

    // Parse initial time
    const [h24, m] = initialTime.split(':').map(Number);
    const isPM = h24 >= 12;
    const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;

    const [hour, setHour] = useState(h12);
    const [minute, setMinute] = useState(m);
    const [period, setPeriod] = useState<'AM' | 'PM'>(isPM ? 'PM' : 'AM');

    // Rebuild when initialTime changes
    useEffect(() => {
        const [newH24, newM] = initialTime.split(':').map(Number);
        const newIsPM = newH24 >= 12;
        setHour(newH24 === 0 ? 12 : newH24 > 12 ? newH24 - 12 : newH24);
        setMinute(newM);
        setPeriod(newIsPM ? 'PM' : 'AM');
    }, [initialTime]);

    const hours = Array.from({ length: 12 }, (_, i) => ({
        value: i + 1,
        label: String(i + 1),
    }));

    const minutes = Array.from({ length: 60 }, (_, i) => ({
        value: i,
        label: String(i).padStart(2, '0'),
    }));

    const periods = [
        { value: 'AM', label: currentLanguage === 'ar' ? 'ص' : 'AM' },
        { value: 'PM', label: currentLanguage === 'ar' ? 'م' : 'PM' },
    ];

    const handleConfirm = () => {
        let h24Val = hour;
        if (period === 'PM' && hour !== 12) h24Val = hour + 12;
        if (period === 'AM' && hour === 12) h24Val = 0;
        const timeStr = `${String(h24Val).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        onConfirm(timeStr);
    };

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center"
            onClick={onClose}
        >
            <motion.div
                initial={{ y: 300 }}
                animate={{ y: 0 }}
                exit={{ y: 300 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="bg-background rounded-t-3xl w-full max-w-lg overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-2">
                    <button
                        onClick={onClose}
                        className={cn(
                            'text-muted-foreground text-sm font-medium',
                            isRTL && 'font-ar-body'
                        )}
                    >
                        {currentLanguage === 'ar' ? 'إلغاء' : 'Cancel'}
                    </button>
                    <h3 className={cn(
                        'text-base font-semibold',
                        isRTL ? 'font-ar-heading' : 'font-heading'
                    )}>
                        {currentLanguage === 'ar' ? 'اختر الوقت' : 'Select Time'}
                    </h3>
                    <button
                        onClick={handleConfirm}
                        className={cn(
                            'text-primary text-sm font-semibold',
                            isRTL && 'font-ar-body'
                        )}
                    >
                        {currentLanguage === 'ar' ? 'تأكيد' : 'Done'}
                    </button>
                </div>

                {/* Scroll Wheels */}
                <div className={cn("flex items-center justify-center gap-0 py-4 px-6", isRTL && "flex-row-reverse")}>
                    {/* Hour */}
                    <div className="flex-1">
                        <ScrollColumn
                            items={hours}
                            selectedValue={hour}
                            onSelect={(v) => setHour(v as number)}
                        />
                    </div>

                    {/* Colon separator */}
                    <div className="text-2xl font-bold text-foreground px-1 flex items-center" style={{ height: 44 * 3 }}>
                        :
                    </div>

                    {/* Minute */}
                    <div className="flex-1">
                        <ScrollColumn
                            items={minutes}
                            selectedValue={minute}
                            onSelect={(v) => setMinute(v as number)}
                        />
                    </div>

                    {/* AM/PM */}
                    <div className="w-16 ms-2">
                        <ScrollColumn
                            items={periods}
                            selectedValue={period}
                            onSelect={(v) => setPeriod(v as 'AM' | 'PM')}
                        />
                    </div>
                </div>

                {/* Bottom safe area spacer */}
                <div className="h-8 pb-safe" />
            </motion.div>
        </motion.div>
    );
};


const content = {
    ar: {
        asap: 'الآن',
        schedule: 'جدولة',
        today: 'اليوم',
        tomorrow: 'غداً',
        chooseDate: 'اختر تاريخ',
        selectTime: 'اختر الوقت',
    },
    en: {
        asap: 'ASAP',
        schedule: 'Schedule',
        today: 'Today',
        tomorrow: 'Tomorrow',
        chooseDate: 'Choose date',
        selectTime: 'Select time',
    },
};

export const TimeSelector = ({
    currentLanguage,
    urgency,
    scheduledDate,
    scheduledTime,
    onUrgencyChange,
    onScheduleChange,
}: TimeSelectorProps) => {
    const { vibrate } = useHaptics();
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const t = content[currentLanguage];
    const isRTL = currentLanguage === 'ar';

    const handleUrgencyToggle = async (value: 'asap' | 'scheduled') => {
        await vibrate('light');
        onUrgencyChange(value);
        if (value === 'scheduled' && !scheduledDate) {
            const suggested = getSuggestedScheduleDefaults();
            onScheduleChange(suggested.date, suggested.time24);
        }
    };

    const handleQuickDate = async (daysFromNow: number) => {
        await vibrate('light');
        const date = daysFromNow === 0 ? new Date() : addDays(new Date(), daysFromNow);
        const suggestedTime = scheduledTime || getSuggestedTimeForDate(date).time24;
        onScheduleChange(date, suggestedTime);
        setShowDatePicker(false);
    };

    const formatSelectedDate = () => {
        if (!scheduledDate) return t.today;
        const today = new Date();
        const tomorrow = addDays(today, 1);

        if (scheduledDate.toDateString() === today.toDateString()) return t.today;
        if (scheduledDate.toDateString() === tomorrow.toDateString()) return t.tomorrow;
        return format(scheduledDate, 'MMM d', {
            locale: currentLanguage === 'ar' ? ar : undefined,
        });
    };

    const formatTimeDisplay = () => {
        if (!scheduledTime) return t.selectTime;
        const [h, m] = scheduledTime.split(':').map(Number);
        const suffix = h >= 12 ? (isRTL ? 'م' : 'PM') : (isRTL ? 'ص' : 'AM');
        const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
        return `${displayH}:${String(m).padStart(2, '0')} ${suffix}`;
    };

    return (
        <div className="py-4 space-y-4">
            {/* Urgency Toggle Pills */}
            <div className="flex gap-2">
                {(['asap', 'scheduled'] as const).map((option) => (
                    <motion.button
                        key={option}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleUrgencyToggle(option)}
                        className={cn(
                            'flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-full',
                            'font-medium transition-all duration-200',
                            urgency === option
                                ? 'bg-primary text-primary-foreground shadow-md'
                                : 'bg-muted/50 text-muted-foreground hover:bg-muted',
                            currentLanguage === 'ar' ? 'font-ar-body' : 'font-body'
                        )}
                    >
                        {option === 'asap' ? <Clock size={18} /> : <Calendar size={18} />}
                        <span>{option === 'asap' ? t.asap : t.schedule}</span>
                    </motion.button>
                ))}
            </div>

            {/* Schedule Options */}
            <AnimatePresence>
                {urgency === 'scheduled' && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-3"
                    >
                        {/* Date Selection — Today / Tomorrow / Choose */}
                        <div className="flex gap-2">
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleQuickDate(0)}
                                className={cn(
                                    'flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-all duration-200',
                                    scheduledDate?.toDateString() === new Date().toDateString()
                                        ? 'bg-primary/10 text-primary border border-primary/30'
                                        : 'bg-muted/30 text-foreground hover:bg-muted/50',
                                    isRTL ? 'font-ar-body' : 'font-body'
                                )}
                            >
                                {t.today}
                            </motion.button>
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleQuickDate(1)}
                                className={cn(
                                    'flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-all duration-200',
                                    scheduledDate?.toDateString() === addDays(new Date(), 1).toDateString()
                                        ? 'bg-primary/10 text-primary border border-primary/30'
                                        : 'bg-muted/30 text-foreground hover:bg-muted/50',
                                    isRTL ? 'font-ar-body' : 'font-body'
                                )}
                            >
                                {t.tomorrow}
                            </motion.button>
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setShowDatePicker(true)}
                                className={cn(
                                    'flex-1 py-2.5 px-3 rounded-xl text-sm font-medium',
                                    'bg-muted/30 text-foreground hover:bg-muted/50',
                                    'flex items-center justify-center gap-1',
                                    isRTL ? 'font-ar-body' : 'font-body'
                                )}
                            >
                                <span className="truncate">{formatSelectedDate()}</span>
                                <ChevronDown size={14} />
                            </motion.button>
                        </div>

                        {/* Time Selection — Tap to open scroll picker */}
                        <motion.button
                            whileTap={{ scale: 0.97 }}
                            onClick={() => setShowTimePicker(true)}
                            className={cn(
                                'w-full py-3 px-4 rounded-xl text-sm font-medium',
                                'bg-muted/30 text-foreground hover:bg-muted/50',
                                'flex items-center justify-between border border-border/40',
                                isRTL ? 'font-ar-body' : 'font-body'
                            )}
                        >
                            <span className="text-muted-foreground flex items-center gap-2">
                                <Clock size={16} />
                                {currentLanguage === 'ar' ? 'الوقت' : 'Time'}
                            </span>
                            <span className="font-semibold text-base">{formatTimeDisplay()}</span>
                        </motion.button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Date Picker Modal */}
            <AnimatePresence>
                {showDatePicker && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center"
                        onClick={() => setShowDatePicker(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-background rounded-2xl p-4 m-4 max-w-sm w-full"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 className={cn(
                                'text-lg font-semibold mb-4 text-center',
                                isRTL ? 'font-ar-heading' : 'font-heading'
                            )}>
                                {t.chooseDate}
                            </h3>
                            <div className="grid grid-cols-3 gap-2">
                                {Array.from({ length: 9 }, (_, i) => i + 2).map((days) => {
                                    const date = addDays(new Date(), days);
                                    return (
                                        <motion.button
                                            key={days}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => {
                                                const suggestedTime = scheduledTime || getSuggestedTimeForDate(date).time24;
                                                onScheduleChange(date, suggestedTime);
                                                setShowDatePicker(false);
                                            }}
                                            className={cn(
                                                'py-3 px-2 rounded-xl text-sm',
                                                'bg-muted/30 hover:bg-muted/50 transition-colors',
                                                isRTL ? 'font-ar-body' : 'font-body'
                                            )}
                                        >
                                            <div className="text-xs text-muted-foreground">
                                                {format(date, 'EEE', {
                                                    locale: currentLanguage === 'ar' ? ar : undefined,
                                                })}
                                            </div>
                                            <div className="font-medium">{format(date, 'd')}</div>
                                        </motion.button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Time Picker Bottom Sheet */}
            <AnimatePresence>
                {showTimePicker && (
                    <TimePickerSheet
                        isOpen={showTimePicker}
                        currentLanguage={currentLanguage}
                        initialTime={
                            scheduledTime ||
                            getSuggestedTimeForDate(scheduledDate || new Date()).time24
                        }
                        onConfirm={(time) => {
                            onScheduleChange(scheduledDate || new Date(), time);
                            setShowTimePicker(false);
                        }}
                        onClose={() => setShowTimePicker(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};
