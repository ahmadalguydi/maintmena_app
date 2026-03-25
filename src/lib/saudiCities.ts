// Comprehensive list of major cities and towns in Saudi Arabia with Arabic translations and aliases

export interface CityData {
  en: string;
  ar: string;
  aliases?: string[];
  popularity: number; // 1 = most popular
}

export const SAUDI_CITIES_BILINGUAL: CityData[] = [
  // Top tier cities (popularity 1-5)
  { en: "Riyadh", ar: "الرياض", aliases: ["Riyad", "الرياظ"], popularity: 1 },
  { en: "Jeddah", ar: "جدة", aliases: ["Jedda", "Jiddah", "Jiddha", "جده"], popularity: 2 },
  { en: "Makkah", ar: "مكة المكرمة", aliases: ["Mecca", "Makkah Al Mukarramah", "مكة", "مكه"], popularity: 3 },
  { en: "Madinah", ar: "المدينة المنورة", aliases: ["Medina", "Al Madinah", "المدينة", "المدينه"], popularity: 4 },
  { en: "Dammam", ar: "الدمام", aliases: ["Ad Dammam", "الدمّام"], popularity: 5 },
  
  // Second tier (popularity 6-15)
  { en: "Khobar", ar: "الخبر", aliases: ["Al Khobar", "الخُبر"], popularity: 6 },
  { en: "Ta'if", ar: "الطائف", aliases: ["Taif", "At Ta'if", "الطايف"], popularity: 7 },
  { en: "Dhahran", ar: "الظهران", aliases: ["Az Zahran", "الضهران"], popularity: 8 },
  { en: "Jubail", ar: "الجبيل", aliases: ["Al Jubail", "الجُبيل"], popularity: 9 },
  { en: "Tabuk", ar: "تبوك", aliases: ["Tabouk", "تبُوك"], popularity: 10 },
  { en: "Buraydah", ar: "بريدة", aliases: ["Buraidah", "Buraida", "بريده"], popularity: 11 },
  { en: "Khamis Mushait", ar: "خميس مشيط", aliases: ["Khamis Mushit", "خميس مشيت"], popularity: 12 },
  { en: "Abha", ar: "أبها", aliases: ["Abhaa", "ابها"], popularity: 13 },
  { en: "Al Ahsa", ar: "الأحساء", aliases: ["Hasa", "Al-Ahsa", "الإحساء"], popularity: 14 },
  { en: "Najran", ar: "نجران", aliases: ["Nejran", "نجرآن"], popularity: 15 },
  
  // Third tier (popularity 16-30)
  { en: "Yanbu", ar: "ينبع", aliases: ["Yanbo", "ينبُع"], popularity: 16 },
  { en: "Ha'il", ar: "حائل", aliases: ["Hail", "حايل"], popularity: 17 },
  { en: "Hofuf", ar: "الهفوف", aliases: ["Al Hofuf", "الهُفوف"], popularity: 18 },
  { en: "Qatif", ar: "القطيف", aliases: ["Al Qatif", "القطّيف"], popularity: 19 },
  { en: "Al Kharj", ar: "الخرج", aliases: ["Kharj", "الخُرج"], popularity: 20 },
  { en: "Unaizah", ar: "عنيزة", aliases: ["Onaizah", "عُنيزة"], popularity: 21 },
  { en: "Sakaka", ar: "سكاكا", aliases: ["Sakakah", "سكاكه"], popularity: 22 },
  { en: "Jazan", ar: "جازان", aliases: ["Jizan", "Gizan", "جيزان"], popularity: 23 },
  { en: "Arar", ar: "عرعر", aliases: ["Ar'ar", "عرّعر"], popularity: 24 },
  { en: "Al Bahah", ar: "الباحة", aliases: ["Bahah", "الباحه"], popularity: 25 },
  { en: "Qurayyat", ar: "القريات", aliases: ["Qaryat", "القُريات"], popularity: 26 },
  { en: "Bisha", ar: "بيشة", aliases: ["Bishah", "بيشه"], popularity: 27 },
  { en: "Al Ula", ar: "العلا", aliases: ["AlUla", "العُلا"], popularity: 28 },
  { en: "Rafha", ar: "رفحاء", aliases: ["Rafha'", "رفحا"], popularity: 29 },
  { en: "Turaif", ar: "طريف", aliases: ["Turayf", "طُريف"], popularity: 30 },
  
  // Rest of cities (popularity 31+)
  { en: "Al Muzahimiyah", ar: "المزاحمية", popularity: 31 },
  { en: "Diriyah", ar: "الدرعية", aliases: ["Ad Diriyah", "الدرعيه"], popularity: 32 },
  { en: "Al Majma'ah", ar: "المجمعة", aliases: ["Majmaah"], popularity: 33 },
  { en: "Dhurma", ar: "ضرما", popularity: 34 },
  { en: "Al Dilam", ar: "الدلم", popularity: 35 },
  { en: "Rumah", ar: "رماح", popularity: 36 },
  { en: "Shaqra", ar: "شقراء", aliases: ["Shaqraa"], popularity: 37 },
  { en: "Hawtat Bani Tamim", ar: "حوطة بني تميم", popularity: 38 },
  { en: "Afif", ar: "عفيف", popularity: 39 },
  { en: "Al Ghat", ar: "الغاط", popularity: 40 },
  { en: "Huraimila", ar: "حريملاء", popularity: 41 },
  { en: "Thadiq", ar: "ثادق", popularity: 42 },
  { en: "Zulfi", ar: "الزلفي", aliases: ["Az Zulfi"], popularity: 43 },
  { en: "Wadi Al Dawasir", ar: "وادي الدواسر", popularity: 44 },
  { en: "Rabigh", ar: "رابغ", popularity: 45 },
  { en: "Khulais", ar: "خليص", popularity: 46 },
  { en: "Ranyah", ar: "رنية", popularity: 47 },
  { en: "Turbah", ar: "تربة", popularity: 48 },
  { en: "Al Jumum", ar: "الجموم", popularity: 49 },
  { en: "Al Kamil", ar: "الكامل", popularity: 50 },
  { en: "Qunfudhah", ar: "القنفذة", aliases: ["Al Qunfudhah"], popularity: 51 },
  { en: "Al Lith", ar: "الليث", popularity: 52 },
  { en: "Adham", ar: "أضم", popularity: 53 },
  { en: "Al Muwayh", ar: "الموية", popularity: 54 },
  { en: "Maysan", ar: "ميسان", popularity: 55 },
  { en: "Bahra", ar: "بحرة", popularity: 56 },
  { en: "Badr", ar: "بدر", popularity: 57 },
  { en: "Khaybar", ar: "خيبر", popularity: 58 },
  { en: "Al Mahd", ar: "المهد", popularity: 59 },
  { en: "Al Hanakiyah", ar: "الحناكية", popularity: 60 },
  { en: "Ras Tanura", ar: "رأس تنورة", popularity: 61 },
  { en: "Safwa", ar: "صفوى", popularity: 62 },
  { en: "Abqaiq", ar: "بقيق", popularity: 63 },
  { en: "Khafji", ar: "الخفجي", aliases: ["Al Khafji"], popularity: 64 },
  { en: "Nairyah", ar: "النعيرية", aliases: ["An Nairyah"], popularity: 65 },
  { en: "Sihat", ar: "سيهات", popularity: 66 },
  { en: "Muhayil", ar: "محايل", popularity: 67 },
  { en: "Sarat Abidah", ar: "سراة عبيدة", popularity: 68 },
  { en: "Ahad Rafidah", ar: "أحد رفيدة", popularity: 69 },
  { en: "Rijal Almaa", ar: "رجال ألمع", popularity: 70 },
  { en: "Dhahran Al Janub", ar: "ظهران الجنوب", popularity: 71 },
  { en: "Bareq", ar: "بارق", popularity: 72 },
  { en: "Balasmar", ar: "بلسمر", popularity: 73 },
  { en: "Ar Rass", ar: "الرس", aliases: ["Al Rass"], popularity: 74 },
  { en: "Al Badaya", ar: "البدائع", popularity: 75 },
  { en: "Al Mithnab", ar: "المذنب", popularity: 76 },
  { en: "Riyadh Al Khabra", ar: "رياض الخبراء", popularity: 77 },
  { en: "Uyun Al Jiwa", ar: "عيون الجواء", popularity: 78 },
  { en: "Al Bukayriyah", ar: "البكيرية", popularity: 79 },
  { en: "Al Asyah", ar: "الأسياح", popularity: 80 },
  { en: "Baqaa", ar: "بقعاء", popularity: 81 },
  { en: "Al Ghazalah", ar: "الغزالة", popularity: 82 },
  { en: "Ash Shinan", ar: "الشنان", popularity: 83 },
  { en: "Samira", ar: "سميراء", popularity: 84 },
  { en: "Mawqaq", ar: "موقق", popularity: 85 },
  { en: "Al Hait", ar: "الحائط", popularity: 86 },
  { en: "Jubbah", ar: "جبة", popularity: 87 },
  { en: "Duba", ar: "ضباء", aliases: ["Dhuba", "ضبا"], popularity: 88 },
  { en: "Al Wajh", ar: "الوجه", popularity: 89 },
  { en: "Tayma", ar: "تيماء", aliases: ["Teima"], popularity: 90 },
  { en: "Umluj", ar: "أملج", popularity: 91 },
  { en: "Haql", ar: "حقل", popularity: 92 },
  { en: "Al Bad", ar: "البدع", popularity: 93 },
  { en: "Sharurah", ar: "شرورة", popularity: 94 },
  { en: "Hubuna", ar: "حبونا", popularity: 95 },
  { en: "Badr Al Janub", ar: "بدر الجنوب", popularity: 96 },
  { en: "Yadamah", ar: "يدمة", popularity: 97 },
  { en: "Dumat Al Jandal", ar: "دومة الجندل", popularity: 98 },
  { en: "Tabarjal", ar: "طبرجل", popularity: 99 },
  { en: "Al Uwayqilah", ar: "العويقيلة", popularity: 100 },
  { en: "Sabya", ar: "صبيا", popularity: 101 },
  { en: "Abu Arish", ar: "أبو عريش", popularity: 102 },
  { en: "Samtah", ar: "صامطة", popularity: 103 },
  { en: "Damad", ar: "ضمد", popularity: 104 },
  { en: "Baish", ar: "بيش", popularity: 105 },
  { en: "Al Ardah", ar: "العارضة", popularity: 106 },
  { en: "Ahad Al Masarihah", ar: "أحد المسارحة", popularity: 107 },
  { en: "Al Darb", ar: "الدرب", popularity: 108 },
  { en: "Farasan", ar: "فرسان", popularity: 109 },
  { en: "Ad Dayer", ar: "الدائر", popularity: 110 },
  { en: "Baljurashi", ar: "بلجرشي", popularity: 111 },
  { en: "Al Mandaq", ar: "المندق", popularity: 112 },
  { en: "Al Mikhwah", ar: "المخواة", popularity: 113 },
  { en: "Qilwah", ar: "قلوة", popularity: 114 },
  { en: "Al Aqiq", ar: "العقيق", popularity: 115 },
  { en: "Al Qura", ar: "القرى", popularity: 116 },
].sort((a, b) => a.popularity - b.popularity);

// Keep legacy exports for backward compatibility
export const SAUDI_CITIES = SAUDI_CITIES_BILINGUAL.map(city => city.en);

// Get popular cities (top 15)
export const POPULAR_CITIES = SAUDI_CITIES_BILINGUAL.filter(c => c.popularity <= 15);

export const MAJOR_CITIES = [
  { en: "Riyadh", ar: "الرياض" },
  { en: "Jeddah", ar: "جدة" },
  { en: "Dammam", ar: "الدمام" },
  { en: "Makkah", ar: "مكة المكرمة" },
  { en: "Madinah", ar: "المدينة المنورة" },
  { en: "Khobar", ar: "الخبر" },
  { en: "Ta'if", ar: "الطائف" },
  { en: "Abha", ar: "أبها" },
  { en: "Buraydah", ar: "بريدة" },
  { en: "Tabuk", ar: "تبوك" },
  { en: "Najran", ar: "نجران" },
  { en: "Ha'il", ar: "حائل" }
];

export const COUNTRIES = [
  { value: "saudi_arabia", label: "Saudi Arabia", label_ar: "المملكة العربية السعودية" },
  { value: "remote", label: "Remote", label_ar: "عن بعد" }
];

// Search function that checks aliases
export const searchCities = (query: string, lang: 'en' | 'ar'): CityData[] => {
  if (!query.trim()) return SAUDI_CITIES_BILINGUAL;
  
  const lowerQuery = query.toLowerCase().trim();
  
  return SAUDI_CITIES_BILINGUAL.filter(city => {
    // Check main names
    if (city.en.toLowerCase().includes(lowerQuery)) return true;
    if (city.ar.includes(query)) return true;
    
    // Check aliases
    if (city.aliases) {
      return city.aliases.some(alias => 
        alias.toLowerCase().includes(lowerQuery) || alias.includes(query)
      );
    }
    
    return false;
  });
};