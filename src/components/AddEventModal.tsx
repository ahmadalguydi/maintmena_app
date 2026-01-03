import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useCalendar } from '@/hooks/useCalendar';
import { format } from 'date-fns';

interface AddEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLanguage: 'en' | 'ar';
  initialDate?: Date;
}

export const AddEventModal = ({ isOpen, onClose, currentLanguage, initialDate }: AddEventModalProps) => {
  const { addEvent } = useCalendar();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_date: initialDate ? format(initialDate, "yyyy-MM-dd'T'HH:mm") : '',
    location: '',
    color: '#3b82f6'
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    await addEvent({
      title: formData.title,
      description: formData.description,
      event_date: new Date(formData.event_date).toISOString(),
      location: formData.location || undefined,
      event_type: 'manual',
      status: 'upcoming',
      color: formData.color
    });

    setLoading(false);
    setFormData({
      title: '',
      description: '',
      event_date: '',
      location: '',
      color: '#3b82f6'
    });
    onClose();
  };

  const colors = [
    { value: '#3b82f6', label: 'Blue' },
    { value: '#ef4444', label: 'Red' },
    { value: '#f59e0b', label: 'Orange' },
    { value: '#10b981', label: 'Green' },
    { value: '#8b5cf6', label: 'Purple' },
    { value: '#ec4899', label: 'Pink' }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-ink">
            {currentLanguage === 'ar' ? 'إضافة حدث جديد' : 'Add New Event'}
          </DialogTitle>
          <DialogDescription>
            {currentLanguage === 'ar' 
              ? 'أضف حدثًا جديدًا إلى تقويمك' 
              : 'Add a new event to your calendar'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title" className="text-ink">
              {currentLanguage === 'ar' ? 'العنوان' : 'Title'}
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder={currentLanguage === 'ar' ? 'عنوان الحدث' : 'Event title'}
              required
            />
          </div>

          <div>
            <Label htmlFor="description" className="text-ink">
              {currentLanguage === 'ar' ? 'الوصف' : 'Description'}
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={currentLanguage === 'ar' ? 'وصف الحدث (اختياري)' : 'Event description (optional)'}
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="event_date" className="text-ink">
              {currentLanguage === 'ar' ? 'التاريخ والوقت' : 'Date & Time'}
            </Label>
            <Input
              id="event_date"
              type="datetime-local"
              value={formData.event_date}
              onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="location" className="text-ink">
              {currentLanguage === 'ar' ? 'الموقع' : 'Location'}
            </Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder={currentLanguage === 'ar' ? 'موقع الحدث (اختياري)' : 'Event location (optional)'}
            />
          </div>

          <div>
            <Label className="text-ink mb-2 block">
              {currentLanguage === 'ar' ? 'اللون' : 'Color'}
            </Label>
            <div className="flex gap-2">
              {colors.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, color: color.value })}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    formData.color === color.value ? 'border-ink scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.label}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              {currentLanguage === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading 
                ? (currentLanguage === 'ar' ? 'جاري الحفظ...' : 'Saving...') 
                : (currentLanguage === 'ar' ? 'حفظ' : 'Save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};