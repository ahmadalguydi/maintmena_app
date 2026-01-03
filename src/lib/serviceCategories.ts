export interface ServiceCategory {
  key: string;
  icon: string;
  en: string;
  ar: string;
  type: 'home' | 'project';
  serviceType?: string;
  category?: string;
}

// Alpha-enabled categories (only these are available during alpha)
export const ALPHA_ENABLED_CATEGORIES = ['plumbing', 'electrical', 'painting'];

// Check if a category is enabled in alpha
export const isAlphaEnabledCategory = (key: string): boolean => {
  return ALPHA_ENABLED_CATEGORIES.includes(key);
};

export const SERVICE_CATEGORIES: Record<'home' | 'project', ServiceCategory[]> = {
  home: [
    { key: 'ac_repair', icon: '❄️', en: 'AC Repair', ar: 'إصلاح التكييف', type: 'home', serviceType: 'hvac', category: 'corrective' },
    { key: 'plumbing', icon: '🚰', en: 'Plumbing', ar: 'سباكة', type: 'home', serviceType: 'plumbing', category: 'corrective' },
    { key: 'electrical', icon: '⚡', en: 'Electrical', ar: 'كهرباء', type: 'home', serviceType: 'electrical', category: 'corrective' },
    { key: 'painting', icon: '🎨', en: 'Painting', ar: 'دهان', type: 'home', serviceType: 'civil', category: 'corrective' },
    { key: 'cleaning', icon: '🧹', en: 'Cleaning', ar: 'تنظيف', type: 'home', serviceType: 'civil', category: 'preventive' },
    { key: 'handyman', icon: '🔧', en: 'Handyman', ar: 'عامل متعدد المهارات', type: 'home', serviceType: 'mechanical', category: 'corrective' },
    { key: 'appliances', icon: '🔌', en: 'Appliance Repair', ar: 'إصلاح الأجهزة', type: 'home', serviceType: 'electrical', category: 'corrective' },
    { key: 'landscaping_home', icon: '🌿', en: 'Home Landscaping', ar: 'تنسيق حدائق منزلية', type: 'home', serviceType: 'civil', category: 'preventive' },
    { key: 'others_home', icon: '🔧', en: 'Other Home Services', ar: 'خدمات منزلية أخرى', type: 'home', serviceType: 'other', category: 'other' },
  ],
  project: [
    { key: 'fitout', icon: '🏗️', en: 'Fit-Out', ar: 'تشطيب', type: 'project', serviceType: 'civil', category: 'project' },
    { key: 'tiling', icon: '⬜', en: 'Tiling', ar: 'بلاط', type: 'project', serviceType: 'civil', category: 'project' },
    { key: 'gypsum', icon: '🏛️', en: 'Gypsum/False Ceiling', ar: 'جبس/أسقف معلقة', type: 'project', serviceType: 'civil', category: 'project' },
    { key: 'carpentry', icon: '🪵', en: 'Carpentry/Joinery', ar: 'نجارة', type: 'project', serviceType: 'mechanical', category: 'project' },
    { key: 'mep', icon: '⚙️', en: 'MEP', ar: 'كهرباء وميكانيكا وسباكة', type: 'project', serviceType: 'mechanical', category: 'project' },
    { key: 'waterproofing', icon: '💧', en: 'Waterproofing', ar: 'عزل مائي', type: 'project', serviceType: 'civil', category: 'project' },
    { key: 'landscaping_commercial', icon: '🌳', en: 'Commercial Landscaping', ar: 'تنسيق حدائق تجاري', type: 'project', serviceType: 'civil', category: 'project' },
    { key: 'renovation', icon: '🏢', en: 'Full Renovation', ar: 'تجديد كامل', type: 'project', serviceType: 'civil', category: 'project' },
    { key: 'others_project', icon: '🔩', en: 'Other Project Services', ar: 'خدمات مشاريع أخرى', type: 'project', serviceType: 'other', category: 'other' },
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

// Get category label
export const getCategoryLabel = (key: string, lang: 'en' | 'ar' = 'en'): string => {
  const category = getCategoryByKey(key);
  if (!category) return key;
  return lang === 'ar' ? category.ar : category.en;
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
