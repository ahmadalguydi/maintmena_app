import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileText, Users, TrendingUp, GraduationCap, Contact, Bell, ShieldAlert, Activity, BarChart, Calendar, LayoutDashboard, Search, Settings, Plus, Upload, MessageCircle, Mail, BookOpen } from "lucide-react";
import { BriefEditor } from "@/components/admin/BriefEditor";
import { SignalManager } from "@/components/admin/SignalManager";
import { TenderManager } from "@/components/admin/TenderManager";
import { EducationalContentManager } from "@/components/admin/EducationalContentManager";
import { TemplatesGuidesManager } from "@/components/admin/TemplatesGuidesManager";
import { IndustryReportsManager } from "@/components/admin/IndustryReportsManager";
import { ContactManager } from "@/components/admin/ContactManager";
import { UserManager } from "@/components/admin/UserManager";
import { ActivityLog } from "@/components/admin/ActivityLog";
import { SystemStats } from "@/components/admin/SystemStats";
import { CalendarEventsManager } from "@/components/admin/CalendarEventsManager";
import { SupportChatManager } from "@/components/admin/SupportChatManager";
import { ContactSubmissionsManager } from "@/components/admin/ContactSubmissionsManager";
import BulkMarkdownUpload from "@/components/admin/BulkMarkdownUpload";
import { BlogManager } from "@/components/admin/BlogManager";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

export default function Admin({ currentLanguage }: { currentLanguage: 'en' | 'ar' }) {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [quickActionOpen, setQuickActionOpen] = useState(false);
  const [stats, setStats] = useState({
    briefs: 0,
    signals: 0,
    tenders: 0,
    content: 0,
    users: 0,
    requests: 0,
    quotes: 0,
    blogs: 0
  });

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

    // Use secure function to check admin role
    const { data: hasRole, error } = await supabase.rpc('has_role', { _role: 'admin', _user_id: user.id });

    if (error) {
      console.error('Admin check error:', error);
    }

    if (hasRole === true) {
      setIsAdmin(true);
      setLoading(false);
      fetchStats();
    } else {
      setIsAdmin(false);
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    const [briefsRes, signalsRes, tendersRes, contentRes, usersRes, requestsRes, quotesRes, blogsRes] = await Promise.all([
      supabase.from("briefs").select("id", { count: "exact", head: true }),
      supabase.from("signals").select("id", { count: "exact", head: true }),
      supabase.from("tenders").select("id", { count: "exact", head: true }),
      supabase.from("educational_content").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("maintenance_requests").select("id", { count: "exact", head: true }),
      supabase.from("quote_submissions").select("id", { count: "exact", head: true }),
      supabase.from("blogs").select("id", { count: "exact", head: true })
    ]);

    setStats({
      briefs: briefsRes.count || 0,
      signals: signalsRes.count || 0,
      tenders: tendersRes.count || 0,
      content: contentRes.count || 0,
      users: usersRes.count || 0,
      requests: requestsRes.count || 0,
      quotes: quotesRes.count || 0,
      blogs: blogsRes.count || 0
    });
  };

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, color: "text-blue-600" },
    { id: "blogs", label: "Blog Posts", icon: BookOpen, color: "text-fuchsia-600" },
    { id: "bulk", label: "Bulk Upload", icon: Upload, color: "text-emerald-600" },
    { id: "chats", label: "Support Chats", icon: MessageCircle, color: "text-blue-500" },
    { id: "contact-submissions", label: "Contact Forms", icon: Mail, color: "text-purple-500" },
    { id: "briefs", label: "Briefs", icon: FileText, color: "text-purple-600" },
    { id: "signals", label: "Signals", icon: TrendingUp, color: "text-green-600" },
    { id: "tenders", label: "Tenders", icon: Bell, color: "text-amber-600" },
    { id: "education", label: "Education", icon: GraduationCap, color: "text-indigo-600" },
    { id: "templates", label: "Templates", icon: FileText, color: "text-cyan-600" },
    { id: "reports", label: "Reports", icon: BarChart, color: "text-pink-600" },
    { id: "calendar", label: "Calendar", icon: Calendar, color: "text-orange-600" },
    { id: "contacts", label: "Contacts", icon: Contact, color: "text-teal-600" },
    { id: "users", label: "Users", icon: Users, color: "text-rose-600" },
    { id: "activity", label: "Activity Log", icon: Activity, color: "text-violet-600" },
    { id: "system", label: "System Stats", icon: Settings, color: "text-slate-600" }
  ];

  const handleQuickAction = (action: string) => {
    setActiveTab(action);
    setQuickActionOpen(false);
    toast({ title: "Quick Action", description: `Switched to ${action} management` });
  };

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
          <p className="text-muted mb-4">You don’t have admin privileges for this workspace.</p>
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
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === item.id
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      }`}
                  >
                    <item.icon className={`w-5 h-5 ${activeTab === item.id ? "" : item.color}`} />
                    <span className="font-medium">{item.label}</span>
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
                {menuItems.find(item => item.id === activeTab)?.label || "Dashboard"}
              </h1>
              <p className="text-sm text-muted-foreground">
                Manage and monitor your platform
              </p>
            </div>
            <DropdownMenu open={quickActionOpen} onOpenChange={setQuickActionOpen}>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Quick Action
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Create New</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleQuickAction("blogs")} className="gap-2">
                  <BookOpen className="w-4 h-4" />
                  New Blog Post
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleQuickAction("briefs")} className="gap-2">
                  <FileText className="w-4 h-4" />
                  New Brief
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleQuickAction("signals")} className="gap-2">
                  <TrendingUp className="w-4 h-4" />
                  New Signal
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleQuickAction("tenders")} className="gap-2">
                  <Bell className="w-4 h-4" />
                  New Tender
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleQuickAction("education")} className="gap-2">
                  <GraduationCap className="w-4 h-4" />
                  New Educational Content
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleQuickAction("calendar")} className="gap-2">
                  <Calendar className="w-4 h-4" />
                  New Calendar Event
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleQuickAction("contacts")} className="gap-2">
                  <Contact className="w-4 h-4" />
                  New Contact
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
                  {activeTab === "dashboard" && (
                    <div className="space-y-6">
                      {/* Stats Overview */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="p-6 bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20">
                          <div className="flex items-center justify-between mb-4">
                            <FileText className="w-8 h-8 text-blue-600" />
                            <span className="text-sm font-medium text-blue-600 bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded">Content</span>
                          </div>
                          <p className="text-3xl font-bold text-foreground mb-1">{stats.briefs}</p>
                          <p className="text-sm text-muted-foreground">Total Briefs</p>
                        </Card>

                        <Card className="p-6 bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/20">
                          <div className="flex items-center justify-between mb-4">
                            <TrendingUp className="w-8 h-8 text-green-600" />
                            <span className="text-sm font-medium text-green-600 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded">Active</span>
                          </div>
                          <p className="text-3xl font-bold text-foreground mb-1">{stats.signals}</p>
                          <p className="text-sm text-muted-foreground">Market Signals</p>
                        </Card>

                        <Card className="p-6 bg-gradient-to-br from-amber-500/10 to-amber-600/10 border-amber-500/20">
                          <div className="flex items-center justify-between mb-4">
                            <Bell className="w-8 h-8 text-amber-600" />
                            <span className="text-sm font-medium text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded">Open</span>
                          </div>
                          <p className="text-3xl font-bold text-foreground mb-1">{stats.tenders}</p>
                          <p className="text-sm text-muted-foreground">Active Tenders</p>
                        </Card>

                        <Card className="p-6 bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20">
                          <div className="flex items-center justify-between mb-4">
                            <Users className="w-8 h-8 text-purple-600" />
                            <span className="text-sm font-medium text-purple-600 bg-purple-100 dark:bg-purple-900/30 px-2 py-1 rounded">Live</span>
                          </div>
                          <p className="text-3xl font-bold text-foreground mb-1">{stats.users}</p>
                          <p className="text-sm text-muted-foreground">Registered Users</p>
                        </Card>
                      </div>

                      {/* Secondary Stats */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="p-4 border-border">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                              <GraduationCap className="w-5 h-5 text-cyan-600" />
                            </div>
                            <div>
                              <p className="text-2xl font-bold text-foreground">{stats.content}</p>
                              <p className="text-sm text-muted-foreground">Educational Content</p>
                            </div>
                          </div>
                        </Card>

                        <Card className="p-4 border-border">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-pink-500/10 flex items-center justify-center">
                              <BarChart className="w-5 h-5 text-pink-600" />
                            </div>
                            <div>
                              <p className="text-2xl font-bold text-foreground">{stats.requests}</p>
                              <p className="text-sm text-muted-foreground">Total Requests</p>
                            </div>
                          </div>
                        </Card>

                        <Card className="p-4 border-border">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                              <FileText className="w-5 h-5 text-orange-600" />
                            </div>
                            <div>
                              <p className="text-2xl font-bold text-foreground">{stats.quotes}</p>
                              <p className="text-sm text-muted-foreground">Total Quotes</p>
                            </div>
                          </div>
                        </Card>
                      </div>

                      {/* Activity & Stats Grid */}
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
                            <BarChart className="w-5 h-5 text-primary" />
                            System Overview
                          </h3>
                          <SystemStats />
                        </Card>
                      </div>
                    </div>
                  )}

                  {activeTab === "blogs" && <BlogManager />}
                  {activeTab === "briefs" && <BriefEditor onUpdate={fetchStats} />}
                  {activeTab === "signals" && <SignalManager onUpdate={fetchStats} />}
                  {activeTab === "tenders" && <TenderManager onUpdate={fetchStats} currentLanguage={currentLanguage} />}
                  {activeTab === "chats" && <SupportChatManager />}
                  {activeTab === "contact-submissions" && <ContactSubmissionsManager />}
                  {activeTab === "education" && <EducationalContentManager onUpdate={fetchStats} />}
                  {activeTab === "templates" && <TemplatesGuidesManager onUpdate={fetchStats} />}
                  {activeTab === "reports" && <IndustryReportsManager onUpdate={fetchStats} />}
                  {activeTab === "calendar" && <CalendarEventsManager />}
                  {activeTab === "contacts" && <ContactManager onUpdate={fetchStats} />}
                  {activeTab === "users" && <UserManager onUpdate={fetchStats} />}
                  {activeTab === "bulk" && <BulkMarkdownUpload />}
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
