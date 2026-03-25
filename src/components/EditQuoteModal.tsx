import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Quote {
  id: string;
  request_id: string;
  price: number;
  estimated_duration: string;
  proposal: string;
  cover_letter?: string;
  technical_approach?: string;
  team_experience?: string;
  certifications?: string;
  timeline_details?: string;
  client_references?: string;
  status: string;
}

interface EditQuoteModalProps {
  quote: Quote | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface QuoteFormData {
  price: number;
  estimated_duration: string;
  proposal: string;
  cover_letter?: string;
  technical_approach?: string;
  team_experience?: string;
  certifications?: string;
  timeline_details?: string;
  client_references?: string;
}

export default function EditQuoteModal({ quote, isOpen, onClose, onSuccess }: EditQuoteModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<QuoteFormData>();

  useEffect(() => {
    if (quote && isOpen) {
      reset({
        price: quote.price,
        estimated_duration: quote.estimated_duration,
        proposal: quote.proposal,
        cover_letter: quote.cover_letter || '',
        technical_approach: quote.technical_approach || '',
        team_experience: quote.team_experience || '',
        certifications: quote.certifications || '',
        timeline_details: quote.timeline_details || '',
        client_references: quote.client_references || ''
      });
    }
  }, [quote, isOpen, reset]);

  const onSubmit = async (data: QuoteFormData) => {
    if (!quote) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('quote_submissions')
        .update({
          price: data.price,
          estimated_duration: data.estimated_duration,
          proposal: data.proposal,
          cover_letter: data.cover_letter,
          technical_approach: data.technical_approach,
          team_experience: data.team_experience,
          certifications: data.certifications,
          timeline_details: data.timeline_details,
          client_references: data.client_references,
          updated_at: new Date().toISOString()
        })
        .eq('id', quote.id);

      if (error) throw error;

      toast.success('Quote updated successfully');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating quote:', error);
      toast.error('Failed to update quote');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Quote</DialogTitle>
          <DialogDescription>
            Update your quote details. The buyer will see that this quote was modified.
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Editing will update the submission timestamp. The buyer will be notified of the changes.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Price */}
          <div className="space-y-2">
            <Label htmlFor="price">Price (SAR) *</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              {...register('price', { 
                required: 'Price is required',
                min: { value: 0, message: 'Price must be positive' }
              })}
            />
            {errors.price && (
              <p className="text-sm text-destructive">{errors.price.message}</p>
            )}
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label htmlFor="estimated_duration">Estimated Duration *</Label>
            <Input
              id="estimated_duration"
              type="text"
              placeholder="e.g., 2 weeks, 1 month"
              {...register('estimated_duration', { 
                required: 'Duration is required'
              })}
            />
            {errors.estimated_duration && (
              <p className="text-sm text-destructive">{errors.estimated_duration.message}</p>
            )}
          </div>

          {/* Proposal */}
          <div className="space-y-2">
            <Label htmlFor="proposal">Proposal *</Label>
            <Textarea
              id="proposal"
              rows={4}
              placeholder="Describe your approach to this project"
              {...register('proposal', { 
                required: 'Proposal is required',
                minLength: { value: 50, message: 'Proposal must be at least 50 characters' }
              })}
            />
            {errors.proposal && (
              <p className="text-sm text-destructive">{errors.proposal.message}</p>
            )}
          </div>

          {/* Cover Letter */}
          <div className="space-y-2">
            <Label htmlFor="cover_letter">Cover Letter</Label>
            <Textarea
              id="cover_letter"
              rows={3}
              placeholder="Optional cover letter"
              {...register('cover_letter')}
            />
          </div>

          {/* Technical Approach */}
          <div className="space-y-2">
            <Label htmlFor="technical_approach">Technical Approach</Label>
            <Textarea
              id="technical_approach"
              rows={3}
              placeholder="Describe your technical approach"
              {...register('technical_approach')}
            />
          </div>

          {/* Team Experience */}
          <div className="space-y-2">
            <Label htmlFor="team_experience">Team Experience</Label>
            <Textarea
              id="team_experience"
              rows={3}
              placeholder="Describe your team's experience"
              {...register('team_experience')}
            />
          </div>

          {/* Certifications */}
          <div className="space-y-2">
            <Label htmlFor="certifications">Certifications</Label>
            <Textarea
              id="certifications"
              rows={2}
              placeholder="List relevant certifications"
              {...register('certifications')}
            />
          </div>

          {/* Timeline Details */}
          <div className="space-y-2">
            <Label htmlFor="timeline_details">Timeline Details</Label>
            <Textarea
              id="timeline_details"
              rows={3}
              placeholder="Provide detailed timeline"
              {...register('timeline_details')}
            />
          </div>

          {/* Client References */}
          <div className="space-y-2">
            <Label htmlFor="client_references">Client References</Label>
            <Textarea
              id="client_references"
              rows={3}
              placeholder="Provide client references"
              {...register('client_references')}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Update Quote
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
