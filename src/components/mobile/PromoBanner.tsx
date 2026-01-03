import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { useState, useEffect } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';

interface PromoBannerItem {
  id: string;
  title: string;
  description: string;
  ctaText: string;
  ctaAction: () => void;
  gradient: string;
  image?: string;
}

interface PromoBannerProps {
  items: PromoBannerItem[];
  currentLanguage?: 'en' | 'ar';
}

export const PromoBanner = ({ items, currentLanguage = 'en' }: PromoBannerProps) => {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: true,
      direction: currentLanguage === 'ar' ? 'rtl' : 'ltr'
    },
    [Autoplay({ delay: 5000, stopOnInteraction: false })]
  );
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => {
      setSelectedIndex(emblaApi.selectedScrollSnap());
    };

    emblaApi.on('select', onSelect);
    onSelect();

    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi]);

  const scrollPrev = () => emblaApi?.scrollPrev();
  const scrollNext = () => emblaApi?.scrollNext();

  return (
    <div className="relative">
      <div className="overflow-hidden rounded-3xl" ref={emblaRef}>
        <div className="flex">
          {items.map((item, index) => (
            <div key={item.id} className="flex-[0_0_100%] min-w-0 px-1">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  'relative overflow-hidden rounded-3xl',
                  'min-h-[160px] p-6',
                  item.gradient
                )}
              >
                {/* Content */}
                <div className="relative z-10 flex flex-col justify-between h-full">
                  <div>
                    <h3 className="text-xl font-bold text-foreground mb-2">
                      {item.title}
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-[60%]">
                      {item.description}
                    </p>
                  </div>

                  {/* CTA Button */}
                  <button
                    onClick={item.ctaAction}
                    className={cn(
                      'mt-4 self-start px-6 py-2.5 rounded-full',
                      'bg-foreground/10 hover:bg-foreground/20',
                      'text-foreground font-semibold text-sm',
                      'transition-all duration-200',
                      'active:scale-95',
                      'border border-foreground/10'
                    )}
                  >
                    {item.ctaText}
                  </button>
                </div>

                {/* Image with gradient fade */}
                {item.image && (
                  <div className="absolute right-0 top-0 bottom-0 w-1/2">
                    <div className={cn(
                      'absolute inset-0 z-10',
                      currentLanguage === 'ar'
                        ? 'bg-gradient-to-l from-transparent to-current'
                        : 'bg-gradient-to-r from-transparent to-current'
                    )} />
                    <img
                      src={item.image}
                      alt={item.title}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  </div>
                )}
              </motion.div>
            </div>
          ))}
        </div>
      </div>

      {/* Dots Indicator */}
      {items.length > 1 && (
        <div className="flex justify-center gap-2 mt-3">
          {items.map((_, index) => (
            <button
              key={index}
              onClick={() => emblaApi?.scrollTo(index)}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                index === selectedIndex
                  ? 'w-6 bg-primary'
                  : 'w-1.5 bg-muted-foreground/30'
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
};
