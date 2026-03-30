/**
 * Utility functions for smart time formatting and greetings
 */

export function smartTimeAgo(dateInput: Date | string | number, currentLanguage: 'en' | 'ar'): string {
  const date = new Date(dateInput);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return currentLanguage === 'ar' ? 'الآن' : 'Just now';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return currentLanguage === 'ar' ? `منذ ${diffInMinutes} دقيقة` : `${diffInMinutes}m ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return currentLanguage === 'ar' ? `منذ ${diffInHours} ساعة` : `${diffInHours}h ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return currentLanguage === 'ar' ? `منذ ${diffInDays} يوم` : `${diffInDays}d ago`;
  }

  return date.toLocaleDateString(currentLanguage === 'ar' ? 'ar-SA' : 'en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function getGreeting(currentLanguage: 'en' | 'ar'): string {
  const hour = new Date().getHours();

  if (hour < 12) {
    return currentLanguage === 'ar' ? 'صباح الخير' : 'Good morning';
  } else if (hour < 18) {
    return currentLanguage === 'ar' ? 'مساء الخير' : 'Good afternoon';
  } else {
    return currentLanguage === 'ar' ? 'مساء الخير' : 'Good evening';
  }
}
