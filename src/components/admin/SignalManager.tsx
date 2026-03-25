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

interface Signal {
  id: string;
  company_name: string;
  signal_type: string;
  description: string;
  urgency: string;
  estimated_value: string;
  deadline: string;
  location: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  status: string;
  action_items: ActionItem[];
}

export function SignalManager({ onUpdate }: { onUpdate: () => void }) {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [editing, setEditing] = useState<Signal | null>(null);
  const [cityOpen, setCityOpen] = useState(false);
  const [formData, setFormData] = useState({
    company_name: "",
    signal_type: "",
    description: "",
    urgency: "medium" as "low" | "medium" | "high" | "critical",
    estimated_value: "",
    deadline: "",
    location: "",
    country: "",
    city: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    status: "active" as "active" | "expired" | "archived",
    source_link: "",
    action_items: [] as ActionItem[]
  });
  const [newActionItem, setNewActionItem] = useState({ title: "", description: "", priority: "medium" as ActionItem['priority'] });

  useEffect(() => {
    fetchSignals();
  }, []);

  const fetchSignals = async () => {
    const { data, error } = await supabase
      .from("signals")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setSignals(data.map(signal => ({
        ...signal,
        action_items: (signal.action_items as any) || []
      })));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editing) {
      const { error } = await supabase
        .from("signals")
        .update(formData as any)
        .eq("id", editing.id);

      if (error) {
        toast({ title: "Error updating signal", variant: "destructive" });
      } else {
        toast({ title: "Signal updated successfully" });
        resetForm();
        fetchSignals();
        onUpdate();
      }
    } else {
      const { error } = await supabase
        .from("signals")
        .insert([formData as any]);

      if (error) {
        toast({ title: "Error creating signal", variant: "destructive" });
      } else {
        toast({ title: "Signal created successfully" });
        resetForm();
        fetchSignals();
        onUpdate();
      }
    }
  };

  const handleEdit = (signal: Signal) => {
    setEditing(signal);
    setFormData({
      company_name: signal.company_name,
      signal_type: signal.signal_type,
      description: signal.description,
      urgency: signal.urgency as any,
      estimated_value: signal.estimated_value || "",
      deadline: signal.deadline ? new Date(signal.deadline).toISOString().split('T')[0] : "",
      location: signal.location || "",
      country: (signal as any).country || "",
      city: (signal as any).city || "",
      contact_name: signal.contact_name || "",
      contact_email: signal.contact_email || "",
      contact_phone: signal.contact_phone || "",
      status: signal.status as any,
      source_link: (signal as any).source_link || "",
      action_items: signal.action_items || []
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
    if (!confirm("Are you sure you want to delete this signal?")) return;

    const { error } = await supabase
      .from("signals")
      .delete()
      .eq("id", id);

    if (error) {
      toast({ title: "Error deleting signal", variant: "destructive" });
    } else {
      toast({ title: "Signal deleted successfully" });
      fetchSignals();
      onUpdate();
    }
  };

  const resetForm = () => {
    setEditing(null);
    setFormData({
      company_name: "",
      signal_type: "",
      description: "",
      urgency: "medium",
      estimated_value: "",
      deadline: "",
      location: "",
      country: "",
      city: "",
      contact_name: "",
      contact_email: "",
      contact_phone: "",
      status: "active",
      source_link: "",
      action_items: []
    });
    setNewActionItem({ title: "", description: "", priority: "medium" });
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">
          {editing ? "Edit Signal" : "Create New Signal"}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Company Name</label>
              <Input
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                placeholder="Enter company name"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Signal Type</label>
              <Select
                value={formData.signal_type}
                onValueChange={(value) => setFormData({ ...formData, signal_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select signal type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="New Project Announcement">New Project Announcement</SelectItem>
                  <SelectItem value="Expansion Plan">Expansion Plan</SelectItem>
                  <SelectItem value="Facility Upgrade">Facility Upgrade</SelectItem>
                  <SelectItem value="Asset Acquisition">Asset Acquisition</SelectItem>
                  <SelectItem value="Joint Venture">Joint Venture</SelectItem>
                  <SelectItem value="Partnership Opportunity">Partnership Opportunity</SelectItem>
                  <SelectItem value="Budget Approval">Budget Approval</SelectItem>
                  <SelectItem value="Leadership Change">Leadership Change</SelectItem>
                  <SelectItem value="New Department Formation">New Department Formation</SelectItem>
                  <SelectItem value="Technology Adoption">Technology Adoption</SelectItem>
                  <SelectItem value="Compliance Update">Compliance Update</SelectItem>
                  <SelectItem value="Contract Renewal">Contract Renewal</SelectItem>
                  <SelectItem value="Service Gap">Service Gap</SelectItem>
                  <SelectItem value="Market Entry">Market Entry</SelectItem>
                  <SelectItem value="Sustainability Initiative">Sustainability Initiative</SelectItem>
                  <SelectItem value="Equipment Purchase">Equipment Purchase</SelectItem>
                  <SelectItem value="Maintenance Contract Ending">Maintenance Contract Ending</SelectItem>
                  <SelectItem value="Facility Construction">Facility Construction</SelectItem>
                  <SelectItem value="Renovation Project">Renovation Project</SelectItem>
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
            <label className="text-sm font-medium mb-2 block">Description</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              placeholder="Describe the signal details"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Urgency</label>
              <Select
                value={formData.urgency}
                onValueChange={(value: any) => setFormData({ ...formData, urgency: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Estimated Value (in USD)</label>
              <Input
                value={formData.estimated_value}
                onChange={(e) => setFormData({ ...formData, estimated_value: e.target.value })}
                placeholder="$500K or 500000"
              />
              <p className="text-xs text-muted-foreground mt-1">Enter in USD - will be converted for users</p>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Deadline</label>
              <Input
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
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
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Contact Name</label>
              <Input
                value={formData.contact_name}
                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Contact Email</label>
              <Input
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Contact Phone</label>
              <Input
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
              />
            </div>
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
              {editing ? "Update" : "Create"} Signal
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
        {signals.map((signal) => (
          <Card key={signal.id} className="p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h4 className="font-semibold text-lg">{signal.company_name}</h4>
                <p className="text-sm text-muted mt-1">
                  {signal.signal_type} • {signal.urgency} • {signal.status}
                </p>
                <p className="text-sm mt-2">{signal.description}</p>
              </div>
              <div className="flex gap-2 ml-4">
                <Button size="sm" variant="outline" onClick={() => handleEdit(signal)}>
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleDelete(signal.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
