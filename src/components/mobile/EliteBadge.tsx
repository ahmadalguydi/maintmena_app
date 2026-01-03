import { Award, Star, Shield, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EliteBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  currentLanguage?: 'en' | 'ar';
  className?: string;
}

export function EliteBadge({ 
  size = 'md', 
  showLabel = true,
  currentLanguage = 'en',
  className 
}: EliteBadgeProps) {
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };
  
  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };
  
  const label = currentLanguage === 'ar' ? 'محترف نخبة' : 'Elite Pro';
  
  return (
    <div className={cn(
      'inline-flex items-center gap-1.5 px-2 py-1 rounded-full',
      'bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400',
      'text-amber-950 font-semibold shadow-lg',
      'animate-shimmer bg-[length:200%_100%]',
      className
    )}>
      <Crown className={cn(sizeClasses[size], 'fill-current')} />
      {showLabel && (
        <span className={textSizes[size]}>{label}</span>
      )}
    </div>
  );
}

interface FoundingMemberBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  currentLanguage?: 'en' | 'ar';
  className?: string;
}

export function FoundingMemberBadge({ 
  size = 'md', 
  showLabel = true,
  currentLanguage = 'en',
  className 
}: FoundingMemberBadgeProps) {
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };
  
  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };
  
  const label = currentLanguage === 'ar' ? 'عضو مؤسس' : 'Founding Member';
  
  return (
    <div className={cn(
      'inline-flex items-center gap-1.5 px-2 py-1 rounded-full',
      'bg-gradient-to-r from-purple-500 via-violet-500 to-purple-500',
      'text-white font-semibold shadow-lg',
      className
    )}>
      <Star className={cn(sizeClasses[size], 'fill-current')} />
      {showLabel && (
        <span className={textSizes[size]}>{label}</span>
      )}
    </div>
  );
}

interface VerifiedBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function VerifiedBadge({ size = 'md', className }: VerifiedBadgeProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };
  
  return (
    <div className={cn(
      'inline-flex items-center justify-center rounded-full',
      'bg-blue-500 text-white',
      className
    )}>
      <Shield className={cn(sizeClasses[size], 'p-0.5')} />
    </div>
  );
}
