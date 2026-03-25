import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  DollarSign, 
  Clock, 
  User, 
  Briefcase, 
  Award, 
  FileText,
  CheckCircle2
} from 'lucide-react';

interface Quote {
  id: string;
  price: number;
  estimated_duration: string;
  proposal: string;
  status: string;
  created_at: string;
  seller_name?: string;
  seller_company?: string;
  cover_letter?: string;
  technical_approach?: string;
  team_experience?: string;
  certifications?: string;
  timeline_details?: string;
  pricing_breakdown?: any;
  client_references?: string;
  custom_sections?: any;
}

interface QuoteDetailModalProps {
  quote: Quote;
  isOpen: boolean;
  onClose: () => void;
}

export const QuoteDetailModal = ({ quote, isOpen, onClose }: QuoteDetailModalProps) => {
  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: any; label: string }> = {
      pending: { variant: 'secondary', label: 'Pending' },
      accepted: { variant: 'default', label: 'Accepted' },
      declined: { variant: 'destructive', label: 'Declined' },
      negotiating: { variant: 'outline', label: 'Negotiating' }
    };
    const s = config[status] || config.pending;
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl">Quote Details</DialogTitle>
            {getStatusBadge(quote.status)}
          </div>
        </DialogHeader>
        
        <ScrollArea className="h-[70vh] pr-4">
          <div className="space-y-6">
            {/* Vendor Info */}
            <div className="bg-muted/30 p-4 rounded-lg">
              <div className="flex items-center gap-3 mb-3">
                <User className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-lg text-ink">Vendor Information</h3>
              </div>
              <div className="space-y-2 text-sm">
                {quote.seller_company && (
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-muted-foreground" />
                    <span className="text-ink font-medium">{quote.seller_company}</span>
                  </div>
                )}
                {quote.seller_name && (
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{quote.seller_name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Price & Timeline */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-5 h-5 text-primary" />
                  <span className="text-sm text-muted-foreground">Total Price</span>
                </div>
                <p className="text-2xl font-bold text-primary">${quote.price.toLocaleString()}</p>
              </div>
              <div className="bg-accent/5 p-4 rounded-lg border border-accent/20">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-accent" />
                  <span className="text-sm text-muted-foreground">Duration</span>
                </div>
                <p className="text-2xl font-bold text-ink">{quote.estimated_duration}</p>
              </div>
            </div>

            {/* Cover Letter */}
            {quote.cover_letter && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-5 h-5 text-accent" />
                    <h3 className="font-semibold text-lg text-ink">Cover Letter</h3>
                  </div>
                  <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {quote.cover_letter}
                  </p>
                </div>
              </>
            )}

            {/* Technical Approach */}
            {quote.technical_approach && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-5 h-5 text-accent" />
                    <h3 className="font-semibold text-lg text-ink">Technical Approach</h3>
                  </div>
                  <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {quote.technical_approach}
                  </p>
                </div>
              </>
            )}

            {/* Team Experience */}
            {quote.team_experience && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <User className="w-5 h-5 text-accent" />
                    <h3 className="font-semibold text-lg text-ink">Team Experience</h3>
                  </div>
                  <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {quote.team_experience}
                  </p>
                </div>
              </>
            )}

            {/* Certifications */}
            {quote.certifications && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Award className="w-5 h-5 text-accent" />
                    <h3 className="font-semibold text-lg text-ink">Certifications</h3>
                  </div>
                  <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {quote.certifications}
                  </p>
                </div>
              </>
            )}

            {/* Timeline Details */}
            {quote.timeline_details && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-5 h-5 text-accent" />
                    <h3 className="font-semibold text-lg text-ink">Timeline Details</h3>
                  </div>
                  <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {quote.timeline_details}
                  </p>
                </div>
              </>
            )}

            {/* Pricing Breakdown */}
            {quote.pricing_breakdown && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <DollarSign className="w-5 h-5 text-accent" />
                    <h3 className="font-semibold text-lg text-ink">Pricing Breakdown</h3>
                  </div>
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <pre className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {JSON.stringify(quote.pricing_breakdown, null, 2)}
                    </pre>
                  </div>
                </div>
              </>
            )}

            {/* Client References */}
            {quote.client_references && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Briefcase className="w-5 h-5 text-accent" />
                    <h3 className="font-semibold text-lg text-ink">Client References</h3>
                  </div>
                  <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {quote.client_references}
                  </p>
                </div>
              </>
            )}

            {/* Proposal (fallback if no cover letter) */}
            {!quote.cover_letter && quote.proposal && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-5 h-5 text-accent" />
                    <h3 className="font-semibold text-lg text-ink">Proposal</h3>
                  </div>
                  <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {quote.proposal}
                  </p>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
