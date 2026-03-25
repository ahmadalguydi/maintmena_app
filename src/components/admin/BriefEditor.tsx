import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit2, Trash2, X, Tag } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface Brief {
  id: string;
  title: string;
  content: string;
  publication_date: string;
  status: string;
  tags?: string[];
}

interface Signal {
  id: string;
  company_name: string;
  signal_type: string;
  description: string;
  urgency: string;
}

interface Tender {
  id: string;
  tender_number: string;
  title: string;
  description: string;
  submission_deadline: string;
}

export function BriefEditor({ onUpdate }: { onUpdate: () => void }) {
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [editing, setEditing] = useState<Brief | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    status: "draft" as "draft" | "published" | "archived",
    tags: [] as string[]
  });
  
  const [availableSignals, setAvailableSignals] = useState<Signal[]>([]);
  const [availableTenders, setAvailableTenders] = useState<Tender[]>([]);
  const [selectedSignals, setSelectedSignals] = useState<string[]>([]);
  const [selectedTenders, setSelectedTenders] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    fetchBriefs();
    fetchSignalsAndTenders();
  }, []);

  const fetchSignalsAndTenders = async () => {
    const [signalsRes, tendersRes] = await Promise.all([
      supabase.from("signals").select("*").eq("status", "active").order("created_at", { ascending: false }),
      supabase.from("tenders").select("*").eq("status", "open").order("created_at", { ascending: false })
    ]);

    if (signalsRes.data) setAvailableSignals(signalsRes.data);
    if (tendersRes.data) setAvailableTenders(tendersRes.data);
  };

  const fetchBriefs = async () => {
    const { data, error } = await supabase
      .from("briefs")
      .select("*")
      .order("publication_date", { ascending: false });

    if (!error && data) {
      setBriefs(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editing) {
      const { data: briefData, error: briefError } = await supabase
        .from("briefs")
        .update(formData)
        .eq("id", editing.id)
        .select()
        .single();

      if (briefError) {
        toast({ title: "Error updating brief", variant: "destructive" });
        return;
      }

      // Update associated signals
      await supabase.from("brief_signals").delete().eq("brief_id", editing.id);
      if (selectedSignals.length > 0) {
        await supabase.from("brief_signals").insert(
          selectedSignals.map(signalId => ({ brief_id: editing.id, signal_id: signalId }))
        );
      }

      // Update associated tenders
      await supabase.from("brief_tenders").delete().eq("brief_id", editing.id);
      if (selectedTenders.length > 0) {
        await supabase.from("brief_tenders").insert(
          selectedTenders.map(tenderId => ({ brief_id: editing.id, tender_id: tenderId }))
        );
      }

      toast({ title: "Brief updated successfully" });
      resetForm();
      fetchBriefs();
      onUpdate();
    } else {
      const { data: briefData, error: briefError } = await supabase
        .from("briefs")
        .insert([formData])
        .select()
        .single();

      if (briefError) {
        toast({ title: "Error creating brief", variant: "destructive" });
        return;
      }

      // Add associated signals
      if (selectedSignals.length > 0) {
        await supabase.from("brief_signals").insert(
          selectedSignals.map(signalId => ({ brief_id: briefData.id, signal_id: signalId }))
        );
      }

      // Add associated tenders
      if (selectedTenders.length > 0) {
        await supabase.from("brief_tenders").insert(
          selectedTenders.map(tenderId => ({ brief_id: briefData.id, tender_id: tenderId }))
        );
      }

      toast({ title: "Brief created successfully" });
      resetForm();
      fetchBriefs();
      onUpdate();
    }
  };

  const handleEdit = async (brief: Brief) => {
    setEditing(brief);
    setFormData({
      title: brief.title,
      content: brief.content,
      status: brief.status as any,
      tags: brief.tags || []
    });

    // Fetch associated signals and tenders
    const [signalsRes, tendersRes] = await Promise.all([
      supabase.from("brief_signals").select("signal_id").eq("brief_id", brief.id),
      supabase.from("brief_tenders").select("tender_id").eq("brief_id", brief.id)
    ]);

    setSelectedSignals(signalsRes.data?.map(s => s.signal_id) || []);
    setSelectedTenders(tendersRes.data?.map(t => t.tender_id) || []);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this brief?")) return;

    const { error } = await supabase
      .from("briefs")
      .delete()
      .eq("id", id);

    if (error) {
      toast({ title: "Error deleting brief", variant: "destructive" });
    } else {
      toast({ title: "Brief deleted successfully" });
      fetchBriefs();
      onUpdate();
    }
  };

  const resetForm = () => {
    setEditing(null);
    setFormData({ title: "", content: "", status: "draft", tags: [] });
    setSelectedSignals([]);
    setSelectedTenders([]);
    setTagInput("");
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] });
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) });
  };

  const toggleSignal = (signalId: string) => {
    setSelectedSignals(prev => 
      prev.includes(signalId) 
        ? prev.filter(id => id !== signalId)
        : [...prev, signalId]
    );
  };

  const toggleTender = (tenderId: string) => {
    setSelectedTenders(prev => 
      prev.includes(tenderId) 
        ? prev.filter(id => id !== tenderId)
        : [...prev, tenderId]
    );
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 border-2">
        <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
          {editing ? "Edit Brief" : "Create New Brief"}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="text-sm font-semibold mb-2 block">Brief Title</label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter brief title"
              required
              className="text-base"
            />
          </div>

          {/* Main Content */}
          <div>
            <label className="text-sm font-semibold mb-2 block">Main Content</label>
            <Textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Write the main brief content here..."
              rows={6}
              required
              className="text-base"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="text-sm font-semibold mb-2 block flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Tags
            </label>
            <div className="flex gap-2 mb-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Add a tag"
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
              />
              <Button type="button" onClick={addTag} size="sm">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  {tag}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => removeTag(tag)} />
                </Badge>
              ))}
            </div>
          </div>

          {/* Signals Section */}
          <div>
            <label className="text-sm font-semibold mb-3 block">Associated Signals</label>
            <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-4">
              {availableSignals.map((signal) => (
                <div
                  key={signal.id}
                  onClick={() => toggleSignal(signal.id)}
                  className={`p-3 rounded-md border cursor-pointer transition-colors ${
                    selectedSignals.includes(signal.id)
                      ? "bg-primary/10 border-primary"
                      : "hover:bg-muted"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{signal.company_name}</p>
                      <p className="text-sm text-muted-foreground">{signal.signal_type}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {signal.description}
                      </p>
                    </div>
                    <Badge variant={signal.urgency === "high" ? "destructive" : "secondary"}>
                      {signal.urgency}
                    </Badge>
                  </div>
                </div>
              ))}
              {availableSignals.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No active signals available
                </p>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Selected: {selectedSignals.length} signal(s)
            </p>
          </div>

          {/* Tenders Section */}
          <div>
            <label className="text-sm font-semibold mb-3 block">Associated Tenders</label>
            <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-4">
              {availableTenders.map((tender) => (
                <div
                  key={tender.id}
                  onClick={() => toggleTender(tender.id)}
                  className={`p-3 rounded-md border cursor-pointer transition-colors ${
                    selectedTenders.includes(tender.id)
                      ? "bg-primary/10 border-primary"
                      : "hover:bg-muted"
                  }`}
                >
                  <div className="flex-1">
                    <p className="font-medium">{tender.title}</p>
                    <p className="text-sm text-muted-foreground">#{tender.tender_number}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {tender.description}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Deadline: {new Date(tender.submission_deadline).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
              {availableTenders.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No open tenders available
                </p>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Selected: {selectedTenders.length} tender(s)
            </p>
          </div>

          {/* Status */}
          <div>
            <label className="text-sm font-semibold mb-2 block">Publication Status</label>
            <Select
              value={formData.status}
              onValueChange={(value: any) => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" size="lg">
              <Plus className="w-4 h-4 mr-2" />
              {editing ? "Update Brief" : "Create Brief"}
            </Button>
            {editing && (
              <Button type="button" variant="outline" size="lg" onClick={resetForm}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </Card>

      <div className="space-y-4">
        <h3 className="text-xl font-bold text-black mb-4">Published Briefs</h3>
        {briefs.map((brief) => (
          <Card key={brief.id} className="p-4 border-l-4 border-l-primary">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-semibold text-lg text-black">{brief.title}</h4>
                  <Badge variant={brief.status === "published" ? "default" : "secondary"}>
                    {brief.status}
                  </Badge>
                </div>
                <p className="text-sm text-black/70 mb-2">
                  {new Date(brief.publication_date).toLocaleDateString()}
                </p>
                {brief.tags && brief.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {brief.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                <p className="text-sm text-black/80 mt-2 line-clamp-2">
                  {brief.content.replace(/<[^>]*>/g, '')}
                </p>
              </div>
              <div className="flex gap-2 ml-4">
                <Button size="sm" variant="outline" onClick={() => handleEdit(brief)}>
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleDelete(brief.id)}>
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
