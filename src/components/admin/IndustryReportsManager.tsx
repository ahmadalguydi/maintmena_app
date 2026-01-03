import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface IndustryReport {
  id: string;
  title: string;
  description: string;
  category: string;
  report_type: string;
  file_url: string;
  preview_content: string;
  thumbnail_url: string;
  access_tier: string;
  status: string;
}

export function IndustryReportsManager({ onUpdate }: { onUpdate: () => void }) {
  const [reports, setReports] = useState<IndustryReport[]>([]);
  const [editing, setEditing] = useState<IndustryReport | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    report_type: "market_analysis",
    file_url: "",
    preview_content: "",
    thumbnail_url: "",
    access_tier: "professional" as "free" | "basic" | "professional" | "enterprise",
    status: "published" as "draft" | "published" | "archived"
  });

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    const { data, error } = await supabase
      .from("industry_reports")
      .select("*")
      .order("publication_date", { ascending: false });

    if (!error && data) {
      setReports(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editing) {
      const { error } = await supabase
        .from("industry_reports")
        .update(formData)
        .eq("id", editing.id);

      if (error) {
        toast({ title: "Error updating report", variant: "destructive" });
      } else {
        toast({ title: "Report updated successfully" });
        resetForm();
        fetchReports();
        onUpdate();
      }
    } else {
      const { error } = await supabase
        .from("industry_reports")
        .insert([formData]);

      if (error) {
        toast({ title: "Error creating report", variant: "destructive" });
      } else {
        toast({ title: "Report created successfully" });
        resetForm();
        fetchReports();
        onUpdate();
      }
    }
  };

  const handleEdit = (report: IndustryReport) => {
    setEditing(report);
    setFormData({
      title: report.title,
      description: report.description || "",
      category: report.category,
      report_type: report.report_type,
      file_url: report.file_url || "",
      preview_content: report.preview_content || "",
      thumbnail_url: report.thumbnail_url || "",
      access_tier: report.access_tier as any,
      status: report.status as any
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this report?")) return;

    const { error } = await supabase
      .from("industry_reports")
      .delete()
      .eq("id", id);

    if (error) {
      toast({ title: "Error deleting report", variant: "destructive" });
    } else {
      toast({ title: "Report deleted successfully" });
      fetchReports();
      onUpdate();
    }
  };

  const resetForm = () => {
    setEditing(null);
    setFormData({
      title: "",
      description: "",
      category: "",
      report_type: "market_analysis",
      file_url: "",
      preview_content: "",
      thumbnail_url: "",
      access_tier: "professional",
      status: "published"
    });
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4 text-black">
          {editing ? "Edit Industry Report" : "Create New Industry Report"}
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
                placeholder="e.g., Manufacturing, Energy"
                required
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block text-black">Description</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block text-black">Preview Content</label>
            <Textarea
              value={formData.preview_content}
              onChange={(e) => setFormData({ ...formData, preview_content: e.target.value })}
              rows={4}
              placeholder="Preview content that users can see before accessing full report..."
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block text-black">Report Type</label>
              <Input
                value={formData.report_type}
                onChange={(e) => setFormData({ ...formData, report_type: e.target.value })}
                placeholder="e.g., market_analysis, sector_report"
              />
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
              {editing ? "Update" : "Create"} Report
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
        {reports.map((report) => (
          <Card key={report.id} className="p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h4 className="font-semibold text-lg text-black">{report.title}</h4>
                <p className="text-sm text-black/70 mt-1">
                  {report.category} • {report.report_type} • {report.access_tier} • {report.status}
                </p>
                {report.description && (
                  <p className="text-sm text-black/70 mt-2 line-clamp-2">{report.description}</p>
                )}
              </div>
              <div className="flex gap-2 ml-4">
                <Button size="sm" variant="outline" onClick={() => handleEdit(report)}>
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleDelete(report.id)}>
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