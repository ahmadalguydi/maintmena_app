import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Save } from 'lucide-react';

interface BindingTermsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  contractId: string;
  bindingTerms: any;
  isBuyer: boolean;
  onUpdate: () => void;
  currentLanguage?: 'en' | 'ar';
}

export const BindingTermsDrawer = ({
  isOpen,
  onClose,
  contractId,
  bindingTerms,
  isBuyer,
  onUpdate,
  currentLanguage = 'en'
}: BindingTermsDrawerProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    start_date: bindingTerms?.start_date || '',
    completion_date: bindingTerms?.completion_date || '',
    warranty_days: bindingTerms?.warranty_days || 90,
    access_hours: bindingTerms?.access_hours || '8 AM - 5 PM',
    cleanup_disposal: bindingTerms?.cleanup_disposal ?? true,
    materials_by: bindingTerms?.materials_by || 'contractor',
    penalty_rate_per_day: bindingTerms?.penalty_rate_per_day || '',
    payment_method: bindingTerms?.payment_method || 'cash'
  });

  const handleSave = async () => {
    setLoading(true);
    try {
      // Update binding terms
      const { error } = await supabase
        .from('binding_terms')
        .update(formData)
        .eq('contract_id', contractId);

      if (error) throw error;

      // Increment contract version
      const { data: contract } = await supabase
        .from('contracts')
        .select('version')
        .eq('id', contractId)
        .single();

      await supabase
        .from('contracts')
        .update({ 
          version: (contract?.version || 1) + 1,
          status: isBuyer ? 'pending_seller' : 'pending_buyer'
        })
        .eq('id', contractId);

      toast.success('Terms updated successfully!');
      onUpdate();
      onClose();
    } catch (error: any) {
      toast.error('Failed to update terms: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {isBuyer ? 'Edit Binding Terms' : 'Propose Edits to Terms'}
          </SheetTitle>
          <SheetDescription>
            {isBuyer 
              ? 'Modify contract terms. The seller will need to accept changes.' 
              : 'Suggest changes to contract terms. The buyer must approve.'}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Timeline */}
          <div className="space-y-4">
            <h3 className="font-semibold">Timeline</h3>
            
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="completion_date">Completion Date</Label>
              <Input
                id="completion_date"
                type="date"
                value={formData.completion_date}
                onChange={(e) => setFormData(prev => ({ ...prev, completion_date: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="warranty_days">Warranty (Days)</Label>
              <Input
                id="warranty_days"
                type="number"
                value={formData.warranty_days}
                onChange={(e) => setFormData(prev => ({ ...prev, warranty_days: parseInt(e.target.value) }))}
              />
            </div>
          </div>


          {/* Payment Method */}
          <div className="space-y-4">
            <h3 className="font-semibold">Payment Method</h3>
            <Select 
              value={formData.payment_method} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, payment_method: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">💵 {currentLanguage === 'ar' ? 'كاش' : 'Cash'}</SelectItem>
                <SelectItem value="online_maintmena">💳 {currentLanguage === 'ar' ? 'اونلاين' : 'Online'}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {formData.payment_method === 'online_maintmena' 
                ? 'Secure payment through MaintMENA with escrow protection'
                : 'Direct cash payment to service provider'}
            </p>
          </div>

          {/* Access & Work Conditions */}
          <div className="space-y-4">
            <h3 className="font-semibold">Work Conditions</h3>
            
            <div className="space-y-2">
              <Label htmlFor="access_hours">Access Hours</Label>
              <Input
                id="access_hours"
                value={formData.access_hours}
                onChange={(e) => setFormData(prev => ({ ...prev, access_hours: e.target.value }))}
                placeholder="e.g., 8 AM - 5 PM weekdays"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="materials_by">Materials Provided By</Label>
              <Select 
                value={formData.materials_by}
                onValueChange={(v) => setFormData(prev => ({ ...prev, materials_by: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contractor">Contractor</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="shared">Shared</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="cleanup">Site Cleanup & Disposal</Label>
              <Switch
                id="cleanup"
                checked={formData.cleanup_disposal}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, cleanup_disposal: checked }))}
              />
            </div>
          </div>

          {/* Penalties (Optional) */}
          <div className="space-y-4">
            <h3 className="font-semibold">Penalties (Optional)</h3>
            
            <div className="space-y-2">
              <Label htmlFor="penalty_rate">Penalty Rate (SAR/day)</Label>
              <Input
                id="penalty_rate"
                type="number"
                value={formData.penalty_rate_per_day}
                onChange={(e) => setFormData(prev => ({ ...prev, penalty_rate_per_day: parseFloat(e.target.value) }))}
                placeholder="Leave empty for no penalties"
              />
              <p className="text-xs text-muted-foreground">
                Late completion penalty. Max 10% of contract value.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading} className="flex-1 gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isBuyer ? 'Save Changes' : 'Propose Changes'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
