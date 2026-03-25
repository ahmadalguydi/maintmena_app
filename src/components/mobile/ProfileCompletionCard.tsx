import { SoftCard } from './SoftCard';
import { Progress } from '@/components/ui/progress';
import { Heading3, Body, Caption } from './Typography';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProfileCompletionCardProps {
  currentLanguage: 'en' | 'ar';
  completionPercentage: number;
  missingFields: string[];
  className?: string;
}

export const ProfileCompletionCard = ({
  currentLanguage,
  completionPercentage,
  missingFields,
  className
}: ProfileCompletionCardProps) => {
  const content = {
    ar: {
      title: 'إكمال الملف الشخصي',
      complete: 'مكتمل',
      tip: 'الملفات الكاملة تحصل على فرص أكثر بنسبة 3× ',
      missing: 'ينقصك:'
    },
    en: {
      title: 'Profile Completion',
      complete: 'Complete',
      tip: 'Complete profiles get 3× more opportunities',
      missing: 'Missing:'
    }
  };

  const t = content[currentLanguage];
  const isComplete = completionPercentage >= 100;

  return (
    <SoftCard className={cn('bg-gradient-to-br from-primary/5 to-accent/5', className)}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Heading3 lang={currentLanguage}>{t.title}</Heading3>
          <div className={cn(
            'px-3 py-1 rounded-full text-sm font-semibold',
            isComplete ? 'bg-green-500/10 text-green-600' : 'bg-yellow-500/10 text-yellow-600',
            currentLanguage === 'ar' ? 'font-ar-body' : 'font-body'
          )}>
            {completionPercentage}% {t.complete}
          </div>
        </div>

        <Progress value={completionPercentage} className="h-2" />

        {isComplete ? (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle size={16} />
            <Caption lang={currentLanguage} className="text-green-600 font-semibold">
              {t.tip}
            </Caption>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-yellow-600">
              <AlertCircle size={16} />
              <Caption lang={currentLanguage} className="text-yellow-600 font-semibold">
                {t.tip}
              </Caption>
            </div>
            
            {missingFields.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border/50">
                <Caption lang={currentLanguage} className="text-muted-foreground mb-2">
                  {t.missing}
                </Caption>
                <ul className="space-y-1">
                  {missingFields.slice(0, 3).map((field, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
                      <Caption lang={currentLanguage} className="text-muted-foreground">
                        {field}
                      </Caption>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </SoftCard>
  );
};