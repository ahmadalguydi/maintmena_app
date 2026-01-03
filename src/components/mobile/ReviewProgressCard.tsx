import { Star, Trophy, Zap, Award } from 'lucide-react';
import { SoftCard } from './SoftCard';
import { Progress } from '@/components/ui/progress';

interface ReviewProgressCardProps {
  currentReviews: number;
  targetReviews?: number;
  hasEliteBadge?: boolean;
  hasFoundingMemberBadge?: boolean;
  currentLanguage: 'en' | 'ar';
}

export function ReviewProgressCard({
  currentReviews,
  targetReviews = 10,
  hasEliteBadge = false,
  hasFoundingMemberBadge = false,
  currentLanguage
}: ReviewProgressCardProps) {
  const isRtl = currentLanguage === 'ar';
  const progress = Math.min((currentReviews / targetReviews) * 100, 100);
  const remaining = Math.max(targetReviews - currentReviews, 0);

  const content = {
    en: {
      title: 'Race to Elite Status',
      subtitle: 'Get 10 verified reviews during beta to unlock:',
      rewards: ['Elite Pro badge FREE for 1 year', 'Founding Member badge for LIFE'],
      progress: `${currentReviews}/${targetReviews} reviews`,
      remaining: `${remaining} more to go!`,
      achieved: 'You earned the Elite Pro badge!',
      achievedSubtitle: 'Worth SAR 199/month - FREE for you!',
      foundingMember: '+ Founding Member for Life!',
      normalValue: 'Normally SAR 199/month',
      freeForYou: 'FREE for early adopters'
    },
    ar: {
      title: 'سباق للوصول للنخبة',
      subtitle: 'احصل على ١٠ تقييمات موثقة خلال البيتا لفتح:',
      rewards: ['شارة النخبة مجاناً لمدة سنة', 'شارة المؤسس مدى الحياة'],
      progress: `${currentReviews}/${targetReviews} تقييمات`,
      remaining: `${remaining} متبقي!`,
      achieved: 'حصلت على شارة محترف النخبة!',
      achievedSubtitle: 'قيمتها ١٩٩ ريال/شهر - مجاناً لك!',
      foundingMember: '+ شارة المؤسس مدى الحياة!',
      normalValue: 'عادةً ١٩٩ ريال/شهر',
      freeForYou: 'مجاناً للمتبنين الأوائل'
    }
  };

  const t = content[currentLanguage];

  if (hasEliteBadge) {
    return (
      <SoftCard className="bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-100 dark:from-amber-900/30 dark:via-yellow-900/20 dark:to-amber-900/30 border-2 border-amber-400">
        <div className={`space-y-3 ${isRtl ? 'text-right' : ''}`} dir={isRtl ? 'rtl' : 'ltr'}>
          <div className={`flex items-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-lg">
              <Trophy className="w-8 h-8 text-amber-950" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-amber-800 dark:text-amber-300">{t.achieved}</p>
              <p className="text-sm text-amber-600 dark:text-amber-400">{t.achievedSubtitle}</p>
              {hasFoundingMemberBadge && (
                <div className={`flex items-center gap-1 mt-1 ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <Award size={14} className="text-purple-600" />
                  <p className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                    {t.foundingMember}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </SoftCard>
    );
  }

  return (
    <SoftCard className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50 border border-slate-200 dark:border-slate-700">
      <div className={`space-y-4 ${isRtl ? 'text-right' : ''}`} dir={isRtl ? 'rtl' : 'ltr'}>
        <div className={`flex items-start gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-md animate-pulse">
            <Zap className="w-6 h-6 text-amber-950" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-foreground">{t.title}</p>
            <p className="text-sm text-muted-foreground">{t.subtitle}</p>
            <ul className="mt-2 space-y-1">
              {t.rewards.map((reward, i) => (
                <li key={i} className={`flex items-center gap-2 text-xs ${isRtl ? 'flex-row-reverse' : ''}`}>
                  {i === 0 ? (
                    <Trophy size={12} className="text-amber-500" />
                  ) : (
                    <Award size={12} className="text-purple-500" />
                  )}
                  <span className={i === 0 ? 'text-amber-700 dark:text-amber-400' : 'text-purple-700 dark:text-purple-400'}>
                    {reward}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="space-y-2">
          <div className={`flex justify-between text-sm ${isRtl ? 'flex-row-reverse' : ''}`}>
            <span className="font-medium">{t.progress}</span>
            <span className="text-primary font-semibold">{t.remaining}</span>
          </div>
          <Progress value={progress} className="h-3 bg-slate-200 dark:bg-slate-700">
            <div
              className="h-full bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </Progress>
          <div className={`flex items-center gap-1 justify-center ${isRtl ? 'flex-row-reverse' : ''}`}>
            {Array.from({ length: targetReviews }).map((_, i) => (
              <Star
                key={i}
                className={`w-4 h-4 transition-all duration-300 ${i < currentReviews
                    ? 'text-amber-400 fill-amber-400 scale-110'
                    : 'text-slate-300 dark:text-slate-600'
                  }`}
              />
            ))}
          </div>
        </div>

        <div className={`flex items-center justify-between text-xs pt-2 border-t border-slate-200 dark:border-slate-700 ${isRtl ? 'flex-row-reverse' : ''}`}>
          <span className="text-muted-foreground line-through">{t.normalValue}</span>
          <span className="text-emerald-600 font-semibold">{t.freeForYou}</span>
        </div>
      </div>
    </SoftCard>
  );
}