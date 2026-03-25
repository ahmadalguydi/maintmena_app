import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VendorData {
  email: string;
  full_name: string;
  full_name_en: string;
  full_name_ar: string;
  user_type: string;
  phone: string | null;
  company_name: string | null;
  company_name_en: string | null;
  company_name_ar: string | null;
  company_description: string | null;
  company_description_en: string | null;
  company_description_ar: string | null;
  bio: string | null;
  bio_en: string | null;
  bio_ar: string | null;
  original_language: 'en' | 'ar';
  service_categories: string[];
  verified_seller: boolean;
  seller_rating: number;
  completed_projects: number;
  years_of_experience: number;
  response_time_hours: number;
  availability_status: string;
  crew_size_range: string;
  discoverable: boolean;
  system_generated: boolean;
}

// Weighted Saudi name pools for realistic distribution
const maleFirstNames = {
  veryCommon: ['محمد', 'أحمد', 'عبدالله', 'علي', 'خالد'],
  common: ['سعد', 'عمر', 'فهد', 'سلطان', 'ناصر', 'فيصل', 'وليد'],
  medium: ['تركي', 'بندر', 'طارق', 'هاني', 'محمود', 'عادل', 'حسن', 'يوسف'],
  rare: ['زياد', 'غسان', 'هشام', 'كريم', 'سامي', 'نايف', 'مشعل', 'ثامر', 'راشد', 'ماجد', 'بدر', 'عبدالعزيز']
};

const femaleFirstNames = ['نورة', 'هند', 'مريم', 'سارة', 'فاطمة', 'العنود', 'لطيفة', 'ريم'];

const lastNames = {
  veryCommon: ['القحطاني', 'العتيبي', 'الشمري', 'الدوسري', 'الغامدي', 'الزهراني'],
  common: ['الحربي', 'المطيري', 'العمري', 'السهلي', 'السعيد', 'الأحمد', 'المالكي'],
  medium: ['الجهني', 'الشهري', 'القرني', 'العنزي', 'العصيمي', 'البقمي'],
  rare: ['الصقيه', 'الخالدي', 'البلوي', 'الرشيدي', 'الفهد', 'السبيعي', 'الثبيتي']
};

const englishTransliterations: Record<string, string> = {
  'محمد': 'Mohammed', 'أحمد': 'Ahmed', 'عبدالله': 'Abdullah', 'علي': 'Ali',
  'خالد': 'Khalid', 'سعد': 'Saad', 'عمر': 'Omar', 'فهد': 'Fahad',
  'سلطان': 'Sultan', 'ناصر': 'Nasser', 'فيصل': 'Faisal', 'وليد': 'Waleed',
  'تركي': 'Turki', 'بندر': 'Bandar', 'طارق': 'Tariq', 'هاني': 'Hani',
  'القحطاني': 'Alqahtani', 'العتيبي': 'Alotaibi', 'الشمري': 'Alshamri',
  'الدوسري': 'Aldosari', 'الغامدي': 'Alghamdi', 'الزهراني': 'Alzahrani',
  'الحربي': 'Alharbi', 'المطيري': 'Almutairi', 'العمري': 'Alomari',
  'الجهني': 'Aljuhani', 'الشهري': 'Alshahri', 'القرني': 'Alqarni',
  'السهلي': 'Alsuhali', 'السعيد': 'Alsaeed', 'الأحمد': 'Alahmed',
  'محمود': 'Mahmoud', 'عادل': 'Adel', 'حسن': 'Hassan', 'يوسف': 'Youssef'
};

const professions = ['سباكة', 'كهرباء', 'نجارة', 'دهان', 'تكييف'];

const arabicCompanyNames = [
  'النجارة الحديثة',
  'كهرباء المدينة',
  'السباكة السريعة',
  'دهانات الفخامة',
  'تكييف الخليج'
];

const serviceCategories = [
  'plumbing', 'electrical', 'hvac', 'carpentry', 'painting',
  'cleaning', 'landscaping', 'handyman', 'appliance_repair'
];

const availabilityStatuses = ['accepting_requests', 'busy', 'fully_booked'];
const crewSizes = ['1-3', '4-10', '11-20', '20+'];

// 50+ unique bio templates per service - 30% frequency
const bioTemplates = {
  plumbing_ar: [
    'سباك في جدة منذ ٢٠ سنة - تسليك مجاري وتركيب صحي',
    'خبرة ١٥ سنة في السباكة - أعمال المنازل والشركات',
    'متخصص في كشف تسربات المياه بأحدث الأجهزة',
    'سباك ممتاز - خدمة سريعة ٢٤ ساعة',
    'أعمال السباكة والتسليك - أسعار منافسة',
    'تركيب وصيانة الأدوات الصحية',
    'خبرة في إصلاح جميع مشاكل السباكة',
    'سباك محترف - ضمان على الأعمال'
  ],
  electrical_ar: [
    'كهربائي منازل وشقق - تمديدات وصيانة',
    'فني كهرباء خبرة ١٢ سنة - أعمال التكييف أيضاً',
    'كهربائي محترف - إصلاح الأعطال فوراً',
    'متخصص في التمديدات الكهربائية والإنارة',
    'كهربائي معتمد - لوحات كهرباء وتأسيس',
    'أعمال الكهرباء للمنازل والمحلات',
    'فني كهرباء ذو خبرة - أسعار مناسبة',
    'تركيب الإنارة والثريات'
  ],
  hvac_ar: [
    'فني تكييف مركزي وسبليت - صيانة وتركيب',
    'متخصص في صيانة المكيفات - خدمة منازل',
    'تنظيف وإصلاح جميع أنواع المكيفات',
    'فني تبريد وتكييف معتمد - خبرة ١٠ سنوات',
    'صيانة تكييف سريعة ومضمونة',
    'أعمال التكييف والتبريد الشامل',
    'فني مكيفات محترف - متوفر دائماً'
  ],
  carpentry_ar: [
    'نجار أثاث ومطابخ - تفصيل حسب الطلب',
    'أعمال النجارة والديكور الخشبي',
    'نجار خبرة في تركيب الأبواب والشبابيك',
    'نجارة منازل - إصلاح وتجديد',
    'تصميم وتنفيذ الأثاث الخشبي',
    'نجار محترف - أسعار تنافسية',
    'خبرة في النجارة المسلحة والديكور'
  ],
  painting_ar: [
    'دهان منازل وديكورات - ألوان حديثة',
    'أعمال الدهانات الداخلية والخارجية',
    'دهان محترف - أسعار تنافسية',
    'معلم دهانات - جميع أنواع الأصباغ',
    'دهانات فاخرة للفلل والقصور',
    'أعمال الدهان والديكور',
    'دهان خبرة طويلة - عمل نظيف'
  ],
  cleaning_ar: [
    'تنظيف شقق ومنازل - خدمة يومية أو شهرية',
    'تنظيف عميق للمنازل والفلل',
    'عامل نظافة محترف - أسعار مناسبة',
    'خدمات تنظيف شاملة - فريق متخصص',
    'تنظيف منازل بعد الدهان والتشطيب'
  ],
  landscaping_ar: [
    'تنسيق حدائق وزراعة - صيانة دورية',
    'أعمال البستنة والعناية بالحدائق',
    'تصميم وتنفيذ الحدائق المنزلية',
    'متخصص في الزراعة والري',
    'تنسيق حدائق احترافي'
  ],
  handyman_ar: [
    'صيانة عامة للمنازل والشقق',
    'أعمال صيانة منزلية شاملة',
    'عامل صيانة - كهرباء وسباكة ونجارة',
    'خدمات متنوعة - إصلاحات منزلية',
    'فني صيانة عامة - جميع الخدمات',
    'صيانة وإصلاحات فورية'
  ],
  general_en: [
    'Experienced plumber - 8 years in Riyadh',
    'Professional electrician for homes and offices',
    'AC technician - installation and repair specialist',
    'Skilled carpenter - custom furniture and doors',
    'Expert painter - interior and exterior work',
    'Handyman services - all home repairs',
    'Professional cleaner - daily or weekly service',
    'HVAC specialist - split and central systems',
    'Certified electrician - 10+ years experience',
    'Plumbing expert - leak detection and repairs',
    'Carpenter with 12 years experience',
    'Painting contractor - quality finish guaranteed'
  ]
};

// Helper to select from weighted pool
const selectWeighted = (pool: any): string => {
  const rand = Math.random();
  if (rand < 0.4) return pool.veryCommon[Math.floor(Math.random() * pool.veryCommon.length)];
  if (rand < 0.7) return pool.common[Math.floor(Math.random() * pool.common.length)];
  if (rand < 0.9) return pool.medium[Math.floor(Math.random() * pool.medium.length)];
  return pool.rare[Math.floor(Math.random() * pool.rare.length)];
};

// Track used bios to prevent duplicates
const usedBios = new Set<string>();

const generateVendor = (index: number, isCompanyVendor: boolean = false, companyIndex?: number): VendorData => {
  const email = `mockvendor${Date.now()}${index}@maintmena.local`;
  
  let fullName = '';
  let fullNameAr = '';
  let fullNameEn = '';
  let originalLanguage: 'en' | 'ar' = 'ar';
  let bio = '';
  let bioAr = '';
  let bioEn = '';
  let companyName = '';
  let companyNameAr = '';
  let companyNameEn = '';
  let categories: string[] = [];
  
  // Handle 5 special Arabic company vendors
  if (isCompanyVendor && companyIndex !== undefined) {
    fullName = arabicCompanyNames[companyIndex];
    fullNameAr = fullName;
    fullNameEn = fullName;
    originalLanguage = 'ar';
    companyName = fullName;
    companyNameAr = fullName;
    companyNameEn = fullName;
    
    // Service-aligned categories for company names
    const companyMapping: Record<string, string[]> = {
      'النجارة الحديثة': ['carpentry', 'handyman'],
      'كهرباء المدينة': ['electrical', 'appliance_repair'],
      'السباكة السريعة': ['plumbing'],
      'دهانات الفخامة': ['painting'],
      'تكييف الخليج': ['hvac']
    };
    categories = companyMapping[fullName] || ['handyman'];
    
    // Matching Arabic bio (30% chance)
    if (Math.random() < 0.3) {
      const categoryKey = categories[0];
      const bioKey = categoryKey === 'hvac' ? 'hvac_ar' : 
                     categoryKey === 'plumbing' ? 'plumbing_ar' :
                     categoryKey === 'electrical' ? 'electrical_ar' :
                     categoryKey === 'carpentry' ? 'carpentry_ar' :
                     categoryKey === 'painting' ? 'painting_ar' : 'handyman_ar';
      const pool = bioTemplates[bioKey as keyof typeof bioTemplates];
      if (pool) {
        const availableBios = pool.filter(b => !usedBios.has(b));
        if (availableBios.length > 0) {
          bio = availableBios[Math.floor(Math.random() * availableBios.length)];
          usedBios.add(bio);
          bioAr = bio;
          bioEn = 'Professional maintenance and repair services';
        }
      }
    }
  } else {
    // Regular vendor generation
    
    // Step 1: Gender Selection (95% male, 5% female)
    const isMale = Math.random() < 0.95;
    
    // Step 2: Name Format Selection (50% full, 45% single, 5% profession)
    const nameFormat = Math.random();
    const isFullName = nameFormat < 0.50;
    const isProfessionName = nameFormat >= 0.95;
    
    // Step 3: Language Selection (70% Arabic, 30% English transliteration)
    const isEnglish = Math.random() < 0.30;
    
    // Step 4: Name Generation
    let firstName = '';
    let lastName = '';
    
    if (isMale) {
      firstName = selectWeighted(maleFirstNames);
    } else {
      firstName = femaleFirstNames[Math.floor(Math.random() * femaleFirstNames.length)];
    }
    
    if (isFullName) {
      lastName = selectWeighted(lastNames);
      if (isEnglish) {
        const firstEn = englishTransliterations[firstName] || firstName;
        const lastEn = englishTransliterations[lastName] || lastName;
        fullName = `${firstEn} ${lastEn}`;
        fullNameEn = fullName;
        fullNameAr = `${firstName} ${lastName}`;
      } else {
        fullName = `${firstName} ${lastName}`;
        fullNameAr = fullName;
        fullNameEn = fullName;
      }
    } else if (isProfessionName) {
      // Profession-based name (Arabic only)
      const profession = professions[Math.floor(Math.random() * professions.length)];
      fullName = `${firstName} ${profession}`;
      fullNameAr = fullName;
      fullNameEn = fullName;
      
      // Force service category based on profession
      const professionMap: Record<string, string> = {
        'سباكة': 'plumbing',
        'كهرباء': 'electrical',
        'نجارة': 'carpentry',
        'دهان': 'painting',
        'تكييف': 'hvac'
      };
      categories.push(professionMap[profession]);
    } else {
      // Single name
      if (isEnglish) {
        fullName = englishTransliterations[firstName] || firstName;
        fullNameEn = fullName;
        fullNameAr = firstName;
      } else {
        fullName = firstName;
        fullNameAr = fullName;
        fullNameEn = fullName;
      }
    }
    
    originalLanguage = isEnglish ? 'en' : 'ar';
    
    // Step 5: Bio Generation (30% probability)
    if (Math.random() < 0.3) {
      // Determine primary service for bio selection
      let bioCategory = categories.length > 0 ? categories[0] : 
                        serviceCategories[Math.floor(Math.random() * serviceCategories.length)];
      
      const bioKey = originalLanguage === 'ar' ? 
        (bioCategory === 'hvac' ? 'hvac_ar' :
         bioCategory === 'plumbing' ? 'plumbing_ar' :
         bioCategory === 'electrical' ? 'electrical_ar' :
         bioCategory === 'carpentry' ? 'carpentry_ar' :
         bioCategory === 'painting' ? 'painting_ar' :
         bioCategory === 'cleaning' ? 'cleaning_ar' :
         bioCategory === 'landscaping' ? 'landscaping_ar' :
         'handyman_ar') : 'general_en';
      
      const pool = bioTemplates[bioKey as keyof typeof bioTemplates];
      if (pool) {
        const availableBios = pool.filter(b => !usedBios.has(b));
        if (availableBios.length > 0) {
          bio = availableBios[Math.floor(Math.random() * availableBios.length)];
          usedBios.add(bio);
          
          if (originalLanguage === 'ar') {
            bioAr = bio;
            bioEn = 'Experienced maintenance professional';
          } else {
            bioEn = bio;
            bioAr = 'محترف صيانة ذو خبرة';
          }
          
          // Add bio-mentioned service to categories
          if (bio.includes('سباك')) categories.push('plumbing');
          if (bio.includes('كهرباء')) categories.push('electrical');
          if (bio.includes('تكييف')) categories.push('hvac');
          if (bio.includes('نجار')) categories.push('carpentry');
          if (bio.includes('دهان')) categories.push('painting');
          if (bio.includes('تنظيف')) categories.push('cleaning');
          if (bio.includes('حدائق')) categories.push('landscaping');
        }
      }
    }
    
    // Step 6: Service Categories (if not already set)
    if (categories.length === 0) {
      const numCategories = Math.floor(Math.random() * 3) + 1;
      const shuffled = [...serviceCategories].sort(() => Math.random() - 0.5);
      categories = shuffled.slice(0, numCategories);
    }
  }
  
  // Remove duplicates from categories
  categories = [...new Set(categories)];
  
  // Rating distribution
  let rating: number;
  const ratingRand = Math.random();
  if (ratingRand < 0.3) {
    rating = 0;
  } else if (ratingRand < 0.7) {
    rating = Math.round((2.5 + Math.random() * 1.7) * 10) / 10;
  } else if (ratingRand < 0.9) {
    rating = Math.round((4.3 + Math.random() * 0.6) * 10) / 10;
  } else {
    rating = 5.0;
  }
  
  // Verification (25% verified)
  const verified = Math.random() < 0.25;
  
  // Projects distribution
  let projects: number;
  const projectRand = Math.random();
  if (projectRand < 0.4) {
    projects = Math.floor(Math.random() * 4);
  } else if (projectRand < 0.75) {
    projects = Math.floor(Math.random() * 12) + 4;
  } else if (projectRand < 0.95) {
    projects = Math.floor(Math.random() * 25) + 16;
  } else {
    projects = Math.floor(Math.random() * 60) + 41;
  }
  
  // Phone (60% have phone)
  const phone = Math.random() < 0.6 ? 
    `+966${Math.floor(Math.random() * 900000000 + 500000000)}` : '';
  
  return {
    email,
    full_name: fullName,
    full_name_ar: fullNameAr,
    full_name_en: fullNameEn,
    user_type: 'seller',
    phone: phone || null,
    company_name: companyName || null,
    company_name_ar: companyNameAr || null,
    company_name_en: companyNameEn || null,
    company_description: null,
    company_description_ar: null,
    company_description_en: null,
    bio: bio || null,
    bio_ar: bioAr || null,
    bio_en: bioEn || null,
    original_language: originalLanguage,
    service_categories: categories,
    verified_seller: verified,
    seller_rating: rating,
    completed_projects: projects,
    years_of_experience: Math.floor(Math.random() * 20) + 1,
    response_time_hours: Math.floor(Math.random() * 48) + 1,
    availability_status: availabilityStatuses[Math.floor(Math.random() * availabilityStatuses.length)],
    crew_size_range: crewSizes[Math.floor(Math.random() * crewSizes.length)],
    discoverable: true,
    system_generated: true
  };
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { count = 100 } = await req.json();
    
    console.log('Deleting existing system_generated vendors...');
    
    // Delete all existing system_generated vendors
    const { data: existingVendors } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('system_generated', true);
    
    if (existingVendors && existingVendors.length > 0) {
      for (const vendor of existingVendors) {
        await supabaseAdmin.auth.admin.deleteUser(vendor.id);
      }
      console.log(`Deleted ${existingVendors.length} existing vendors`);
    }
    
    console.log(`Generating ${count} regular vendors + 5 company vendors...`);
    
    const created = [];
    const errors = [];
    
    // Clear used bios tracker
    usedBios.clear();

    // Generate 5 Arabic company vendors first
    for (let i = 0; i < 5; i++) {
      try {
        const vendorData = generateVendor(i, true, i);

        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: vendorData.email,
          password: `MockVendor${Math.random().toString(36).substring(7)}!`,
          email_confirm: true,
          user_metadata: {
            is_mock: true,
            is_company: true
          }
        });

        if (authError) {
          console.error(`Auth error for company vendor ${i}:`, authError);
          errors.push({ index: i, type: 'company', error: authError.message });
          continue;
        }

        const { email, ...profileData } = vendorData;
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .update(profileData)
          .eq('id', authData.user.id);

        if (profileError) {
          console.error(`Profile error for company vendor ${i}:`, profileError);
          errors.push({ index: i, type: 'company', error: profileError.message });
          await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
          continue;
        }

        created.push({
          id: authData.user.id,
          name: vendorData.full_name,
          type: 'company',
          rating: vendorData.seller_rating
        });

      } catch (error) {
        console.error(`Unexpected error for company vendor ${i}:`, error);
        errors.push({ index: i, type: 'company', error: error.message });
      }
    }

    // Generate regular vendors
    for (let i = 0; i < count; i++) {
      try {
        const vendorData = generateVendor(i, false);

        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: vendorData.email,
          password: `MockVendor${Math.random().toString(36).substring(7)}!`,
          email_confirm: true,
          user_metadata: {
            is_mock: true
          }
        });

        if (authError) {
          console.error(`Auth error for vendor ${i}:`, authError);
          errors.push({ index: i, type: 'regular', error: authError.message });
          continue;
        }

        const { email, ...profileData } = vendorData;
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .update(profileData)
          .eq('id', authData.user.id);

        if (profileError) {
          console.error(`Profile error for vendor ${i}:`, profileError);
          errors.push({ index: i, type: 'regular', error: profileError.message });
          await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
          continue;
        }

        created.push({
          id: authData.user.id,
          name: vendorData.full_name,
          type: 'regular',
          rating: vendorData.seller_rating
        });

        // Add delay every 10 vendors
        if (i % 10 === 0 && i > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error) {
        console.error(`Unexpected error for vendor ${i}:`, error);
        errors.push({ index: i, type: 'regular', error: error.message });
      }
    }

    console.log(`Created ${created.length} vendors (${created.filter(v => v.type === 'company').length} companies, ${created.filter(v => v.type === 'regular').length} regular), ${errors.length} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        created: created.length,
        companies: created.filter(v => v.type === 'company').length,
        regular: created.filter(v => v.type === 'regular').length,
        errors: errors.length,
        createdVendors: created.slice(0, 10),
        errorDetails: errors.slice(0, 5)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
