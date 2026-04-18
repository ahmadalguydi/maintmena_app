export interface ServiceSubcategory {
  key: string;
  en: string;
  ar: string;
}

export interface ServiceCategory {
  key: string;
  icon: string;
  en: string;
  ar: string;
  type: 'home' | 'project';
  serviceType?: string;
  category?: string;
  subcategories?: ServiceSubcategory[];
}

// Legacy export retained for compatibility with older callers.
export const ALPHA_ENABLED_CATEGORIES: string[] = [];

// All service categories are available in the current app.
export const isAlphaEnabledCategory = (key: string): boolean => {
  void key;
  return true;
};

export const SERVICE_CATEGORIES: Record<'home' | 'project', ServiceCategory[]> = {
  home: [
    {
      key: 'ac_repair', icon: '❄️', en: 'AC Repair', ar: 'إصلاح التكييف', type: 'home', serviceType: 'hvac', category: 'corrective',
      subcategories: [
        { key: 'ac_install', en: 'Installation', ar: 'تركيب' },
        { key: 'ac_maintenance', en: 'Maintenance & Cleaning', ar: 'صيانة وتنظيف' },
        { key: 'ac_repair_fix', en: 'Repair & Fix', ar: 'إصلاح أعطال' },
        { key: 'ac_gas_refill', en: 'Gas Refill', ar: 'تعبئة غاز' },
        { key: 'ac_duct', en: 'Duct Cleaning', ar: 'تنظيف مجاري الهواء' },
      ],
    },
    {
      key: 'plumbing', icon: '🚰', en: 'Plumbing', ar: 'سباكة', type: 'home', serviceType: 'plumbing', category: 'corrective',
      subcategories: [
        { key: 'plumb_leak', en: 'Leak Repair', ar: 'إصلاح تسربات' },
        { key: 'plumb_drain', en: 'Drain Unclogging', ar: 'فتح مجاري' },
        { key: 'plumb_fixture', en: 'Fixture Installation', ar: 'تركيب أدوات صحية' },
        { key: 'plumb_heater', en: 'Water Heater', ar: 'سخانات مياه' },
        { key: 'plumb_pipe', en: 'Pipe Replacement', ar: 'تبديل مواسير' },
      ],
    },
    {
      key: 'electrical', icon: '⚡', en: 'Electrical', ar: 'كهرباء', type: 'home', serviceType: 'electrical', category: 'corrective',
      subcategories: [
        { key: 'elec_wiring', en: 'Wiring & Rewiring', ar: 'أسلاك وتمديدات' },
        { key: 'elec_outlet', en: 'Outlets & Switches', ar: 'أفياش ومفاتيح' },
        { key: 'elec_lighting', en: 'Lighting Installation', ar: 'تركيب إضاءة' },
        { key: 'elec_panel', en: 'Panel / Breaker Box', ar: 'لوحة كهربائية' },
        { key: 'elec_smart', en: 'Smart Home', ar: 'منزل ذكي' },
      ],
    },
    {
      key: 'painting', icon: '🎨', en: 'Painting', ar: 'دهان', type: 'home', serviceType: 'civil', category: 'corrective',
      subcategories: [
        { key: 'paint_interior', en: 'Interior Painting', ar: 'دهان داخلي' },
        { key: 'paint_exterior', en: 'Exterior Painting', ar: 'دهان خارجي' },
        { key: 'paint_wallpaper', en: 'Wallpaper', ar: 'ورق جدران' },
        { key: 'paint_texture', en: 'Textured Finishes', ar: 'دهانات ديكورية' },
      ],
    },
    {
      key: 'cleaning', icon: '🧹', en: 'Cleaning', ar: 'تنظيف', type: 'home', serviceType: 'civil', category: 'preventive',
      subcategories: [
        { key: 'clean_deep', en: 'Deep Cleaning', ar: 'تنظيف عميق' },
        { key: 'clean_regular', en: 'Regular Cleaning', ar: 'تنظيف دوري' },
        { key: 'clean_move', en: 'Move-in/out Cleaning', ar: 'تنظيف انتقال' },
        { key: 'clean_carpet', en: 'Carpet & Upholstery', ar: 'سجاد وأثاث' },
        { key: 'clean_tank', en: 'Water Tank Cleaning', ar: 'تنظيف خزانات' },
      ],
    },
    {
      key: 'handyman', icon: '🔧', en: 'Handyman', ar: 'عامل متعدد المهارات', type: 'home', serviceType: 'mechanical', category: 'corrective',
      subcategories: [
        { key: 'handy_furniture', en: 'Furniture Assembly', ar: 'تركيب أثاث' },
        { key: 'handy_mount', en: 'TV / Shelf Mounting', ar: 'تركيب تلفزيون ورفوف' },
        { key: 'handy_door', en: 'Door & Lock Repair', ar: 'إصلاح أبواب وأقفال' },
        { key: 'handy_minor', en: 'Minor Repairs', ar: 'إصلاحات صغيرة' },
      ],
    },
    {
      key: 'appliances', icon: '🔌', en: 'Appliance Repair', ar: 'إصلاح الأجهزة', type: 'home', serviceType: 'electrical', category: 'corrective',
      subcategories: [
        { key: 'appl_washer', en: 'Washer / Dryer', ar: 'غسالة / نشافة' },
        { key: 'appl_fridge', en: 'Refrigerator', ar: 'ثلاجة' },
        { key: 'appl_oven', en: 'Oven / Stove', ar: 'فرن / طباخ' },
        { key: 'appl_dishwasher', en: 'Dishwasher', ar: 'غسالة أطباق' },
        { key: 'appl_other', en: 'Other Appliances', ar: 'أجهزة أخرى' },
      ],
    },
    {
      key: 'landscaping_home', icon: '🌿', en: 'Home Landscaping', ar: 'تنسيق حدائق منزلية', type: 'home', serviceType: 'civil', category: 'preventive',
      subcategories: [
        { key: 'land_design', en: 'Garden Design', ar: 'تصميم حدائق' },
        { key: 'land_irrigation', en: 'Irrigation Systems', ar: 'أنظمة ري' },
        { key: 'land_trimming', en: 'Trimming & Mowing', ar: 'قص وتهذيب' },
        { key: 'land_pest', en: 'Pest Control', ar: 'مكافحة حشرات' },
      ],
    },
    {
      key: 'others_home', icon: '🔧', en: 'Other Home Services', ar: 'خدمات منزلية أخرى', type: 'home', serviceType: 'other', category: 'other',
    },
  ],
  project: [
    {
      key: 'fitout', icon: '🏗️', en: 'Fit-Out', ar: 'تشطيب', type: 'project', serviceType: 'civil', category: 'project',
      subcategories: [
        { key: 'fitout_full', en: 'Full Fit-Out', ar: 'تشطيب كامل' },
        { key: 'fitout_partial', en: 'Partial Fit-Out', ar: 'تشطيب جزئي' },
        { key: 'fitout_office', en: 'Office Fit-Out', ar: 'تجهيز مكاتب' },
        { key: 'fitout_retail', en: 'Retail / Shop', ar: 'تجهيز محلات' },
      ],
    },
    {
      key: 'tiling', icon: '⬜', en: 'Tiling', ar: 'بلاط', type: 'project', serviceType: 'civil', category: 'project',
      subcategories: [
        { key: 'tile_floor', en: 'Floor Tiling', ar: 'بلاط أرضيات' },
        { key: 'tile_wall', en: 'Wall Tiling', ar: 'بلاط جدران' },
        { key: 'tile_marble', en: 'Marble / Granite', ar: 'رخام / جرانيت' },
        { key: 'tile_outdoor', en: 'Outdoor Paving', ar: 'رصف خارجي' },
      ],
    },
    {
      key: 'gypsum', icon: '🏛️', en: 'Gypsum/False Ceiling', ar: 'جبس/أسقف معلقة', type: 'project', serviceType: 'civil', category: 'project',
      subcategories: [
        { key: 'gyp_ceiling', en: 'False Ceiling', ar: 'أسقف معلقة' },
        { key: 'gyp_partition', en: 'Gypsum Partitions', ar: 'فواصل جبس' },
        { key: 'gyp_decorative', en: 'Decorative Cornices', ar: 'كرانيش ديكورية' },
      ],
    },
    {
      key: 'carpentry', icon: '🪵', en: 'Carpentry/Joinery', ar: 'نجارة', type: 'project', serviceType: 'mechanical', category: 'project',
      subcategories: [
        { key: 'carp_kitchen', en: 'Kitchen Cabinets', ar: 'خزائن مطبخ' },
        { key: 'carp_wardrobe', en: 'Wardrobes', ar: 'دواليب' },
        { key: 'carp_doors', en: 'Doors', ar: 'أبواب' },
        { key: 'carp_custom', en: 'Custom Furniture', ar: 'أثاث مخصص' },
      ],
    },
    {
      key: 'mep', icon: '⚙️', en: 'MEP', ar: 'كهرباء وميكانيكا وسباكة', type: 'project', serviceType: 'mechanical', category: 'project',
      subcategories: [
        { key: 'mep_elec', en: 'Electrical Systems', ar: 'أنظمة كهربائية' },
        { key: 'mep_plumb', en: 'Plumbing Systems', ar: 'أنظمة سباكة' },
        { key: 'mep_hvac', en: 'HVAC Systems', ar: 'أنظمة تكييف' },
        { key: 'mep_fire', en: 'Fire Safety', ar: 'إنذار حريق' },
      ],
    },
    {
      key: 'waterproofing', icon: '💧', en: 'Waterproofing', ar: 'عزل مائي', type: 'project', serviceType: 'civil', category: 'project',
      subcategories: [
        { key: 'wp_roof', en: 'Roof Waterproofing', ar: 'عزل أسطح' },
        { key: 'wp_basement', en: 'Basement', ar: 'عزل قبو' },
        { key: 'wp_bathroom', en: 'Wet Areas', ar: 'عزل مناطق رطبة' },
        { key: 'wp_thermal', en: 'Thermal Insulation', ar: 'عزل حراري' },
      ],
    },
    {
      key: 'landscaping_commercial', icon: '🌳', en: 'Commercial Landscaping', ar: 'تنسيق حدائق تجاري', type: 'project', serviceType: 'civil', category: 'project',
      subcategories: [
        { key: 'cl_design', en: 'Landscape Design', ar: 'تصميم تنسيق' },
        { key: 'cl_hardscape', en: 'Hardscaping', ar: 'أعمال صلبة' },
        { key: 'cl_softscape', en: 'Softscaping', ar: 'أعمال زراعية' },
      ],
    },
    {
      key: 'renovation', icon: '🏢', en: 'Full Renovation', ar: 'تجديد كامل', type: 'project', serviceType: 'civil', category: 'project',
      subcategories: [
        { key: 'reno_villa', en: 'Villa Renovation', ar: 'تجديد فيلا' },
        { key: 'reno_apartment', en: 'Apartment Renovation', ar: 'تجديد شقة' },
        { key: 'reno_commercial', en: 'Commercial Renovation', ar: 'تجديد تجاري' },
      ],
    },
    {
      key: 'others_project', icon: '🔩', en: 'Other Project Services', ar: 'خدمات مشاريع أخرى', type: 'project', serviceType: 'other', category: 'other',
    },
  ]
};

// Get all categories as flat array
export const getAllCategories = (): ServiceCategory[] => {
  return [...SERVICE_CATEGORIES.home, ...SERVICE_CATEGORIES.project];
};

// Get category by key
export const getCategoryByKey = (key: string): ServiceCategory | undefined => {
  return getAllCategories().find(cat => cat.key === key);
};

// Get subcategory by key (search all categories)
export const getSubcategoryByKey = (subKey: string): { category: ServiceCategory; subcategory: ServiceSubcategory } | undefined => {
  for (const cat of getAllCategories()) {
    const sub = cat.subcategories?.find(s => s.key === subKey);
    if (sub) return { category: cat, subcategory: sub };
  }
  return undefined;
};

import { localizeCategory } from './translations';

// Get category label
export const getCategoryLabel = (key: string, lang: 'en' | 'ar' = 'en'): string => {
  const category = getCategoryByKey(key);
  if (!category) return localizeCategory(key, lang);
  return lang === 'ar' ? category.ar : category.en;
};

// Get subcategory label
export const getSubcategoryLabel = (rawString: string | undefined | null, lang: 'en' | 'ar' = 'en'): string => {
  if (!rawString) return '';
  const searchKey = rawString.toLowerCase().trim();
  
  // 1. Try exact exact key lookup first
  const exactMatch = getSubcategoryByKey(searchKey);
  if (exactMatch) return lang === 'ar' ? exactMatch.subcategory.ar : exactMatch.subcategory.en;

  // 2. Try to find by matching the English or Arabic string directly
  for (const cat of getAllCategories()) {
    if (!cat.subcategories) continue;
    for (const sub of cat.subcategories) {
      if (sub.en.toLowerCase() === searchKey || sub.ar.toLowerCase() === searchKey) {
        return lang === 'ar' ? sub.ar : sub.en;
      }
    }
  }

  // 3. Fuzzy keyword fallback for common raw DB payloads
  if (lang === 'ar') {
    if (searchKey.includes('install')) return 'تركيب';
    if (searchKey.includes('repair')) return 'إصلاح';
    if (searchKey.includes('maintain') || searchKey.includes('maintenance')) return 'صيانة';
    if (searchKey.includes('clean')) return 'تنظيف';
    if (searchKey.includes('leak')) return 'تسريب';
    if (searchKey.includes('wire') || searchKey.includes('wiring')) return 'تمديدات';
    if (searchKey.includes('paint')) return 'دهان';
    if (searchKey.includes('mount')) return 'تركيب وتثبيت';
  }

  // 4. Return as is if we have absolutely nothing
  return rawString;
};

// Get category icon
export const getCategoryIcon = (key: string): string => {
  const category = getCategoryByKey(key);
  return category?.icon || '🔧';
};

// Get home categories
export const getHomeCategories = (): ServiceCategory[] => {
  return SERVICE_CATEGORIES.home;
};

// Get project categories
export const getProjectCategories = (): ServiceCategory[] => {
  return SERVICE_CATEGORIES.project;
};

// Legacy category mapping (for data migration)
export const LEGACY_CATEGORY_MAP: Record<string, string> = {
  'HVAC': 'ac_repair',
  'Plumbing': 'plumbing',
  'Electrical': 'electrical',
  'Painting': 'painting',
  'Cleaning': 'cleaning',
  'Roofing': 'construction',
  'Flooring': 'tiling',
  'Landscaping': 'landscaping_home',
};

// Migrate legacy category to new key
export const migrateLegacyCategory = (oldCategory: string): string => {
  return LEGACY_CATEGORY_MAP[oldCategory] || oldCategory;
};
