import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface TemplateGuide {
  id: string;
  title: string;
  description: string;
  category: string;
  file_type: string;
  file_url: string;
  thumbnail_url: string;
  access_tier: string;
  status: string;
}

export function TemplatesGuidesManager({ onUpdate }: { onUpdate: () => void }) {
  const [items, setItems] = useState<TemplateGuide[]>([]);
  const [editing, setEditing] = useState<TemplateGuide | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    file_type: "pdf" as "pdf" | "xlsx" | "docx" | "pptx",
    file_url: "",
    thumbnail_url: "",
    access_tier: "free" as "free" | "basic" | "professional" | "enterprise",
    status: "published" as "draft" | "published" | "archived"
  });

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from("templates_guides")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setItems(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editing) {
      const { error } = await supabase
        .from("templates_guides")
        .update(formData)
        .eq("id", editing.id);

      if (error) {
        toast({ title: "Error updating template", variant: "destructive" });
      } else {
        toast({ title: "Template updated successfully" });
        resetForm();
        fetchItems();
        onUpdate();
      }
    } else {
      const { error } = await supabase
        .from("templates_guides")
        .insert([formData]);

      if (error) {
        toast({ title: "Error creating template", variant: "destructive" });
      } else {
        toast({ title: "Template created successfully" });
        resetForm();
        fetchItems();
        onUpdate();
      }
    }
  };

  const handleEdit = (item: TemplateGuide) => {
    setEditing(item);
    setFormData({
      title: item.title,
      description: item.description || "",
      category: item.category,
      file_type: item.file_type as any,
      file_url: item.file_url || "",
      thumbnail_url: item.thumbnail_url || "",
      access_tier: item.access_tier as any,
      status: item.status as any
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    const { error } = await supabase
      .from("templates_guides")
      .delete()
      .eq("id", id);

    if (error) {
      toast({ title: "Error deleting template", variant: "destructive" });
    } else {
      toast({ title: "Template deleted successfully" });
      fetchItems();
      onUpdate();
    }
  };

  const resetForm = () => {
    setEditing(null);
    setFormData({
      title: "",
      description: "",
      category: "",
      file_type: "pdf",
      file_url: "",
      thumbnail_url: "",
      access_tier: "free",
      status: "published"
    });
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4 text-black">
          {editing ? "Edit Template/Guide" : "Create New Template/Guide"}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block text-black">Title</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block text-black">Category</label>
              <Input
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g., Maintenance, Risk Assessment"
                required
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block text-black">Description</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block text-black">File Type</label>
              <Select
                value={formData.file_type}
                onValueChange={(value: any) => setFormData({ ...formData, file_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="xlsx">Excel</SelectItem>
                  <SelectItem value="docx">Word</SelectItem>
                  <SelectItem value="pptx">PowerPoint</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block text-black">Access Tier</label>
              <Select
                value={formData.access_tier}
                onValueChange={(value: any) => setFormData({ ...formData, access_tier: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block text-black">Status</label>
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
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block text-black">File URL</label>
              <Input
                value={formData.file_url}
                onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block text-black">Thumbnail URL</label>
              <Input
                value={formData.thumbnail_url}
                onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit">
              <Plus className="w-4 h-4 mr-2" />
              {editing ? "Update" : "Create"} Template
            </Button>
            {editing && (
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((item) => (
          <Card key={item.id} className="p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h4 className="font-semibold text-lg text-black">{item.title}</h4>
                <p className="text-sm text-black/70 mt-1">
                  {item.category} • {item.file_type} • {item.access_tier} • {item.status}
                </p>
                {item.description && (
                  <p className="text-sm text-black/70 mt-2 line-clamp-2">{item.description}</p>
                )}
              </div>
              <div className="flex gap-2 ml-4">
                <Button size="sm" variant="outline" onClick={() => handleEdit(item)}>
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleDelete(item.id)}>
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