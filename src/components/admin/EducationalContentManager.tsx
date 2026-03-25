import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Content {
  id: string;
  title: string;
  description: string;
  duration_minutes: number;
  category: string;
  content_type: string;
  thumbnail_url: string;
  video_url: string;
  transcript_url: string;
  access_tier: string;
  status: string;
}

export function EducationalContentManager({ onUpdate }: { onUpdate: () => void }) {
  const [content, setContent] = useState<Content[]>([]);
  const [editing, setEditing] = useState<Content | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    duration_minutes: "",
    category: "",
    content_type: "video" as "video" | "webinar" | "article" | "course",
    thumbnail_url: "",
    video_url: "",
    transcript_url: "",
    access_tier: "free" as "free" | "basic" | "professional" | "enterprise",
    status: "published" as "draft" | "published" | "archived"
  });

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    const { data, error } = await supabase
      .from("educational_content")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setContent(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const submitData = {
      ...formData,
      duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null
    };

    if (editing) {
      const { error } = await supabase
        .from("educational_content")
        .update(submitData)
        .eq("id", editing.id);

      if (error) {
        toast({ title: "Error updating content", variant: "destructive" });
      } else {
        toast({ title: "Content updated successfully" });
        resetForm();
        fetchContent();
        onUpdate();
      }
    } else {
      const { error } = await supabase
        .from("educational_content")
        .insert([submitData]);

      if (error) {
        toast({ title: "Error creating content", variant: "destructive" });
      } else {
        toast({ title: "Content created successfully" });
        resetForm();
        fetchContent();
        onUpdate();
      }
    }
  };

  const handleEdit = (item: Content) => {
    setEditing(item);
    setFormData({
      title: item.title,
      description: item.description || "",
      duration_minutes: item.duration_minutes?.toString() || "",
      category: item.category,
      content_type: item.content_type as any,
      thumbnail_url: item.thumbnail_url || "",
      video_url: item.video_url || "",
      transcript_url: item.transcript_url || "",
      access_tier: item.access_tier as any,
      status: item.status as any
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this content?")) return;

    const { error } = await supabase
      .from("educational_content")
      .delete()
      .eq("id", id);

    if (error) {
      toast({ title: "Error deleting content", variant: "destructive" });
    } else {
      toast({ title: "Content deleted successfully" });
      fetchContent();
      onUpdate();
    }
  };

  const resetForm = () => {
    setEditing(null);
    setFormData({
      title: "",
      description: "",
      duration_minutes: "",
      category: "",
      content_type: "video",
      thumbnail_url: "",
      video_url: "",
      transcript_url: "",
      access_tier: "free",
      status: "published"
    });
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">
          {editing ? "Edit Content" : "Create New Content"}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Title</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Category</label>
              <Input
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g., Safety, Procurement"
                required
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Description</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Type</label>
              <Select
                value={formData.content_type}
                onValueChange={(value: any) => setFormData({ ...formData, content_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="webinar">Webinar</SelectItem>
                  <SelectItem value="article">Article</SelectItem>
                  <SelectItem value="course">Course</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Duration (min)</label>
              <Input
                type="number"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Access Tier</label>
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
              <label className="text-sm font-medium mb-2 block">Status</label>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Thumbnail URL</label>
              <Input
                value={formData.thumbnail_url}
                onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Video URL</label>
              <Input
                value={formData.video_url}
                onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Transcript URL</label>
              <Input
                value={formData.transcript_url}
                onChange={(e) => setFormData({ ...formData, transcript_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit">
              <Plus className="w-4 h-4 mr-2" />
              {editing ? "Update" : "Create"} Content
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
        {content.map((item) => (
          <Card key={item.id} className="p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h4 className="font-semibold text-lg">{item.title}</h4>
                <p className="text-sm text-muted mt-1">
                  {item.category} • {item.content_type} • {item.access_tier} • {item.status}
                </p>
                {item.description && (
                  <p className="text-sm mt-2 line-clamp-2">{item.description}</p>
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
