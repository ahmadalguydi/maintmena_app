import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Star, CheckCircle } from 'lucide-react';

interface AvatarBadgeProps {
  src?: string;
  fallback: string;
  size?: 'sm' | 'md' | 'lg';
  rating?: number;
  verified?: boolean;
  status?: 'online' | 'offline' | 'busy';
  className?: string;
}

export const AvatarBadge = ({ 
  src, 
  fallback, 
  size = 'md', 
  rating, 
  verified,
  status,
  className 
}: AvatarBadgeProps) => {
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-20 h-20'
  };

  const statusColors = {
    online: 'bg-success',
    offline: 'bg-muted-foreground',
    busy: 'bg-warning'
  };

  return (
    <div className={cn('relative inline-flex', className)}>
      <Avatar className={sizeClasses[size]}>
        <AvatarImage src={src} />
        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
          {fallback}
        </AvatarFallback>
      </Avatar>

      {/* Status Indicator */}
      {status && (
        <span 
          className={cn(
            'absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background',
            statusColors[status]
          )}
        />
      )}

      {/* Verified Badge */}
      {verified && (
        <div className="absolute -top-1 -right-1 bg-success rounded-full p-0.5">
          <CheckCircle className="w-4 h-4 text-white" fill="currentColor" />
        </div>
      )}

      {/* Rating Badge */}
      {rating && (
        <Badge 
          className="absolute -bottom-1 -right-1 px-1.5 py-0.5 bg-primary text-primary-foreground text-xs"
        >
          <Star className="w-3 h-3 mr-0.5 fill-current" />
          {rating.toFixed(1)}
        </Badge>
      )}
    </div>
  );
};
