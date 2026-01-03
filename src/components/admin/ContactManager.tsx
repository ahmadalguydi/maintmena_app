import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Contact {
  id: string;
  name: string;
  title: string;
  company: string;
  department: string;
  phone: string;
  email: string;
  recent_activity: string;
  notes: string;
}

export function ContactManager({ onUpdate }: { onUpdate: () => void }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    title: "",
    company: "",
    department: "",
    phone: "",
    email: "",
    recent_activity: "",
    notes: ""
  });

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    const { data, error } = await supabase
      .from("key_contacts")
      .select("*")
      .order("company", { ascending: true });

    if (!error && data) {
      setContacts(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editing) {
      const { error } = await supabase
        .from("key_contacts")
        .update(formData)
        .eq("id", editing.id);

      if (error) {
        toast({ title: "Error updating contact", variant: "destructive" });
      } else {
        toast({ title: "Contact updated successfully" });
        resetForm();
        fetchContacts();
        onUpdate();
      }
    } else {
      const { error } = await supabase
        .from("key_contacts")
        .insert([formData]);

      if (error) {
        toast({ title: "Error creating contact", variant: "destructive" });
      } else {
        toast({ title: "Contact created successfully" });
        resetForm();
        fetchContacts();
        onUpdate();
      }
    }
  };

  const handleEdit = (contact: Contact) => {
    setEditing(contact);
    setFormData({
      name: contact.name,
      title: contact.title || "",
      company: contact.company,
      department: contact.department || "",
      phone: contact.phone || "",
      email: contact.email || "",
      recent_activity: contact.recent_activity || "",
      notes: contact.notes || ""
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this contact?")) return;

    const { error } = await supabase
      .from("key_contacts")
      .delete()
      .eq("id", id);

    if (error) {
      toast({ title: "Error deleting contact", variant: "destructive" });
    } else {
      toast({ title: "Contact deleted successfully" });
      fetchContacts();
      onUpdate();
    }
  };

  const resetForm = () => {
    setEditing(null);
    setFormData({
      name: "",
      title: "",
      company: "",
      department: "",
      phone: "",
      email: "",
      recent_activity: "",
      notes: ""
    });
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">
          {editing ? "Edit Contact" : "Add New Contact"}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Title</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Company</label>
              <Input
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Department</label>
              <Input
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Email</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Phone</label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Recent Activity</label>
            <Input
              value={formData.recent_activity}
              onChange={(e) => setFormData({ ...formData, recent_activity: e.target.value })}
              placeholder="e.g., Discussed Q3 project requirements"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Notes</label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="Internal notes about this contact"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit">
              <Plus className="w-4 h-4 mr-2" />
              {editing ? "Update" : "Add"} Contact
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
        {contacts.map((contact) => (
          <Card key={contact.id} className="p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h4 className="font-semibold text-lg">{contact.name}</h4>
                <p className="text-sm text-muted">
                  {contact.title && `${contact.title} • `}{contact.company}
                </p>
                {contact.department && (
                  <p className="text-sm text-muted">{contact.department}</p>
                )}
                {contact.email && (
                  <p className="text-sm mt-2">{contact.email}</p>
                )}
                {contact.phone && (
                  <p className="text-sm">{contact.phone}</p>
                )}
              </div>
              <div className="flex gap-2 ml-4">
                <Button size="sm" variant="outline" onClick={() => handleEdit(contact)}>
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleDelete(contact.id)}>
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
