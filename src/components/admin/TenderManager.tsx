import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Plus, Edit2, Trash2, CheckCircle, Circle, X, Check, ChevronsUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { SAUDI_CITIES, COUNTRIES } from "@/lib/saudiCities";
import { cn } from "@/lib/utils";

interface ActionItem {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  completed: boolean;
  order: number;
}

interface Tender {
  id: string;
  tender_number: string;
  title: string;
  description: string;
  value_min: number;
  value_max: number;
  submission_deadline: string;
  location: string;
  requirements: string;
  category: string;
  status: string;
  action_items: ActionItem[];
}

export function TenderManager({ onUpdate, currentLanguage }: { onUpdate: () => void, currentLanguage: 'en' | 'ar' }) {
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [editing, setEditing] = useState<Tender | null>(null);
  const [cityOpen, setCityOpen] = useState(false);
  const [formData, setFormData] = useState({
    tender_number: "",
    title: "",
    description: "",
    value_min: "",
    value_max: "",
    submission_deadline: "",
    location: "",
    country: "",
    city: "",
    requirements: "",
    category: "",
    status: "open" as "open" | "closed" | "awarded" | "cancelled",
    source_link: "",
    action_items: [] as ActionItem[]
  });
  const [newActionItem, setNewActionItem] = useState({ title: "", description: "", priority: "medium" as ActionItem['priority'] });

  useEffect(() => {
    fetchTenders();
  }, []);

  const fetchTenders = async () => {
    const { data, error } = await supabase
      .from("tenders")
      .select("*")
      .order("submission_deadline", { ascending: false });

    if (!error && data) {
      setTenders(data.map(tender => ({
        ...tender,
        action_items: (tender.action_items as any) || []
      })));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const submitData = {
      ...formData,
      value_min: formData.value_min ? parseFloat(formData.value_min) : null,
      value_max: formData.value_max ? parseFloat(formData.value_max) : null
    };

    if (editing) {
      const { error } = await supabase
        .from("tenders")
        .update(submitData as any)
        .eq("id", editing.id);

      if (error) {
        toast({ title: currentLanguage === 'ar' ? 'خطأ في تحديث المناقصة' : 'Error updating tender', variant: "destructive" });
      } else {
        toast({ title: currentLanguage === 'ar' ? 'تم تحديث المناقصة بنجاح' : 'Tender updated successfully' });
        resetForm();
        fetchTenders();
        onUpdate();
      }
    } else {
      const { error } = await supabase
        .from("tenders")
        .insert([submitData as any]);

      if (error) {
        toast({ title: currentLanguage === 'ar' ? 'خطأ في إنشاء المناقصة' : 'Error creating tender', variant: "destructive" });
      } else {
        toast({ title: currentLanguage === 'ar' ? 'تم إنشاء المناقصة بنجاح' : 'Tender created successfully' });
        resetForm();
        fetchTenders();
        onUpdate();
      }
    }
  };

  const handleEdit = (tender: Tender) => {
    setEditing(tender);
    setFormData({
      tender_number: tender.tender_number,
      title: tender.title,
      description: tender.description,
      value_min: tender.value_min?.toString() || "",
      value_max: tender.value_max?.toString() || "",
      submission_deadline: new Date(tender.submission_deadline).toISOString().split('T')[0],
      location: tender.location || "",
      country: (tender as any).country || "",
      city: (tender as any).city || "",
      requirements: tender.requirements || "",
      category: tender.category || "",
      status: tender.status as any,
      source_link: (tender as any).source_link || "",
      action_items: tender.action_items || []
    });
  };

  const addActionItem = () => {
    if (!newActionItem.title.trim()) return;
    const item: ActionItem = {
      id: crypto.randomUUID(),
      title: newActionItem.title,
      description: newActionItem.description,
      priority: newActionItem.priority,
      completed: false,
      order: formData.action_items.length
    };
    setFormData({ ...formData, action_items: [...formData.action_items, item] });
    setNewActionItem({ title: "", description: "", priority: "medium" });
  };

  const removeActionItem = (id: string) => {
    setFormData({ ...formData, action_items: formData.action_items.filter(item => item.id !== id) });
  };

  const toggleActionItem = (id: string) => {
    setFormData({
      ...formData,
      action_items: formData.action_items.map(item =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm(currentLanguage === 'ar' ? 'هل أنت متأكد من حذف هذه المناقصة؟' : "Are you sure you want to delete this tender?")) return;

    const { error } = await supabase
      .from("tenders")
      .delete()
      .eq("id", id);

    if (error) {
      toast({ title: currentLanguage === 'ar' ? 'خطأ في حذف المناقصة' : 'Error deleting tender', variant: "destructive" });
    } else {
      toast({ title: currentLanguage === 'ar' ? 'تم حذف المناقصة بنجاح' : 'Tender deleted successfully' });
      fetchTenders();
      onUpdate();
    }
  };

  const resetForm = () => {
    setEditing(null);
    setFormData({
      tender_number: "",
      title: "",
      description: "",
      value_min: "",
      value_max: "",
      submission_deadline: "",
      location: "",
      country: "",
      city: "",
      requirements: "",
      category: "",
      status: "open",
      source_link: "",
      action_items: []
    });
    setNewActionItem({ title: "", description: "", priority: "medium" });
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">
          {editing ? "Edit Tender" : "Create New Tender"}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Tender Number</label>
              <Input
                value={formData.tender_number}
                onChange={(e) => setFormData({ ...formData, tender_number: e.target.value })}
                placeholder="e.g., TND-2025-001"
                disabled={!!editing}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Category</label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HVAC & Climate Control">HVAC & Climate Control</SelectItem>
                  <SelectItem value="Electrical Systems">Electrical Systems</SelectItem>
                  <SelectItem value="Plumbing & Water Systems">Plumbing & Water Systems</SelectItem>
                  <SelectItem value="Building Construction">Building Construction</SelectItem>
                  <SelectItem value="Civil Engineering">Civil Engineering</SelectItem>
                  <SelectItem value="Mechanical Engineering">Mechanical Engineering</SelectItem>
                  <SelectItem value="Facility Management">Facility Management</SelectItem>
                  <SelectItem value="Fire & Safety Systems">Fire & Safety Systems</SelectItem>
                  <SelectItem value="Security Systems">Security Systems</SelectItem>
                  <SelectItem value="Landscaping & Grounds">Landscaping & Grounds</SelectItem>
                  <SelectItem value="Cleaning & Janitorial">Cleaning & Janitorial</SelectItem>
                  <SelectItem value="Elevators & Escalators">Elevators & Escalators</SelectItem>
                  <SelectItem value="Road & Infrastructure">Road & Infrastructure</SelectItem>
                  <SelectItem value="IT & Telecommunications">IT & Telecommunications</SelectItem>
                  <SelectItem value="Energy & Power">Energy & Power</SelectItem>
                  <SelectItem value="Water Treatment">Water Treatment</SelectItem>
                  <SelectItem value="Waste Management">Waste Management</SelectItem>
                  <SelectItem value="Painting & Coating">Painting & Coating</SelectItem>
                  <SelectItem value="Roofing & Waterproofing">Roofing & Waterproofing</SelectItem>
                  <SelectItem value="Furniture & Fixtures">Furniture & Fixtures</SelectItem>
                  <SelectItem value="Medical Equipment">Medical Equipment</SelectItem>
                  <SelectItem value="Laboratory Equipment">Laboratory Equipment</SelectItem>
                  <SelectItem value="Kitchen Equipment">Kitchen Equipment</SelectItem>
                  <SelectItem value="Audio Visual Systems">Audio Visual Systems</SelectItem>
                  <SelectItem value="Renewable Energy">Renewable Energy</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Source Link</label>
              <Input
                type="url"
                value={formData.source_link}
                onChange={(e) => setFormData({ ...formData, source_link: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Title</label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter tender title"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Description</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              placeholder="Describe the tender requirements and scope"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Min Value (USD)</label>
              <Input
                type="number"
                value={formData.value_min}
                onChange={(e) => setFormData({ ...formData, value_min: e.target.value })}
                placeholder="Min value"
              />
              <p className="text-xs text-muted-foreground mt-1">Enter in USD</p>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Max Value (USD)</label>
              <Input
                type="number"
                value={formData.value_max}
                onChange={(e) => setFormData({ ...formData, value_max: e.target.value })}
                placeholder="Max value"
              />
              <p className="text-xs text-muted-foreground mt-1">Will be converted for users</p>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Submission Deadline</label>
              <Input
                type="date"
                value={formData.submission_deadline}
                onChange={(e) => setFormData({ ...formData, submission_deadline: e.target.value })}
                placeholder="Select deadline"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Country</label>
              <Select
                value={formData.country}
                onValueChange={(value) => {
                  setFormData({ ...formData, country: value, city: value === 'remote' ? '' : formData.city });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((country) => (
                    <SelectItem key={country.value} value={country.value}>
                      {country.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">City</label>
              <Popover open={cityOpen} onOpenChange={setCityOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={cityOpen}
                    disabled={formData.country !== 'saudi_arabia'}
                    className="w-full justify-between font-normal"
                  >
                    {formData.city
                      ? SAUDI_CITIES.find((city) => city === formData.city)
                      : formData.country === 'remote'
                        ? 'Not applicable'
                        : 'Select city'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search city..." />
                    <CommandList>
                      <CommandEmpty>No city found.</CommandEmpty>
                      <CommandGroup>
                        {SAUDI_CITIES.map((city) => (
                          <CommandItem
                            key={city}
                            value={city}
                            onSelect={(value) => {
                              setFormData({ ...formData, city: value });
                              setCityOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formData.city === city ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {city}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select
                value={formData.status}
                onValueChange={(value: any) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="awarded">Awarded</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Additional Location Details</label>
            <Input
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g., District, Street, Building"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Requirements</label>
            <Textarea
              value={formData.requirements}
              onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
              rows={3}
              placeholder="List key requirements"
            />
          </div>

          {/* Action Items Section */}
          <div className="space-y-3 pt-4 border-t">
            <h4 className="text-sm font-semibold">Action Items / Steps</h4>
            <div className="flex gap-2">
              <div className="flex-1 space-y-2">
                <Input
                  placeholder="Action item title"
                  value={newActionItem.title}
                  onChange={(e) => setNewActionItem({ ...newActionItem, title: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addActionItem())}
                />
                <Textarea
                  placeholder="Description (optional)"
                  value={newActionItem.description}
                  onChange={(e) => setNewActionItem({ ...newActionItem, description: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Select
                  value={newActionItem.priority}
                  onValueChange={(value: ActionItem['priority']) => setNewActionItem({ ...newActionItem, priority: value })}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="button" onClick={addActionItem} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </div>
            </div>

            {/* Action Items List */}
            {formData.action_items.length > 0 && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {formData.action_items.map((item) => (
                  <div key={item.id} className="flex items-start gap-2 p-2 bg-muted/30 rounded-lg">
                    <button
                      type="button"
                      onClick={() => toggleActionItem(item.id)}
                      className="mt-0.5 flex-shrink-0"
                    >
                      {item.completed ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <Circle className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${item.completed ? 'line-through text-muted-foreground' : ''}`}>
                        {item.title}
                      </p>
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                      )}
                      <Badge variant="outline" className="mt-1 text-xs">
                        {item.priority}
                      </Badge>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeActionItem(item.id)}
                      className="flex-shrink-0 h-8 w-8 p-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit">
              <Plus className="w-4 h-4 mr-2" />
              {editing ? "Update" : "Create"} Tender
            </Button>
            {editing && (
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </Card>

      <div className="space-y-4">
        {tenders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {currentLanguage === 'ar' ? 'لا توجد مناقصات' : 'No tenders found'}
          </div>
        ) : (
          tenders.map((tender) => (
            <Card key={tender.id} className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="font-semibold text-lg">{tender.title}</h4>
                  <p className="text-sm text-muted mt-1">
                    {tender.tender_number} • Deadline: {new Date(tender.submission_deadline).toLocaleDateString()} • {tender.status}
                  </p>
                  <p className="text-sm mt-2 line-clamp-2">{tender.description}</p>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(tender)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(tender.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
