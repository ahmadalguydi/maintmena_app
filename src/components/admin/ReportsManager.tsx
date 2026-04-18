import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    AlertTriangle,
    CheckCircle,
    Clock,
    Eye,
    Flag,
    MessageCircle,
    User,
    XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

const REASON_LABELS: Record<string, string> = {
    inappropriate_image: '🖼️ Inappropriate Image',
    harassment: '⚠️ Harassment',
    spam: '📧 Spam/Fake',
    scam: '🚨 Scam/Fraud',
    other: '❓ Other',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
    pending: { label: 'Pending', color: 'bg-yellow-500', icon: Clock },
    reviewed: { label: 'Under Review', color: 'bg-blue-500', icon: Eye },
    resolved: { label: 'Resolved', color: 'bg-green-500', icon: CheckCircle },
    dismissed: { label: 'Dismissed', color: 'bg-gray-500', icon: XCircle },
};

export const ReportsManager = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState('pending');
    const [selectedReport, setSelectedReport] = useState<any>(null);
    const [resolutionNotes, setResolutionNotes] = useState('');

    const { data: reports, isLoading } = useQuery({
        queryKey: ['admin-reports', activeTab],
        queryFn: async () => {
            let query = supabase
                .from('user_reports')
                .select(`
          *,
          reporter:profiles!user_reports_reporter_id_fkey(full_name, email),
          reported_user:profiles!user_reports_reported_user_id_fkey(full_name, email, company_name)
        `)
                .order('created_at', { ascending: false });

            if (activeTab !== 'all') {
                query = query.eq('status', activeTab);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data || [];
        },
        enabled: !!user,
    });

    const updateReportMutation = useMutation({
        mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
            const updateData: any = {
                status,
                resolved_by: user?.id,
                resolved_at: new Date().toISOString(),
            };
            if (notes) updateData.resolution_notes = notes;

            const { error } = await supabase
                .from('user_reports')
                .update(updateData)
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
            toast.success('Report updated successfully');
            setSelectedReport(null);
            setResolutionNotes('');
        },
        onError: (error) => {
            if (import.meta.env.DEV) console.error('Update error:', error);
            toast.error('Failed to update report');
        },
    });

    const handleQuickAction = (reportId: string, status: 'reviewed' | 'resolved' | 'dismissed') => {
        updateReportMutation.mutate({ id: reportId, status });
    };

    const handleResolve = () => {
        if (!selectedReport) return;
        updateReportMutation.mutate({
            id: selectedReport.id,
            status: 'resolved',
            notes: resolutionNotes,
        });
    };

    const getContentTypeIcon = (type: string) => {
        switch (type) {
            case 'profile': return <User size={14} />;
            case 'message': return <MessageCircle size={14} />;
            default: return <Flag size={14} />;
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                    <Card key={i} className="h-24 animate-pulse bg-muted" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-4 gap-4">
                {Object.entries(STATUS_CONFIG).map(([status, config]) => {
                    const count = reports?.filter((r: any) => r.status === status).length || 0;
                    const Icon = config.icon;
                    return (
                        <Card
                            key={status}
                            className={`p-4 cursor-pointer transition-all hover:scale-[1.02] ${activeTab === status ? 'ring-2 ring-primary' : ''
                                }`}
                            onClick={() => setActiveTab(status)}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg ${config.color}/10 flex items-center justify-center`}>
                                    <Icon className={`w-5 h-5 text-${config.color.replace('bg-', '')}`} />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{count}</p>
                                    <p className="text-sm text-muted-foreground">{config.label}</p>
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>

            {/* Reports List */}
            <Card className="p-6">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="mb-4">
                        <TabsTrigger value="pending">🔴 Pending</TabsTrigger>
                        <TabsTrigger value="reviewed">🔵 Under Review</TabsTrigger>
                        <TabsTrigger value="resolved">🟢 Resolved</TabsTrigger>
                        <TabsTrigger value="dismissed">⚪ Dismissed</TabsTrigger>
                        <TabsTrigger value="all">All</TabsTrigger>
                    </TabsList>

                    <TabsContent value={activeTab}>
                        {reports && reports.length > 0 ? (
                            <div className="space-y-3">
                                {reports.map((report: any) => (
                                    <Card
                                        key={report.id}
                                        className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                                        onClick={() => setSelectedReport(report)}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Badge variant="outline" className="gap-1">
                                                        {getContentTypeIcon(report.content_type)}
                                                        {report.content_type}
                                                    </Badge>
                                                    <Badge className={`${STATUS_CONFIG[report.status]?.color} text-white`}>
                                                        {STATUS_CONFIG[report.status]?.label}
                                                    </Badge>
                                                </div>

                                                <p className="font-medium mb-1">
                                                    {REASON_LABELS[report.reason] || report.reason}
                                                </p>

                                                <p className="text-sm text-muted-foreground mb-2">
                                                    Reported user: <span className="font-medium">{report.reported_user?.company_name || report.reported_user?.full_name || 'Unknown'}</span>
                                                </p>

                                                {report.details && (
                                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                                        "{report.details}"
                                                    </p>
                                                )}

                                                <p className="text-xs text-muted-foreground mt-2">
                                                    {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                                                    {' • '}
                                                    by {report.reporter?.full_name || 'Anonymous'}
                                                </p>
                                            </div>

                                            {/* Quick Actions */}
                                            {report.status === 'pending' && (
                                                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleQuickAction(report.id, 'reviewed')}
                                                    >
                                                        <Eye size={14} className="mr-1" />
                                                        Review
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="text-muted-foreground"
                                                        onClick={() => handleQuickAction(report.id, 'dismissed')}
                                                    >
                                                        <XCircle size={14} className="mr-1" />
                                                        Dismiss
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-muted-foreground">
                                <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>No reports in this category</p>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </Card>

            {/* Report Detail Dialog */}
            <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Report Details</DialogTitle>
                        <DialogDescription>
                            Review and take action on this report
                        </DialogDescription>
                    </DialogHeader>

                    {selectedReport && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-muted-foreground">Content Type</p>
                                    <p className="font-medium">{selectedReport.content_type}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Reason</p>
                                    <p className="font-medium">{REASON_LABELS[selectedReport.reason]}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Reported User</p>
                                    <p className="font-medium">
                                        {selectedReport.reported_user?.company_name || selectedReport.reported_user?.full_name}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Reporter</p>
                                    <p className="font-medium">{selectedReport.reporter?.full_name}</p>
                                </div>
                            </div>

                            {selectedReport.details && (
                                <div>
                                    <p className="text-muted-foreground text-sm mb-1">Details</p>
                                    <p className="p-3 bg-muted rounded-lg text-sm">{selectedReport.details}</p>
                                </div>
                            )}

                            <div>
                                <p className="text-muted-foreground text-sm mb-2">Resolution Notes</p>
                                <Textarea
                                    value={resolutionNotes}
                                    onChange={(e) => setResolutionNotes(e.target.value)}
                                    placeholder="Add notes about how this was resolved..."
                                    rows={3}
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setSelectedReport(null)}>
                            Cancel
                        </Button>
                        <Button
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => handleQuickAction(selectedReport?.id, 'dismissed')}
                        >
                            Dismiss
                        </Button>
                        <Button onClick={handleResolve}>
                            <CheckCircle size={14} className="mr-2" />
                            Mark Resolved
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
