import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { SAUDI_CITIES_BILINGUAL, searchCities, type CityData } from '@/lib/saudiCities';

interface CityComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  currentLanguage: 'en' | 'ar';
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const CityCombobox = ({
  value,
  onValueChange,
  currentLanguage,
  placeholder,
  disabled = false,
  className
}: CityComboboxProps) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const defaultPlaceholder = currentLanguage === 'ar' ? 'اختر المدينة...' : 'Select city...';
  const searchPlaceholder = currentLanguage === 'ar' ? 'ابحث عن مدينة...' : 'Search city...';
  const noResultsText = currentLanguage === 'ar' ? 'لا توجد نتائج' : 'No city found';

  // Filter cities based on search query (includes alias search)
  const filteredCities = useMemo(() => {
    if (!searchQuery.trim()) {
      return SAUDI_CITIES_BILINGUAL; // Already sorted by popularity
    }
    return searchCities(searchQuery, currentLanguage);
  }, [searchQuery, currentLanguage]);

  // Find the selected city's display name
  const selectedCity = SAUDI_CITIES_BILINGUAL.find(city => city.en === value);
  const displayValue = selectedCity
    ? (currentLanguage === 'ar' ? selectedCity.ar : selectedCity.en)
    : '';

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal h-10 border-input bg-background",
            !value && "text-muted-foreground",
            className
          )}
        >
          <div className="flex items-center gap-2 truncate">
            <MapPin className="h-4 w-4 shrink-0 opacity-50" />
            <span className={cn("truncate", currentLanguage === 'ar' && 'font-ar-body')}>
              {displayValue || placeholder || defaultPlaceholder}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0 bg-background border border-input z-50 pointer-events-auto"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command shouldFilter={false} className="max-h-[50vh]">
          <CommandInput
            placeholder={searchPlaceholder}
            value={searchQuery}
            onValueChange={setSearchQuery}
            className={currentLanguage === 'ar' ? 'font-ar-body text-right' : ''}
          />
          <CommandList className="max-h-[300px] overflow-y-auto touch-pan-y">
            <CommandEmpty>{noResultsText}</CommandEmpty>
            <CommandGroup>
              {filteredCities.map((city) => (
                <CommandItem
                  key={city.en}
                  value={city.en}
                  onSelect={() => {
                    onValueChange(city.en);
                    setOpen(false);
                    setSearchQuery('');
                  }}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 flex-shrink-0",
                      value === city.en ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className={cn("flex-1", currentLanguage === 'ar' ? 'font-ar-body' : '')}>
                    {currentLanguage === 'ar' ? city.ar : city.en}
                  </span>
                  {currentLanguage === 'ar' && (
                    <span className="text-xs text-muted-foreground mr-2">({city.en})</span>
                  )}
                  {currentLanguage === 'en' && city.ar && (
                    <span className="text-xs text-muted-foreground font-ar-body">({city.ar})</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};