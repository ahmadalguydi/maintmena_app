export const formatDuration = (days: number | string | null | undefined, lang: 'en' | 'ar'): string => {
  // Handle null/undefined - return "Not Specified"
  if (days === null || days === undefined || days === '') {
    return lang === 'ar' ? 'غير محدد' : 'Not specified';
  }

  // Handle string input (e.g., "5 days")
  const numDays = typeof days === 'string' ? parseInt(days) : days;

  if (isNaN(numDays)) {
    // If it's "Not specified", translate it
    if (String(days).toLowerCase() === 'not specified') {
      return lang === 'ar' ? 'غير محدد' : 'Not specified';
    }
    return String(days);
  }

  if (lang === 'ar') {
    if (numDays === 1 || numDays > 10) return `${numDays} يوم`;
    if (numDays === 2) return 'يومين';
    return `${numDays} أيام`;
  }

  return numDays === 1 ? `${numDays} day` : `${numDays} days`;
};
