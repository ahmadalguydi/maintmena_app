import { GradientHeader } from '@/components/mobile/GradientHeader';
import { Body, Heading3 } from '@/components/mobile/Typography';

interface SubscriptionProps {
  currentLanguage: 'en' | 'ar';
}

export const Subscription = ({ currentLanguage }: SubscriptionProps) => {
  const isArabic = currentLanguage === 'ar';

  return (
    <div className="min-h-app bg-background pb-24" dir={isArabic ? 'rtl' : 'ltr'}>
      <GradientHeader title={isArabic ? 'الحساب' : 'Account'} />
      <div className="px-6 py-12 text-center">
        <Heading3 lang={currentLanguage} className="mb-3">
          {isArabic ? 'لا توجد اشتراكات' : 'No subscriptions'}
        </Heading3>
        <Body lang={currentLanguage} className="text-muted-foreground">
          {isArabic
            ? 'يعتمد التطبيق على طلبات الصيانة المباشرة: يرسل المشتري الطلب، يقبله الفني، ثم يبدأ العمل.'
            : 'MaintMENA uses direct maintenance requests: the buyer submits a request, a provider accepts it, and the job starts.'}
        </Body>
      </div>
    </div>
  );
};
