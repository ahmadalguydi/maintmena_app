// Coordinates for major Saudi Arabian cities
export const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  // Riyadh Region
  "Riyadh": { lat: 24.7136, lng: 46.6753 },
  "Al Kharj": { lat: 24.1553, lng: 47.3125 },
  "Al Majma'ah": { lat: 25.8875, lng: 45.3656 },
  "Diriyah": { lat: 24.7364, lng: 46.5772 },
  "Shaqra": { lat: 25.2458, lng: 45.2553 },
  "Zulfi": { lat: 26.2994, lng: 44.8069 },
  "Wadi Al Dawasir": { lat: 20.5045, lng: 45.1589 },
  "Afif": { lat: 23.9064, lng: 43.0467 },
  
  // Makkah Region
  "Makkah": { lat: 21.3891, lng: 39.8579 },
  "Jeddah": { lat: 21.5433, lng: 39.1728 },
  "Ta'if": { lat: 21.2703, lng: 40.4158 },
  "Rabigh": { lat: 22.7983, lng: 39.0361 },
  "Khulais": { lat: 22.0333, lng: 39.2167 },
  "Qunfudhah": { lat: 19.1297, lng: 41.0783 },
  "Al Lith": { lat: 20.1594, lng: 40.2694 },
  
  // Madinah Region
  "Madinah": { lat: 24.5247, lng: 39.5692 },
  "Yanbu": { lat: 24.0897, lng: 38.0618 },
  "Al Ula": { lat: 26.6083, lng: 37.9236 },
  "Badr": { lat: 23.7800, lng: 38.7878 },
  "Khaybar": { lat: 25.6947, lng: 39.2903 },
  
  // Eastern Province
  "Dammam": { lat: 26.4207, lng: 50.0888 },
  "Khobar": { lat: 26.2172, lng: 50.1971 },
  "Dhahran": { lat: 26.2761, lng: 50.1510 },
  "Al Ahsa": { lat: 25.3731, lng: 49.5858 },
  "Hofuf": { lat: 25.3647, lng: 49.5856 },
  "Qatif": { lat: 26.5210, lng: 50.0088 },
  "Jubail": { lat: 27.0174, lng: 49.6603 },
  "Ras Tanura": { lat: 26.6503, lng: 50.1603 },
  "Khafji": { lat: 28.4333, lng: 48.4833 },
  
  // Asir Region
  "Abha": { lat: 18.2164, lng: 42.5053 },
  "Khamis Mushait": { lat: 18.3064, lng: 42.7289 },
  "Bisha": { lat: 19.9908, lng: 42.6069 },
  "Muhayil": { lat: 19.5647, lng: 42.0472 },
  
  // Qassim Region
  "Buraydah": { lat: 26.3260, lng: 43.9750 },
  "Unaizah": { lat: 26.0875, lng: 43.9914 },
  "Ar Rass": { lat: 25.8694, lng: 43.4975 },
  
  // Ha'il Region
  "Ha'il": { lat: 27.5219, lng: 41.6900 },
  
  // Tabuk Region
  "Tabuk": { lat: 28.3998, lng: 36.5781 },
  "Duba": { lat: 27.3500, lng: 35.6900 },
  "Al Wajh": { lat: 26.2456, lng: 36.4556 },
  "Tayma": { lat: 27.6333, lng: 38.4833 },
  "Umluj": { lat: 25.0219, lng: 37.2683 },
  
  // Najran Region
  "Najran": { lat: 17.4924, lng: 44.1277 },
  "Sharurah": { lat: 17.4667, lng: 47.1000 },
  
  // Al Jawf Region
  "Sakaka": { lat: 29.9697, lng: 40.2064 },
  "Dumat Al Jandal": { lat: 29.8117, lng: 39.8711 },
  "Qurayyat": { lat: 31.3328, lng: 37.3414 },
  
  // Northern Borders Region
  "Arar": { lat: 30.9753, lng: 41.0381 },
  "Rafha": { lat: 29.6264, lng: 43.5064 },
  "Turaif": { lat: 31.6725, lng: 38.6636 },
  
  // Jazan Region
  "Jazan": { lat: 16.8892, lng: 42.5511 },
  "Sabya": { lat: 17.1494, lng: 42.6247 },
  "Abu Arish": { lat: 16.9686, lng: 42.8358 },
  "Samtah": { lat: 16.5972, lng: 42.9433 },
  
  // Al Bahah Region
  "Al Bahah": { lat: 20.0129, lng: 41.4677 },
  "Baljurashi": { lat: 19.9167, lng: 41.6167 },
  "Al Mandaq": { lat: 20.2353, lng: 41.2592 },
};

// Get coordinates for a city, with fallback to Riyadh
export const getCityCoordinates = (city: string): { lat: number; lng: number } => {
  return CITY_COORDINATES[city] || { lat: 24.7136, lng: 46.6753 }; // Default to Riyadh
};