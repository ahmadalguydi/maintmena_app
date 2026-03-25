import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, X, Filter } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface BookingFiltersProps {
  onFilterChange: (filters: BookingFilterState) => void;
}

export interface BookingFilterState {
  search: string;
  status: string;
  urgency: string;
  serviceCategory: string;
  dateFrom: string;
  dateTo: string;
  minBudget: string;
  maxBudget: string;
}

export const BookingFilters = ({ onFilterChange }: BookingFiltersProps) => {
  const [filters, setFilters] = useState<BookingFilterState>({
    search: '',
    status: 'all',
    urgency: 'all',
    serviceCategory: 'all',
    dateFrom: '',
    dateTo: '',
    minBudget: '',
    maxBudget: ''
  });

  const [isOpen, setIsOpen] = useState(false);

  const handleFilterUpdate = (key: keyof BookingFilterState, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const clearedFilters: BookingFilterState = {
      search: '',
      status: 'all',
      urgency: 'all',
      serviceCategory: 'all',
      dateFrom: '',
      dateTo: '',
      minBudget: '',
      maxBudget: ''
    };
    setFilters(clearedFilters);
    onFilterChange(clearedFilters);
  };

  const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'status' || key === 'urgency' || key === 'serviceCategory') {
      return value !== 'all';
    }
    return value !== '';
  }).length;

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by service, location, or description..."
          value={filters.search}
          onChange={(e) => handleFilterUpdate('search', e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Select value={filters.status} onValueChange={(v) => handleFilterUpdate('status', v)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="declined">Declined</SelectItem>
            <SelectItem value="counter_proposed">Counter Proposed</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.urgency} onValueChange={(v) => handleFilterUpdate('urgency', v)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Urgency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Urgency</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="flexible">Flexible</SelectItem>
          </SelectContent>
        </Select>

        {/* Advanced Filters Popover */}
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="w-4 h-4" />
              More Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1 px-1 min-w-[20px]">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Service Category</h4>
                <Select value={filters.serviceCategory} onValueChange={(v) => handleFilterUpdate('serviceCategory', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Services" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Services</SelectItem>
                    <SelectItem value="ac_repair">AC Repair</SelectItem>
                    <SelectItem value="plumbing">Plumbing</SelectItem>
                    <SelectItem value="electrical">Electrical</SelectItem>
                    <SelectItem value="painting">Painting</SelectItem>
                    <SelectItem value="cleaning">Cleaning</SelectItem>
                    <SelectItem value="fitout">Fit-Out</SelectItem>
                    <SelectItem value="mep">MEP</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <h4 className="font-medium mb-2">Date Range</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">From</label>
                    <Input
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) => handleFilterUpdate('dateFrom', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">To</label>
                    <Input
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) => handleFilterUpdate('dateTo', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Budget Range</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Min</label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={filters.minBudget}
                      onChange={(e) => handleFilterUpdate('minBudget', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Max</label>
                    <Input
                      type="number"
                      placeholder="No limit"
                      value={filters.maxBudget}
                      onChange={(e) => handleFilterUpdate('maxBudget', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-2">
            <X className="w-4 h-4" />
            Clear All
          </Button>
        )}
      </div>

      {/* Active Filter Tags */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.status !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Status: {filters.status}
              <X 
                className="w-3 h-3 cursor-pointer" 
                onClick={() => handleFilterUpdate('status', 'all')}
              />
            </Badge>
          )}
          {filters.urgency !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Urgency: {filters.urgency}
              <X 
                className="w-3 h-3 cursor-pointer" 
                onClick={() => handleFilterUpdate('urgency', 'all')}
              />
            </Badge>
          )}
          {filters.serviceCategory !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Service: {filters.serviceCategory}
              <X 
                className="w-3 h-3 cursor-pointer" 
                onClick={() => handleFilterUpdate('serviceCategory', 'all')}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};
