/**
 * Seasonal demand intelligence for Saudi Arabia.
 *
 * Determines the current season based on date and provides
 * contextual service recommendations for buyers and demand
 * predictions for admin.
 */

export type Season = 'summer' | 'winter' | 'ramadan_prep' | 'eid_prep' | 'default';

interface SeasonalTip {
  id: string;
  season: Season;
  category: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  icon: string;
  priority: number;
}

/** Get the current applicable season(s) based on date. */
export function getCurrentSeason(date: Date = new Date()): Season {
  const month = date.getMonth(); // 0-indexed

  // Summer: May through September (Saudi AC season)
  if (month >= 4 && month <= 8) return 'summer';

  // Winter: December through February
  if (month >= 11 || month <= 1) return 'winter';

  // Spring/Fall default
  return 'default';
}

/** Get seasonal tips relevant to the current date. */
export function getSeasonalTips(date: Date = new Date()): SeasonalTip[] {
  const season = getCurrentSeason(date);
  const month = date.getMonth();

  const tips: SeasonalTip[] = [];

  if (season === 'summer') {
    tips.push({
      id: 'summer-ac-check',
      season: 'summer',
      category: 'ac_repair',
      title: 'Summer is here — is your AC ready?',
      titleAr: 'الصيف وصل — مكيفك جاهز؟',
      description: 'Book an AC maintenance check before the peak heat',
      descriptionAr: 'احجز صيانة مكيف قبل ما يشتد الحر',
      icon: '❄️',
      priority: 1,
    });
    tips.push({
      id: 'summer-water',
      season: 'summer',
      category: 'plumbing',
      title: 'Check your water system',
      titleAr: 'افحص نظام المياه',
      description: 'High temps stress pipes — a quick check prevents leaks',
      descriptionAr: 'الحرارة العالية تأثر على المواسير — فحص بسيط يمنع التسريب',
      icon: '🚰',
      priority: 2,
    });
  }

  if (season === 'winter') {
    tips.push({
      id: 'winter-heating',
      season: 'winter',
      category: 'ac_repair',
      title: 'Heating system ready for winter?',
      titleAr: 'نظام التدفئة جاهز للشتاء؟',
      description: 'Get your heating inspected before the cold nights',
      descriptionAr: 'افحص التدفئة قبل ما تبرد الليالي',
      icon: '🔥',
      priority: 1,
    });
    tips.push({
      id: 'winter-insulation',
      season: 'winter',
      category: 'handyman',
      title: 'Seal windows & doors',
      titleAr: 'اعزل الشبابيك والأبواب',
      description: 'Proper sealing saves energy and keeps the cold out',
      descriptionAr: 'العزل الجيد يوفر طاقة ويمنع البرد',
      icon: '🪟',
      priority: 2,
    });
  }

  // Month-specific tips that apply regardless of season
  // March/April: Spring cleaning before Ramadan
  if (month === 2 || month === 3) {
    tips.push({
      id: 'ramadan-prep',
      season: 'ramadan_prep',
      category: 'cleaning',
      title: 'Pre-Ramadan deep clean',
      titleAr: 'تنظيف عميق قبل رمضان',
      description: 'Get your home spotless before the holy month',
      descriptionAr: 'نظف بيتك قبل الشهر الكريم',
      icon: '🧹',
      priority: 1,
    });
  }

  // Before Eid (varies, but typically late Ramadan)
  if (month === 3 || month === 4) {
    tips.push({
      id: 'eid-prep',
      season: 'eid_prep',
      category: 'painting',
      title: 'Fresh paint for Eid?',
      titleAr: 'دهان جديد للعيد؟',
      description: 'A fresh coat makes your home ready for guests',
      descriptionAr: 'دهان جديد يجهز بيتك لاستقبال الضيوف',
      icon: '🎨',
      priority: 2,
    });
  }

  // Default tip if nothing seasonal
  if (tips.length === 0) {
    tips.push({
      id: 'general-maintenance',
      season: 'default',
      category: 'handyman',
      title: 'Routine home check-up',
      titleAr: 'فحص دوري للبيت',
      description: 'Regular maintenance prevents costly repairs',
      descriptionAr: 'الصيانة الدورية تمنع الإصلاحات المكلفة',
      icon: '🔧',
      priority: 3,
    });
  }

  return tips.sort((a, b) => a.priority - b.priority);
}

/** Get admin-facing seasonal demand predictions. */
export function getSeasonalDemandPredictions(date: Date = new Date()): {
  season: Season;
  label: string;
  labelAr: string;
  hotCategories: { key: string; label: string; labelAr: string; demandLevel: 'high' | 'medium' | 'low' }[];
} {
  const season = getCurrentSeason(date);

  const predictions: Record<Season, {
    label: string;
    labelAr: string;
    hotCategories: { key: string; label: string; labelAr: string; demandLevel: 'high' | 'medium' | 'low' }[];
  }> = {
    summer: {
      label: 'Summer Peak',
      labelAr: 'ذروة الصيف',
      hotCategories: [
        { key: 'ac_repair', label: 'AC Repair', labelAr: 'إصلاح التكييف', demandLevel: 'high' },
        { key: 'plumbing', label: 'Plumbing', labelAr: 'سباكة', demandLevel: 'medium' },
        { key: 'electrical', label: 'Electrical', labelAr: 'كهرباء', demandLevel: 'medium' },
      ],
    },
    winter: {
      label: 'Winter Season',
      labelAr: 'موسم الشتاء',
      hotCategories: [
        { key: 'ac_repair', label: 'Heating', labelAr: 'تدفئة', demandLevel: 'high' },
        { key: 'plumbing', label: 'Plumbing', labelAr: 'سباكة', demandLevel: 'high' },
        { key: 'handyman', label: 'Insulation', labelAr: 'عزل', demandLevel: 'medium' },
      ],
    },
    ramadan_prep: {
      label: 'Ramadan Prep',
      labelAr: 'تجهيز رمضان',
      hotCategories: [
        { key: 'cleaning', label: 'Deep Cleaning', labelAr: 'تنظيف عميق', demandLevel: 'high' },
        { key: 'painting', label: 'Painting', labelAr: 'دهان', demandLevel: 'medium' },
        { key: 'ac_repair', label: 'AC Prep', labelAr: 'تجهيز التكييف', demandLevel: 'medium' },
      ],
    },
    eid_prep: {
      label: 'Eid Prep',
      labelAr: 'تجهيز العيد',
      hotCategories: [
        { key: 'painting', label: 'Painting', labelAr: 'دهان', demandLevel: 'high' },
        { key: 'cleaning', label: 'Cleaning', labelAr: 'تنظيف', demandLevel: 'high' },
        { key: 'handyman', label: 'Repairs', labelAr: 'إصلاحات', demandLevel: 'medium' },
      ],
    },
    default: {
      label: 'Normal Season',
      labelAr: 'موسم عادي',
      hotCategories: [
        { key: 'handyman', label: 'General', labelAr: 'عام', demandLevel: 'low' },
        { key: 'plumbing', label: 'Plumbing', labelAr: 'سباكة', demandLevel: 'low' },
        { key: 'electrical', label: 'Electrical', labelAr: 'كهرباء', demandLevel: 'low' },
      ],
    },
  };

  return {
    season,
    ...predictions[season],
  };
}
