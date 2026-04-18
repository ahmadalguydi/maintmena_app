/**
 * Respectful Resurfacing Framework (Part 4.3)
 *
 * The anti-pattern: "We haven't seen you in a while! Come back 🥺"
 * The replacement: intelligence-backed, utility-first resurfacing that respects
 * both the user's time and their stored data.
 *
 * Every re-engagement message must answer:
 *   1. WHY NOW? (a signal from user data or seasonality)
 *   2. WHAT CHANGED? (something in the world, the platform, or their history)
 *   3. WHAT ACTION? (single, scoped, optional)
 *
 * Bad:  "We miss you, come back!"
 * Good: "It's been 11 months since your last AC service. Most filters are due
 *        for a clean around this time — want us to check availability?"
 *
 * The framework computes a `ResurfacingCard` from a trigger + user signals.
 * The Notification Orchestrator ensures these only fire inside the
 * RELATIONAL tier delivery windows (morning / late afternoon) and never
 * during prayer times.
 */

export type ResurfacingTrigger =
    // Seller
    | 'seller_inactive_7d'
    | 'seller_inactive_14d'
    | 'seller_earnings_below_weekly_target'
    | 'seller_peak_demand_in_area'
    | 'seller_new_nearby_requests'
    // Buyer
    | 'buyer_inactive_30d'
    | 'buyer_service_anniversary' // "11 months since last AC service"
    | 'buyer_seasonal_maintenance' // Ramadan cleanup, summer AC, winter heating
    | 'buyer_preferred_seller_online'
    | 'buyer_price_dropped_in_category';

export interface ResurfacingSignal {
    trigger: ResurfacingTrigger;
    /** Seconds since signal was true (used to choose copy tone). */
    ageSec?: number;
    /** Arbitrary metadata for copy interpolation (lastService, category, etc). */
    meta?: Record<string, string | number>;
}

export interface ResurfacingCard {
    trigger: ResurfacingTrigger;
    /** Which user segment this message targets. */
    audience: 'buyer' | 'seller';
    /** Bilingual title — scoped, calm, specific. */
    title: { en: string; ar: string };
    /** Bilingual body — explains the WHY NOW and WHAT CHANGED. */
    body: { en: string; ar: string };
    /** A single, scoped CTA. If null, card is purely informational. */
    cta: { label: { en: string; ar: string }; deepLink: string } | null;
    /** Emoji accent — small, context-appropriate. No confetti. */
    accent: string;
    /** Soft dot color. */
    tone: 'warm' | 'cool' | 'neutral';
}

/**
 * Compose a ResurfacingCard from a signal. Pure function, easy to test.
 * All copy here is intentionally **respectful**, never shaming, never
 * using dark patterns ("you'll miss out", "last chance", countdowns).
 */
export function buildResurfacingCard(signal: ResurfacingSignal): ResurfacingCard | null {
    switch (signal.trigger) {
        // ── Seller ────────────────────────────────────────────────
        case 'seller_inactive_7d':
            return {
                trigger: signal.trigger,
                audience: 'seller',
                accent: '📭',
                tone: 'neutral',
                title: { en: 'Quiet week?', ar: 'أسبوع هادي؟' },
                body: {
                    en: 'We kept your profile warm while you were away. One tap, and you\'re back in the feed.',
                    ar: 'أبقينا ملفك نشطاً أثناء غيابك. بضغطة واحدة ترجع للنشط.',
                },
                cta: {
                    label: { en: 'Go online', ar: 'اتصل الآن' },
                    deepLink: '/app/seller/home?action=go_online',
                },
            };

        case 'seller_earnings_below_weekly_target': {
            const shortfall = signal.meta?.shortfall ? `${signal.meta.shortfall} SAR` : '';
            return {
                trigger: signal.trigger,
                audience: 'seller',
                accent: '🎯',
                tone: 'warm',
                title: {
                    en: 'You\'re close to your weekly goal',
                    ar: 'قرّبت من هدفك الأسبوعي',
                },
                body: {
                    en: shortfall
                        ? `About ${shortfall} short of your weekly target. 2–3 jobs usually close the gap.`
                        : 'A couple more jobs usually close the gap. Demand is steady today.',
                    ar: shortfall
                        ? `متبقي تقريباً ${shortfall} للهدف الأسبوعي. عادة ٢-٣ طلبات تقفل الفرق.`
                        : 'طلبين أو ثلاثة عادة يقفلون الفرق. الطلب اليوم ثابت.',
                },
                cta: {
                    label: { en: 'See nearby jobs', ar: 'شوف الطلبات القريبة' },
                    deepLink: '/app/seller/home',
                },
            };
        }

        case 'seller_peak_demand_in_area':
            return {
                trigger: signal.trigger,
                audience: 'seller',
                accent: '📈',
                tone: 'warm',
                title: { en: 'Demand is peaking in your area', ar: 'الطلب في منطقتك مرتفع الحين' },
                body: {
                    en: 'Requests in your service area are 2× higher than usual right now. Great window to go online.',
                    ar: 'الطلبات في منطقتك ضعف المعتاد الحين. وقت ممتاز تكون متصل فيه.',
                },
                cta: {
                    label: { en: 'Go online', ar: 'اتصل الآن' },
                    deepLink: '/app/seller/home?action=go_online',
                },
            };

        case 'seller_new_nearby_requests': {
            const count = typeof signal.meta?.count === 'number' ? signal.meta.count : undefined;
            return {
                trigger: signal.trigger,
                audience: 'seller',
                accent: '🛎️',
                tone: 'warm',
                title: {
                    en: count ? `${count} new requests within 5 km` : 'New requests nearby',
                    ar: count ? `${count} طلبات جديدة ضمن ٥ كم` : 'طلبات جديدة قريبة منك',
                },
                body: {
                    en: 'Matched to your categories. Have a look — no pressure.',
                    ar: 'مطابقة لتخصصاتك. اطّلع بدون ضغط.',
                },
                cta: {
                    label: { en: 'Open feed', ar: 'افتح القائمة' },
                    deepLink: '/app/seller/home',
                },
            };
        }

        case 'seller_inactive_14d':
            return {
                trigger: signal.trigger,
                audience: 'seller',
                accent: '🟢',
                tone: 'neutral',
                title: { en: 'Ready when you are', ar: 'جاهزين لما تكون جاهز' },
                body: {
                    en: 'No rush. Whenever you\'re back, your rating and reviews are exactly where you left them.',
                    ar: 'ما فيه استعجال. لما ترجع، تقييمك ومراجعاتك كما هي بالضبط.',
                },
                cta: null,
            };

        // ── Buyer ────────────────────────────────────────────────
        case 'buyer_service_anniversary': {
            const category = typeof signal.meta?.category === 'string' ? signal.meta.category : 'service';
            const months = typeof signal.meta?.months === 'number' ? signal.meta.months : 11;
            const catAr: Record<string, string> = {
                ac: 'تكييف',
                plumbing: 'سباكة',
                electrical: 'كهرباء',
                cleaning: 'تنظيف',
            };
            const catEn: Record<string, string> = {
                ac: 'AC',
                plumbing: 'plumbing',
                electrical: 'electrical',
                cleaning: 'cleaning',
            };
            return {
                trigger: signal.trigger,
                audience: 'buyer',
                accent: '🗓️',
                tone: 'cool',
                title: {
                    en: `${months} months since your last ${catEn[category] ?? category} service`,
                    ar: `${months} شهر من آخر خدمة ${catAr[category] ?? category}`,
                },
                body: {
                    en: 'Not a reminder — just data. Most maintenance in this category is due around now. Your call.',
                    ar: 'ليس تذكيراً مزعجاً — مجرد معلومة. عادة الصيانة في هذي الفئة تكون مستحقة الحين. القرار لك.',
                },
                cta: {
                    label: { en: 'Check availability', ar: 'اشوف التوفر' },
                    deepLink: `/app/buyer/home?category=${category}`,
                },
            };
        }

        case 'buyer_seasonal_maintenance': {
            const season = typeof signal.meta?.season === 'string' ? signal.meta.season : 'summer';
            return {
                trigger: signal.trigger,
                audience: 'buyer',
                accent: season === 'ramadan' ? '🌙' : season === 'summer' ? '☀️' : '🍂',
                tone: 'warm',
                title: {
                    en: season === 'ramadan'
                        ? 'Ramadan is approaching'
                        : season === 'summer'
                          ? 'Summer is coming fast'
                          : 'Season change',
                    ar: season === 'ramadan'
                        ? 'رمضان على الأبواب'
                        : season === 'summer'
                          ? 'الصيف قرّب'
                          : 'تغيّر الموسم',
                },
                body: {
                    en: season === 'summer'
                        ? 'AC tune-ups are up 3× this week. Worth booking before the rush.'
                        : 'Most households schedule pre-season cleanups now. Availability tightens later.',
                    ar: season === 'summer'
                        ? 'طلبات صيانة المكيفات زادت ٣ أضعاف هالأسبوع. الحجز الحين أسهل.'
                        : 'أغلب البيوت تحجز تنظيف قبل الموسم. التوفر يضيق لاحقاً.',
                },
                cta: {
                    label: { en: 'Explore services', ar: 'استكشف الخدمات' },
                    deepLink: '/app/buyer/home',
                },
            };
        }

        case 'buyer_inactive_30d':
            return {
                trigger: signal.trigger,
                audience: 'buyer',
                accent: '👋',
                tone: 'neutral',
                title: { en: 'Nothing urgent — just a check-in', ar: 'مافي شي مستعجل — مجرد اطمئنان' },
                body: {
                    en: 'Your saved addresses, preferred sellers, and history are exactly where you left them.',
                    ar: 'عناوينك المحفوظة، الفنيين المفضلين، وتاريخك كلها كما هي تماماً.',
                },
                cta: null,
            };

        case 'buyer_preferred_seller_online': {
            const seller = typeof signal.meta?.sellerName === 'string' ? signal.meta.sellerName : 'Your preferred pro';
            return {
                trigger: signal.trigger,
                audience: 'buyer',
                accent: '🟢',
                tone: 'warm',
                title: {
                    en: `${seller} is online`,
                    ar: `${seller} متصل الآن`,
                },
                body: {
                    en: 'You rated them highly last time. They\'re available in your area right now.',
                    ar: 'قيّمتهم تقييم عالي آخر مرة. متاحين في منطقتك الحين.',
                },
                cta: {
                    label: { en: 'View profile', ar: 'افتح الملف' },
                    deepLink: typeof signal.meta?.sellerId === 'string' ? `/app/vendor/${signal.meta.sellerId}` : '/app/buyer/explore',
                },
            };
        }

        case 'buyer_price_dropped_in_category': {
            const cat = typeof signal.meta?.category === 'string' ? signal.meta.category : 'service';
            return {
                trigger: signal.trigger,
                audience: 'buyer',
                accent: '💹',
                tone: 'cool',
                title: {
                    en: `${cat} prices eased this week`,
                    ar: `أسعار ${cat} مالت للأخف هالأسبوع`,
                },
                body: {
                    en: 'Average quotes in your area are ~12% lower than last month. Just a heads-up.',
                    ar: 'متوسط الأسعار في منطقتك أقل بحوالي ١٢٪ من الشهر الماضي. معلومة فقط.',
                },
                cta: null,
            };
        }

        default:
            return null;
    }
}

/**
 * Determine whether a given resurfacing card should be suppressed right now.
 * The orchestrator calls this before queueing.
 */
export function shouldSuppressResurfacing(
    card: ResurfacingCard,
    context: { isPrayerTime: boolean; isDnd: boolean; hourOfDay: number },
): boolean {
    // RELATIONAL tier — never during prayer or DnD
    if (context.isPrayerTime || context.isDnd) return true;
    // Quiet hours 22:00 – 07:00 (Saudi norm)
    if (context.hourOfDay >= 22 || context.hourOfDay < 7) return true;
    // Seller CTA-to-go-online should be suppressed on Fridays before Dhuhr
    if (card.trigger.startsWith('seller_') && new Date().getDay() === 5 && context.hourOfDay < 13) {
        return true;
    }
    return false;
}
