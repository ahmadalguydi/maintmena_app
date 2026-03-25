import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Flag,
  Users,
  ShieldAlert,
  Activity,
  LayoutDashboard,
  Search,
  Settings,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  MessageCircle,
} from "lucide-react";
import { UserManager } from "@/components/admin/UserManager";
import { ActivityLog } from "@/components/admin/ActivityLog";
import { SystemStats } from "@/components/admin/SystemStats";
import { SupportChatManager } from "@/components/admin/SupportChatManager";
import { ReportsManager } from "@/components/admin/ReportsManager";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";

export default function Admin({ currentLanguage }: { currentLanguage: 'en' | 'ar' }) {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("priority");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!authLoading) {
      checkAdminStatus();
    }
  }, [user, authLoading]);

  const checkAdminStatus = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    const { data: hasRole, error } = await supabase.rpc('has_role', { _role: 'admin', _user_id: user.id });

    if (error) {
      console.error('Admin check error:', error);
    }

    if (hasRole === true) {
      setIsAdmin(true);
      setLoading(false);
    } else {
      setIsAdmin(false);
      setLoading(false);
    }
  };

  // Fetch priority queue counts
  const { data: stats } = useQuery({
    queryKey: ['admin-priority-stats'],
    queryFn: async () => {
      const [
        reportsRes,
        haltedJobsRes,
        usersRes,
        chatsRes,
      ] = await Promise.all([
        supabase.from("user_reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("maintenance_requests").select("id", { count: "exact", head: true }).eq("halted", true),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("support_chats").select("id", { count: "exact", head: true }).eq("status", "open"),
      ]);

      return {
        pendingReports: reportsRes.count || 0,
        haltedJobs: haltedJobsRes.count || 0,
        totalUsers: usersRes.count || 0,
        openChats: chatsRes.count || 0,
      };
    },
    enabled: isAdmin,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const menuItems = [
    { id: "priority", label: "Priority Queue", icon: AlertTriangle, color: "text-red-500", badge: (stats?.pendingReports || 0) + (stats?.haltedJobs || 0) },
    { id: "reports", label: "User Reports", icon: Flag, color: "text-orange-500", badge: stats?.pendingReports },
    { id: "chats", label: "Support Chats", icon: MessageCircle, color: "text-blue-500", badge: stats?.openChats },
    { id: "users", label: "User Management", icon: Users, color: "text-purple-500" },
    { id: "activity", label: "Activity Log", icon: Activity, color: "text-green-500" },
    { id: "system", label: "System Health", icon: Settings, color: "text-slate-500" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <div className="text-center max-w-md">
          <ShieldAlert className="w-12 h-12 text-accent mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-ink mb-2">Access restricted</h2>
          <p className="text-muted mb-4">You don't have admin privileges for this workspace.</p>
          <button
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground"
            onClick={() => navigate('/')}
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-hidden">
      <div className="flex h-full">
        {/* Sidebar Navigation */}
        <motion.aside
          initial={{ x: -280 }}
          animate={{ x: 0 }}
          className="w-64 bg-card border-r border-border flex flex-col"
        >
          {/* Admin Header */}
          <div className="p-6 border-b border-border">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <ShieldAlert className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h2 className="font-display font-bold text-foreground">Admin</h2>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <p className="text-xs text-muted-foreground">Online</p>
                </div>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-background"
              />
            </div>
          </div>

          {/* Navigation Menu */}
          <ScrollArea className="flex-1 px-3 py-4">
            <nav className="space-y-1">
              {menuItems
                .filter(item =>
                  item.label.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((item) => (
                  <motion.button
                    key={item.id}
                    whileHover={{ scale: 1.02, x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === item.id
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className={`w-5 h-5 ${activeTab === item.id ? "" : item.color}`} />
                      <span className="font-medium">{item.label}</span>
                    </div>
                    {item.badge && item.badge > 0 && (
                      <Badge variant={activeTab === item.id ? "secondary" : "destructive"} className="text-xs">
                        {item.badge}
                      </Badge>
                    )}
                  </motion.button>
                ))}
            </nav>
          </ScrollArea>

          {/* User Info */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-accent/50">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-bold text-primary-foreground">
                {user?.email?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{user?.email}</p>
                <p className="text-xs text-muted-foreground">Administrator</p>
              </div>
            </div>
          </div>
        </motion.aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Bar */}
          <header className="h-16 border-b border-border bg-card px-6 flex items-center justify-between flex-shrink-0">
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground">
                {menuItems.find(item => item.id === activeTab)?.label || "Priority Queue"}
              </h1>
              <p className="text-sm text-muted-foreground">
                Manage and monitor your platform
              </p>
            </div>
          </header>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {activeTab === "priority" && (
                    <div className="space-y-6">
                      {/* Priority Stats */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="p-6 bg-gradient-to-br from-red-500/10 to-red-600/10 border-red-500/20 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveTab("reports")}>
                          <div className="flex items-center justify-between mb-4">
                            <Flag className="w-8 h-8 text-red-600" />
                            <Badge variant="destructive">Action Required</Badge>
                          </div>
                          <p className="text-3xl font-bold text-foreground mb-1">{stats?.pendingReports || 0}</p>
                          <p className="text-sm text-muted-foreground">Pending Reports</p>
                        </Card>

                        <Card className="p-6 bg-gradient-to-br from-orange-500/10 to-orange-600/10 border-orange-500/20">
                          <div className="flex items-center justify-between mb-4">
                            <AlertTriangle className="w-8 h-8 text-orange-600" />
                            <Badge className="bg-orange-100 text-orange-700 border-orange-200">Disputes</Badge>
                          </div>
                          <p className="text-3xl font-bold text-foreground mb-1">{stats?.haltedJobs || 0}</p>
                          <p className="text-sm text-muted-foreground">Halted Jobs</p>
                        </Card>

                        <Card className="p-6 bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveTab("chats")}>
                          <div className="flex items-center justify-between mb-4">
                            <MessageCircle className="w-8 h-8 text-blue-600" />
                            <Badge className="bg-blue-100 text-blue-700 border-blue-200">Support</Badge>
                          </div>
                          <p className="text-3xl font-bold text-foreground mb-1">{stats?.openChats || 0}</p>
                          <p className="text-sm text-muted-foreground">Open Chats</p>
                        </Card>

                        <Card className="p-6 bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveTab("users")}>
                          <div className="flex items-center justify-between mb-4">
                            <Users className="w-8 h-8 text-purple-600" />
                            <Badge className="bg-purple-100 text-purple-700 border-purple-200">Platform</Badge>
                          </div>
                          <p className="text-3xl font-bold text-foreground mb-1">{stats?.totalUsers || 0}</p>
                          <p className="text-sm text-muted-foreground">Total Users</p>
                        </Card>
                      </div>

                      {/* Activity & Reports Preview */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card className="p-6">
                          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-primary" />
                            Recent Activity
                          </h3>
                          <ActivityLog />
                        </Card>

                        <Card className="p-6">
                          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-primary" />
                            System Overview
                          </h3>
                          <SystemStats />
                        </Card>
                      </div>
                    </div>
                  )}

                  {activeTab === "reports" && <ReportsManager />}
                  {activeTab === "chats" && <SupportChatManager />}
                  {activeTab === "users" && <UserManager onUpdate={() => { }} />}
                  {activeTab === "activity" && (
                    <Card className="p-6">
                      <ActivityLog />
                    </Card>
                  )}
                  {activeTab === "system" && (
                    <Card className="p-6">
                      <SystemStats />
                    </Card>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
