import { Button } from '@/components/ui/button';

interface LanguageToggleProps {
  language: 'en' | 'ar';
  onToggle: () => void;
}

export const LanguageToggle = ({ language, onToggle }: LanguageToggleProps) => {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onToggle}
      className="text-sm"
    >
      {language === 'ar' ? 'English' : 'عربي'}
    </Button>
  );
};
