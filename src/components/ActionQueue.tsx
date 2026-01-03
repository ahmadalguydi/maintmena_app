import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ListChecks, CheckCircle2, Clock, Target, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { differenceInDays } from 'date-fns';
import { toast } from 'sonner';


interface ActionQueueProps {
  currentLanguage: 'en' | 'ar';
}

interface ActionItem {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  completed: boolean;
  sourceType: 'signal' | 'tender';
  sourceId: string;
  sourceName: string;
  deadline?: string;
  daysLeft?: number;
}

interface GroupedActions {
  sourceId: string;
  sourceName: string;
  sourceType: 'signal' | 'tender';
  deadline?: string;
  daysLeft?: number;
  actions: ActionItem[];
}

export const ActionQueue = ({ currentLanguage }: ActionQueueProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pendingGroups, setPendingGroups] = useState<GroupedActions[]>([]);
  const [completedGroups, setCompletedGroups] = useState<GroupedActions[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      fetchActionQueue();
    }
  }, [user]);

  const fetchActionQueue = async () => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      const now = new Date();
      const groupsMap = new Map<string, GroupedActions>();

      // Fetch tracked items
      const { data: tracked } = await sb
        .from('tracked_items')
        .select('*')
        .eq('user_id', user.id);

      const trackedSignalIds = tracked?.filter(t => t.item_type === 'signal').map(t => t.item_id) || [];
      const trackedTenderIds = tracked?.filter(t => t.item_type === 'tender').map(t => t.item_id) || [];

      // Fetch per-user completion states for tracked items
      let signalCompletions: { source_id: string; action_key: string; completed: boolean }[] = [];
      let tenderCompletions: { source_id: string; action_key: string; completed: boolean }[] = [];

      if (trackedSignalIds.length > 0) {
        const { data } = await sb
          .from('user_action_items')
          .select('source_id, action_key, completed')
          .eq('user_id', user.id)
          .eq('source_type', 'signal')
          .in('source_id', trackedSignalIds);
        signalCompletions = data || [];
      }
      if (trackedTenderIds.length > 0) {
        const { data } = await sb
          .from('user_action_items')
          .select('source_id, action_key, completed')
          .eq('user_id', user.id)
          .eq('source_type', 'tender')
          .in('source_id', trackedTenderIds);
        tenderCompletions = data || [];
      }

      // Build maps of completed action keys per source
      const completedSignalMap = new Map<string, Set<string>>();
      signalCompletions.forEach((row) => {
        if (row.completed) {
          const set = completedSignalMap.get(row.source_id) || new Set<string>();
          set.add(row.action_key);
          completedSignalMap.set(row.source_id, set);
        }
      });
      const completedTenderMap = new Map<string, Set<string>>();
      tenderCompletions.forEach((row) => {
        if (row.completed) {
          const set = completedTenderMap.get(row.source_id) || new Set<string>();
          set.add(row.action_key);
          completedTenderMap.set(row.source_id, set);
        }
      });
      // Fetch tracked signals with action items
      if (trackedSignalIds.length > 0) {
        const { data: signals } = await sb
          .from('signals')
          .select('*')
          .in('id', trackedSignalIds)
          .eq('status', 'active');

        signals?.forEach((signal: any) => {
          if (signal.action_items && Array.isArray(signal.action_items)) {
            const actions: ActionItem[] = signal.action_items.map((item: any) => {
              const daysLeft = signal.deadline ? differenceInDays(new Date(signal.deadline), now) : undefined;
              return {
                id: item.id || item.title,
                title: item.title,
                description: item.description || '',
                priority: item.priority || 'medium',
                completed: (completedSignalMap.get(signal.id)?.has(item.id || item.title)) ?? false,
                sourceType: 'signal' as const,
                sourceId: signal.id,
                sourceName: signal.company_name,
                deadline: signal.deadline,
                daysLeft
              };
            });

            if (actions.length > 0) {
              groupsMap.set(signal.id, {
                sourceId: signal.id,
                sourceName: signal.company_name,
                sourceType: 'signal',
                deadline: signal.deadline,
                daysLeft: signal.deadline ? differenceInDays(new Date(signal.deadline), now) : undefined,
                actions
              });
            }
          }
        });
      }

      // Fetch tracked tenders with action items
      if (trackedTenderIds.length > 0) {
        const { data: tenders } = await sb
          .from('tenders')
          .select('*')
          .in('id', trackedTenderIds)
          .eq('status', 'open');

        tenders?.forEach((tender: any) => {
          if (tender.action_items && Array.isArray(tender.action_items)) {
            const actions: ActionItem[] = tender.action_items.map((item: any) => {
              const daysLeft = differenceInDays(new Date(tender.submission_deadline), now);
              return {
                id: item.id || item.title,
                title: item.title,
                description: item.description || '',
                priority: item.priority || 'medium',
                completed: (completedTenderMap.get(tender.id)?.has(item.id || item.title)) ?? false,
                sourceType: 'tender' as const,
                sourceId: tender.id,
                sourceName: tender.title,
                deadline: tender.submission_deadline,
                daysLeft
              };
            });

            if (actions.length > 0) {
              groupsMap.set(tender.id, {
                sourceId: tender.id,
                sourceName: tender.title,
                sourceType: 'tender',
                deadline: tender.submission_deadline,
                daysLeft: differenceInDays(new Date(tender.submission_deadline), now),
                actions
              });
            }
          }
        });
      }

      const allGroups = Array.from(groupsMap.values());
      
      // Separate pending and completed
      const pending = allGroups.map(group => ({
        ...group,
        actions: group.actions.filter(a => !a.completed)
      })).filter(g => g.actions.length > 0);

      const completed = allGroups.map(group => ({
        ...group,
        actions: group.actions.filter(a => a.completed)
      })).filter(g => g.actions.length > 0);

      // Sort groups by deadline
      const sortGroups = (groups: GroupedActions[]) => {
        return groups.sort((a, b) => {
          if (a.daysLeft !== undefined && b.daysLeft !== undefined) {
            return a.daysLeft - b.daysLeft;
          } else if (a.daysLeft !== undefined) return -1;
          else if (b.daysLeft !== undefined) return 1;
          return 0;
        });
      };

      setPendingGroups(sortGroups(pending));
      setCompletedGroups(sortGroups(completed));
      
      // Auto-expand groups with pending items
      setExpandedGroups(new Set(pending.map(g => g.sourceId)));
    } catch (error) {
      console.error('Error fetching action queue:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleActionComplete = async (group: GroupedActions, actionId: string, completed: boolean) => {
    if (!user) return;
    try {
      const { error } = await sb
        .from('user_action_items')
        .upsert({
          user_id: user.id,
          source_type: group.sourceType,
          source_id: group.sourceId,
          action_key: actionId,
          completed,
          completed_at: completed ? new Date().toISOString() : null,
        }, { onConflict: 'user_id,source_type,source_id,action_key' });

      if (error) throw error;

      toast.success(completed ? 'Task completed' : 'Task reopened');
      fetchActionQueue();
    } catch (error) {
      console.error('Error updating action:', error);
      toast.error('Failed to update task');
    }
  };

  const toggleGroup = (sourceId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(sourceId)) {
        next.delete(sourceId);
      } else {
        next.add(sourceId);
      }
      return next;
    });
  };


  if (loading) {
    return (
      <Card className="border-border/40">
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">
            {currentLanguage === 'ar' ? 'جاري التحميل...' : 'Loading...'}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (pendingGroups.length === 0 && completedGroups.length === 0) {
    return (
      <Card className="border-border/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <ListChecks className="w-5 h-5 text-primary" />
            {currentLanguage === 'ar' ? 'قائمة الإجراءات' : 'Action Queue'}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {currentLanguage === 'ar' 
              ? 'خطوات قابلة للتنفيذ من فرصك المتتبعة' 
              : 'Actionable steps from your tracked opportunities'}
          </p>
        </CardHeader>
        <CardContent>
          <div className="p-6 bg-muted/30 rounded-lg text-center">
            <p className="text-sm text-muted-foreground mb-3">
              {currentLanguage === 'ar' 
                ? 'لا توجد إجراءات حالياً. تتبع بعض الفرص للبدء!' 
                : 'No actions yet. Track some opportunities to get started!'}
            </p>
            <Button size="sm" onClick={() => navigate('/weekly-brief')}>
              {currentLanguage === 'ar' ? 'تصفح الفرص' : 'Browse Opportunities'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'critical':
        return {
          bg: 'bg-red-50 dark:bg-red-950/20 border-l-4 border-red-500',
          badge: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'
        };
      case 'high':
        return {
          bg: 'bg-orange-50 dark:bg-orange-950/20 border-l-4 border-orange-500',
          badge: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800'
        };
      case 'medium':
        return {
          bg: 'bg-blue-50 dark:bg-blue-950/20 border-l-4 border-blue-500',
          badge: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800'
        };
      default:
        return {
          bg: 'bg-muted/40 border-l-4 border-muted',
          badge: 'bg-muted text-muted-foreground border-border'
        };
    }
  };

  const getUrgencyBadge = (daysLeft?: number) => {
    if (daysLeft === undefined) return null;
    if (daysLeft === 0) return { text: 'Today', color: 'text-red-600 dark:text-red-400' };
    if (daysLeft === 1) return { text: '1 day', color: 'text-orange-600 dark:text-orange-400' };
    if (daysLeft <= 3) return { text: `${daysLeft} days`, color: 'text-orange-600 dark:text-orange-400' };
    if (daysLeft <= 7) return { text: `${daysLeft} days`, color: 'text-blue-600 dark:text-blue-400' };
    return { text: `${daysLeft} days`, color: 'text-muted-foreground' };
  };

  const renderGroup = (group: GroupedActions, isCompleted: boolean) => {
    const isExpanded = expandedGroups.has(group.sourceId);
    const Icon = group.sourceType === 'signal' ? Target : FileText;
    const urgency = getUrgencyBadge(group.daysLeft);
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const sortedActions = [...group.actions].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return (
      <Collapsible
        key={group.sourceId}
        open={isExpanded}
        onOpenChange={() => toggleGroup(group.sourceId)}
      >
        <div className="border border-border/40 rounded-lg overflow-hidden bg-card">
          <CollapsibleTrigger className="w-full p-3 hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-sm text-foreground">{group.sourceName}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="secondary" className="text-[10px] h-4">
                      {group.actions.length} {currentLanguage === 'ar' ? 'مهام' : 'tasks'}
                    </Badge>
                    {urgency && (
                      <span className={`text-[10px] font-semibold flex items-center gap-1 ${urgency.color}`}>
                        <Clock className="w-3 h-3" />
                        {urgency.text}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              )}
            </div>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <div className="border-t border-border/40">
              {sortedActions.map((action, index) => {
                const config = getPriorityConfig(action.priority);
                
                return (
                  <motion.div
                    key={action.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.02 }}
                    className="p-3 border-b border-border/20 last:border-b-0 hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={action.completed}
                        onCheckedChange={(checked) => toggleActionComplete(group, action.id, checked as boolean)}
                        className="mt-1"
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={`${config.badge} text-[10px] px-1.5 py-0 h-4 border uppercase`}>
                            {action.priority}
                          </Badge>
                        </div>
                        
                        <p className={`font-medium text-sm ${action.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                          {action.title}
                        </p>
                        
                        {action.description && (
                          <p className="text-[11px] text-muted-foreground mt-1">
                            {action.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    );
  };

  return (
    <Card className="border-border/40 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <ListChecks className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-foreground font-semibold text-base">
              {currentLanguage === 'ar' ? 'قائمة الإجراءات' : 'Action Queue'}
            </CardTitle>
            <p className="text-[10px] text-muted-foreground">
              {currentLanguage === 'ar' ? 'مجمعة حسب الفرصة' : 'Grouped by opportunity'}
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pending" className="text-xs">
              {currentLanguage === 'ar' ? 'قيد الانتظار' : 'Pending'} ({pendingGroups.reduce((acc, g) => acc + g.actions.length, 0)})
            </TabsTrigger>
            <TabsTrigger value="completed" className="text-xs">
              {currentLanguage === 'ar' ? 'مكتمل' : 'Completed'} ({completedGroups.reduce((acc, g) => acc + g.actions.length, 0)})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="pending" className="space-y-2 mt-3">
            {pendingGroups.length === 0 ? (
              <div className="p-6 bg-muted/30 rounded-lg text-center">
                <CheckCircle2 className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {currentLanguage === 'ar' ? 'لا توجد مهام معلقة' : 'No pending tasks'}
                </p>
              </div>
            ) : (
              pendingGroups.map(group => renderGroup(group, false))
            )}
          </TabsContent>
          
          <TabsContent value="completed" className="space-y-2 mt-3">
            {completedGroups.length === 0 ? (
              <div className="p-6 bg-muted/30 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">
                  {currentLanguage === 'ar' ? 'لا توجد مهام مكتملة' : 'No completed tasks'}
                </p>
              </div>
            ) : (
              completedGroups.map(group => renderGroup(group, true))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
