import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Search, Shield, Mail, Calendar, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Profile {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
}

interface UserRole {
  user_id: string;
  role: string;
}

interface Subscription {
  user_id: string;
  tier: string;
  status: string;
  trial_ends_at: string | null;
}

export function UserManager({ onUpdate }: { onUpdate: () => void }) {
  const [users, setUsers] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<Record<string, string>>({});
  const [subscriptions, setSubscriptions] = useState<Record<string, Subscription>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (profilesError) {
      toast({ title: "Error fetching users", variant: "destructive" });
      return;
    }

    const { data: userRoles } = await supabase.from("user_roles").select("*");
    const { data: userSubs } = await supabase.from("subscriptions").select("*");

    const rolesMap: Record<string, string> = {};
    userRoles?.forEach(r => rolesMap[r.user_id] = r.role);

    const subsMap: Record<string, Subscription> = {};
    userSubs?.forEach(s => subsMap[s.user_id] = s);

    setUsers(profiles || []);
    setRoles(rolesMap);
    setSubscriptions(subsMap);
    setLoading(false);
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    const { error } = await supabase
      .from("user_roles")
      .update({ role: newRole as any })
      .eq("user_id", userId);

    if (error) {
      toast({ title: "Error updating role", variant: "destructive" });
    } else {
      toast({ title: "Role updated successfully" });
      fetchUsers();
      onUpdate();
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;

    const { error } = await supabase.auth.admin.deleteUser(userId);

    if (error) {
      toast({ title: "Error deleting user", variant: "destructive" });
    } else {
      toast({ title: "User deleted successfully" });
      fetchUsers();
      onUpdate();
    }
  };

  const filteredUsers = users.filter(user =>
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-primary" />
            <h3 className="text-xl font-semibold">User Management</h3>
          </div>
          <Badge variant="secondary">{users.length} Total Users</Badge>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted" />
          <Input
            placeholder="Search users by email or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="space-y-3">
          {filteredUsers.map((user) => (
            <Card key={user.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold text-lg">{user.full_name || "No name"}</h4>
                    <Badge variant={roles[user.id] === 'admin' ? 'destructive' : 'secondary'}>
                      <Shield className="w-3 h-3 mr-1" />
                      {roles[user.id] || 'user'}
                    </Badge>
                    {subscriptions[user.id] && (
                      <Badge variant="outline">
                        {subscriptions[user.id].tier}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted">
                    <div className="flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {user.email}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(user.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={roles[user.id] || 'user'}
                    onValueChange={(value) => handleRoleChange(user.id, value)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteUser(user.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Card>
    </div>
  );
}
