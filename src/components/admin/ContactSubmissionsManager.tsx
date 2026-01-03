import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Mail, Calendar, Building2, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  company: string | null;
  subject: string;
  message: string;
  status: 'new' | 'in_progress' | 'resolved';
  created_at: string;
}

export const ContactSubmissionsManager = () => {
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<ContactSubmission | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    const { data, error } = await supabase
      .from('contact_form_submissions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching submissions:', error);
      return;
    }

    setSubmissions((data || []) as ContactSubmission[]);
  };

  const updateStatus = async (id: string, status: 'new' | 'in_progress' | 'resolved') => {
    try {
      const { error } = await supabase
        .from('contact_form_submissions')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Status updated successfully'
      });

      fetchSubmissions();
      if (selectedSubmission?.id === id) {
        setSelectedSubmission({ ...selectedSubmission, status });
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive'
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-green-500';
      case 'in_progress':
        return 'bg-yellow-500';
      case 'resolved':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const filteredSubmissions = submissions.filter(
    (s) => statusFilter === 'all' || s.status === statusFilter
  );

  return (
    <>
      <div className="space-y-6">
        {/* Filter Buttons */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('all')}
            size="sm"
          >
            All ({submissions.length})
          </Button>
          <Button
            variant={statusFilter === 'new' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('new')}
            size="sm"
          >
            New ({submissions.filter((s) => s.status === 'new').length})
          </Button>
          <Button
            variant={statusFilter === 'in_progress' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('in_progress')}
            size="sm"
          >
            In Progress ({submissions.filter((s) => s.status === 'in_progress').length})
          </Button>
          <Button
            variant={statusFilter === 'resolved' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('resolved')}
            size="sm"
          >
            Resolved ({submissions.filter((s) => s.status === 'resolved').length})
          </Button>
        </div>

        {/* Submissions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSubmissions.map((submission) => (
            <Card
              key={submission.id}
              className="p-4 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setSelectedSubmission(submission)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium text-sm">{submission.name}</span>
                </div>
                <Badge
                  className={`${getStatusColor(submission.status)} text-white text-xs`}
                >
                  {submission.status.replace('_', ' ')}
                </Badge>
              </div>

              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  <span className="truncate">{submission.email}</span>
                </div>
                {submission.company && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Building2 className="w-4 h-4" />
                    <span className="truncate">{submission.company}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(submission.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              <p className="font-medium text-sm mb-2">{submission.subject}</p>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {submission.message}
              </p>
            </Card>
          ))}
        </div>

        {filteredSubmissions.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No contact submissions found
          </div>
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Contact Submission Details</DialogTitle>
          </DialogHeader>
          
          {selectedSubmission && (
            <ScrollArea className="max-h-[70vh] pr-4">
              <div className="space-y-4">
                {/* Status Actions */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={selectedSubmission.status === 'new' ? 'default' : 'outline'}
                    onClick={() => updateStatus(selectedSubmission.id, 'new')}
                  >
                    New
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedSubmission.status === 'in_progress' ? 'default' : 'outline'}
                    onClick={() => updateStatus(selectedSubmission.id, 'in_progress')}
                  >
                    In Progress
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedSubmission.status === 'resolved' ? 'default' : 'outline'}
                    onClick={() => updateStatus(selectedSubmission.id, 'resolved')}
                  >
                    Resolved
                  </Button>
                </div>

                {/* Contact Info */}
                <Card className="p-4">
                  <h4 className="font-medium mb-3">Contact Information</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{selectedSubmission.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <a 
                        href={`mailto:${selectedSubmission.email}`}
                        className="text-accent hover:underline"
                      >
                        {selectedSubmission.email}
                      </a>
                    </div>
                    {selectedSubmission.company && (
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <span>{selectedSubmission.company}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span>{new Date(selectedSubmission.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                </Card>

                {/* Message */}
                <Card className="p-4">
                  <h4 className="font-medium mb-2">Subject</h4>
                  <p className="text-muted-foreground mb-4">{selectedSubmission.subject}</p>
                  
                  <h4 className="font-medium mb-2">Message</h4>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {selectedSubmission.message}
                  </p>
                </Card>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
