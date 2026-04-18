export const CATEGORY_ARABIC: Record<string, string> = {
    'plumbing': 'السباكة',
    'electrical': 'الكهرباء',
    'ac': 'التكييف',
    'ac maintenance': 'التكييف',
    'painting': 'الدهانات',
    'cleaning': 'النظافة',
    'carpentry': 'النجارة',
    'appliance': 'الأجهزة',
    'general': 'عام',
    'service': 'خدمة'
};

export const TIMING_ARABIC: Record<string, string> = {
    'urgent': 'طارئ جداً',
    'asap': 'في أقرب وقت',
    'scheduled': 'مجدول',
    'flexible': 'وقت مرن',
    'earliest': 'في أقرب وقت',
};

export function localizeCategory(category: string | undefined | null, lang: 'en' | 'ar'): string {
    if (!category) return lang === 'ar' ? 'عام' : 'General';
    if (lang === 'en') return category;
    const key = category.toLowerCase().trim();
    if (CATEGORY_ARABIC[key]) return CATEGORY_ARABIC[key];
    // Fallback: If it's a combination (e.g. "AC Repair")
    if (key.includes('ac')) return 'التكييف';
    if (key.includes('plumb')) return 'السباكة';
    if (key.includes('elect')) return 'الكهرباء';
    return category; // Return as is if unknown
}

export function localizeTiming(timing: string | undefined | null, lang: 'en' | 'ar'): string {
    if (!timing) return '';
    if (lang === 'en') return timing;
    const key = timing.toLowerCase().trim();
    if (TIMING_ARABIC[key]) return TIMING_ARABIC[key];
    return timing;
}

export function getCelebrationCopy(category: string | undefined, isSeller: boolean) {
    const cat = (category || '').toLowerCase();
    const random = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

    if (isSeller) {
        if (cat.includes('ac')) {
            return {
                title: random(['بردّت عليهم! ❄️', 'شغل يوسّع الصدر! 🌬️', 'نعنشناهم! ❄️']),
                subtitle: 'في انتظار اعتماد العميل. إن شاء الله تبريدك المزبوط يعكس على تقييمهم!'
            };
        }
        if (cat.includes('plumb')) {
            return {
                title: random(['عاش المعلم! 🔧', 'انتهت المعاناة! 💧', 'شغل أصلي! 🛠️']),
                subtitle: 'في انتظار اعتماد العميل. تسلم يديك، جهّز نفسك للتقييم الزين!'
            };
        }
        if (cat.includes('elect')) {
            return {
                title: random(['نوّرت الدنيا! 💡', 'شغل كهرب المزبوط! ⚡', 'رجعت الشعلة! ✨']),
                subtitle: 'في انتظار اعتماد العميل، شغلك الزين بيشعلل تقييمك!'
            };
        }
        if (cat.includes('paint')) {
            return {
                title: random(['أناقة وفن! 🎨', 'دهّنتها صح! 🖌️', 'لُوحة يا بطل! 🎨']),
                subtitle: 'في انتظار اعتماد العميل. شغلك النظيف بيعطيك أحلى تقييم!'
            };
        }
        if (cat.includes('clean')) {
            return {
                title: random(['شغل يلقّ! ✨', 'نظافة تفتح النفس! 🧹', 'لقّت لق! 🫧']),
                subtitle: 'في انتظار اعتماد العميل. النظافة المزبوطة تستاهل أحلى خمس نجوم!'
            };
        }
        
        // Generic Seller
        return {
            title: random(['بيض الله وجهك! ✨', 'كفو يا الذيب! 🐺', 'إنجاز يرفع الرأس! 🏆', 'كفو والله! 🎊']),
            subtitle: 'في انتظار اعتماد العميل. إن شاء الله الشغل بيّض الوجه والفالك التقييم العالي!'
        };
    } else {
        // Buyer
        if (cat.includes('ac')) {
            return {
                title: random(['رجع البراد! 🥶', 'هواء يرد الروح! ❄️']),
                subtitle: 'تمت الصيانة من قبل بطلنا. عساه برّد خاطرك؟ لا تنسى تقيّمه!'
            };
        }
        if (cat.includes('plumb')) {
            return {
                title: random(['انحلّت المشكلة! 💯', 'ما عاد فيه تسريب! 💧']),
                subtitle: 'تطمن، بطلنا خلّص الشغل. لا تنسى تشاركه تقييمك!'
            };
        }
        if (cat.includes('elect')) {
            return {
                title: random(['شغل تمام التمام! ⚡', 'رجع النور! 💡']),
                subtitle: 'بطلنا أنجز المهمة بنجاح! إذا شغلك ضبط لا تنسى التقييم سنع.'
            };
        }

        // Generic Buyer
        return {
            title: random(['طابت أمورك! 🌟', 'الحمدلله، خلصنا! ✅', 'يا سلام، كله تمام! ✨', 'تطمن، انتهى طلبك! 🎯']),
            subtitle: 'بطلنا خلّص الشغل المطلوب. عساه جمّل؟ لا تحرمه من تقييمك!'
        };
    }
}
