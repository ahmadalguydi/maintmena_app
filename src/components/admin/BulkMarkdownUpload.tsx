import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

interface ParsedItem {
  type: 'signal' | 'tender' | 'brief' | 'event' | 'report' | 'education' | 'template';
  data: any;
  rawText: string;
}

const BulkMarkdownUpload = () => {
  const [markdownContent, setMarkdownContent] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<{ success: number; failed: number; items: any[] }>({
    success: 0,
    failed: 0,
    items: []
  });

  const parseMarkdown = (content: string): ParsedItem[] => {
    const items: ParsedItem[] = [];
    const sections = content.split(/^##\s+/m).filter(s => s.trim());

    sections.forEach(section => {
      const lines = section.trim().split('\n');
      const title = lines[0].trim();
      const typeMatch = title.match(/\[(signal|tender|brief|event|report|education|template)\]/i);
      
      if (!typeMatch) return;

      const type = typeMatch[1].toLowerCase() as 'signal' | 'tender' | 'brief' | 'event' | 'report' | 'education' | 'template';
      const data: any = {};
      let currentField = '';
      let currentValue = '';

      lines.slice(1).forEach(line => {
        const fieldMatch = line.match(/^\*\*(.+?):\*\*\s*(.*)$/);
        if (fieldMatch) {
          if (currentField && currentValue) {
            data[currentField] = currentValue.trim();
          }
          // Normalize field names to handle variations
          let fieldName = fieldMatch[1].toLowerCase().replace(/\s+/g, '_');
          // Handle common variations
          fieldName = fieldName
            .replace(/^estimated_value_min$/, 'value_min')
            .replace(/^estimated_value_max$/, 'value_max')
            .replace(/^min_value$/, 'value_min')
            .replace(/^max_value$/, 'value_max')
            .replace(/^contact_person$/, 'contact_name')
            .replace(/^person$/, 'contact_name')
            .replace(/^type$/, 'signal_type')
            .replace(/^number$/, 'tender_number')
            .replace(/^company$/, 'company_name')
            .replace(/^source$/, 'source_link')
            .replace(/^link$/, 'source_link');
          
          currentField = fieldName;
          currentValue = fieldMatch[2];
        } else if (currentField) {
          currentValue += '\n' + line;
        }
      });

      if (currentField && currentValue) {
        data[currentField] = currentValue.trim();
      }

      // Parse action items if present
      if (data.action_items) {
        const actionLines = data.action_items.split('\n').filter((l: string) => l.trim().startsWith('-'));
        data.action_items = actionLines.map((line: string, index: number) => {
          const cleaned = line.replace(/^-\s*/, '').trim();
          const priorityMatch = cleaned.match(/\[(.+?)\]/);
          const priority = priorityMatch ? priorityMatch[1].toLowerCase() : 'medium';
          const description = cleaned.replace(/\[.+?\]\s*/, '');
          
          return {
            title: description.substring(0, 50),
            description,
            priority,
            completed: false,
            order: index
          };
        });
      }

      items.push({ type, data, rawText: section });
    });

    return items;
  };

  const insertSignal = async (data: any) => {
    const { error } = await supabase.from('signals').insert({
      company_name: data.company_name,
      signal_type: data.signal_type,
      description: data.description,
      urgency: data.urgency || 'medium',
      estimated_value: data.estimated_value,
      deadline: data.deadline ? new Date(data.deadline).toISOString() : null,
      location: data.location,
      contact_name: data.contact_name,
      contact_email: data.contact_email,
      contact_phone: data.contact_phone,
      source_link: data.source_link || null,
      status: data.status || 'active',
      action_items: data.action_items || []
    });
    return error;
  };

  const insertTender = async (data: any) => {
    const { error } = await supabase.from('tenders').insert({
      tender_number: data.tender_number,
      title: data.title,
      description: data.description,
      value_min: data.value_min ? parseFloat(data.value_min) : null,
      value_max: data.value_max ? parseFloat(data.value_max) : null,
      submission_deadline: data.submission_deadline ? new Date(data.submission_deadline).toISOString() : new Date().toISOString(),
      location: data.location,
      requirements: data.requirements,
      category: data.category || 'general',
      source_link: data.source_link || null,
      status: data.status || 'open',
      action_items: data.action_items || []
    });
    return error;
  };

  const insertBrief = async (data: any) => {
    const { error } = await supabase.from('briefs').insert({
      title: data.title,
      content: data.content || data.description,
      category: data.category || 'general',
      author: data.author || 'Admin',
      published_at: data.published_at ? new Date(data.published_at).toISOString() : new Date().toISOString(),
      is_published: data.is_published !== 'false'
    });
    return error;
  };

  const insertEvent = async (data: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { message: 'User not authenticated' };
    
    const { error } = await supabase.from('calendar_events').insert([{
      title: data.title || 'Event',
      event_date: data.event_date ? new Date(data.event_date).toISOString() : new Date().toISOString(),
      description: data.description || '',
      event_type: data.category || 'deadline',
      location: data.location || null,
      user_id: user.id
    }]);
    return error;
  };

  const insertReport = async (data: any) => {
    const { error } = await supabase.from('industry_reports').insert({
      title: data.title,
      description: data.description,
      category: data.category || 'general',
      report_type: data.report_type || 'analysis',
      file_url: data.file_url || null,
      thumbnail_url: data.thumbnail_url || null,
      preview_content: data.preview_content || null,
      access_tier: data.access_tier || 'professional',
      status: data.status || 'published',
      publication_date: data.publication_date ? new Date(data.publication_date).toISOString() : new Date().toISOString()
    });
    return error;
  };

  const insertEducation = async (data: any) => {
    const { error } = await supabase.from('educational_content').insert({
      title: data.title,
      description: data.description,
      category: data.category || 'general',
      content_type: data.content_type || 'article',
      video_url: data.video_url || null,
      transcript_url: data.transcript_url || null,
      thumbnail_url: data.thumbnail_url || null,
      duration_minutes: data.duration_minutes ? parseInt(data.duration_minutes) : null,
      access_tier: data.access_tier || 'free',
      status: data.status || 'published'
    });
    return error;
  };

  const insertTemplate = async (data: any) => {
    const { error } = await supabase.from('templates_guides').insert({
      title: data.title,
      description: data.description,
      category: data.category || 'general',
      file_type: data.file_type || 'pdf',
      file_url: data.file_url || null,
      thumbnail_url: data.thumbnail_url || null,
      access_tier: data.access_tier || 'free',
      status: data.status || 'published'
    });
    return error;
  };

  const handleUpload = async () => {
    if (!markdownContent.trim()) {
      toast.error('Please paste markdown content');
      return;
    }

    setIsProcessing(true);
    const parsedItems = parseMarkdown(markdownContent);
    
    if (parsedItems.length === 0) {
      toast.error('No valid items found in markdown');
      setIsProcessing(false);
      return;
    }

    let success = 0;
    let failed = 0;
    const processedItems: any[] = [];

    for (const item of parsedItems) {
      let error = null;
      
      try {
        switch (item.type) {
          case 'signal':
            error = await insertSignal(item.data);
            break;
          case 'tender':
            error = await insertTender(item.data);
            break;
          case 'brief':
            error = await insertBrief(item.data);
            break;
          case 'event':
            error = await insertEvent(item.data);
            break;
          case 'report':
            error = await insertReport(item.data);
            break;
          case 'education':
            error = await insertEducation(item.data);
            break;
          case 'template':
            error = await insertTemplate(item.data);
            break;
        }

        if (error) {
          failed++;
          processedItems.push({ ...item, status: 'failed', error: error.message });
        } else {
          success++;
          processedItems.push({ ...item, status: 'success' });
        }
      } catch (e: any) {
        failed++;
        processedItems.push({ ...item, status: 'failed', error: e.message });
      }
    }

    setResults({ success, failed, items: processedItems });
    setIsProcessing(false);
    
    if (success > 0) {
      toast.success(`Successfully published ${success} item(s)`);
    }
    if (failed > 0) {
      toast.error(`Failed to publish ${failed} item(s)`);
    }
  };

  const exampleMarkdown = `## [Signal] SWCC Water Treatment Expansion
**Company:** SWCC
**Signal Type:** Expansion
**Description:** Major water treatment plant expansion in Rabigh targeting 100,000 m³/day capacity increase using advanced RO technology
**Urgency:** high
**Estimated Value:** 50M SAR
**Deadline:** 2024-12-31
**Location:** Rabigh, KSA
**Contact Name:** Ahmad Ali
**Contact Email:** ahmad@swcc.gov.sa
**Contact Phone:** +966-12-3456789
**Source Link:** https://swcc.gov.sa/projects/rabigh-expansion
**Status:** active
**Action Items:**
- [high] Prepare comprehensive technical proposal with capacity analysis
- [high] Obtain pre-qualification documents
- [medium] Schedule site visit and conduct feasibility study
- [medium] Prepare cost breakdown and timeline
- [low] Review contract terms and conditions

## [Tender] Industrial Cooling System Installation
**Tender Number:** TND-2024-001
**Title:** Industrial Cooling System Installation for Petrochemical Complex
**Description:** Design, supply, installation and commissioning of a complete industrial cooling system for a petrochemical facility including chillers, cooling towers, pumps, and distribution network
**Value Min:** 20000000
**Value Max:** 35000000
**Submission Deadline:** 2024-11-30
**Location:** Jubail Industrial City
**Category:** HVAC
**Requirements:** ISO 9001 certification, minimum 10 years experience in industrial cooling, proven track record with petrochemical projects
**Source Link:** https://tender.gov.sa/TND-2024-001
**Status:** open
**Action Items:**
- [high] Submit pre-qualification documents by first deadline
- [high] Conduct detailed site survey
- [medium] Prepare technical specifications and drawings
- [medium] Obtain equipment quotations from suppliers
- [low] Review safety and compliance requirements

## [Report] Q4 2024 Saudi Facilities Management Market Analysis
**Title:** Q4 2024 Saudi Arabia Facilities Management Market Outlook
**Description:** Comprehensive analysis of the Saudi FM market covering growth trends, key players, emerging technologies, and investment opportunities. Includes detailed sector breakdowns for healthcare, education, hospitality, and industrial facilities.
**Category:** Market Analysis
**Report Type:** Market Analysis
**Preview Content:** The Saudi facilities management market is projected to reach SAR 45 billion by 2025, driven by Vision 2030 initiatives and smart city developments. Key growth areas include integrated facility management (IFM) solutions and technology-enabled services...
**File URL:** https://example.com/reports/q4-2024-fm-analysis.pdf
**Thumbnail URL:** https://example.com/thumbnails/report-q4-2024.jpg
**Access Tier:** professional
**Status:** published
**Publication Date:** 2024-10-15

## [Education] Advanced HVAC System Design Course
**Title:** Advanced HVAC System Design for Commercial Buildings
**Description:** Comprehensive 8-module course covering modern HVAC design principles, load calculations, equipment selection, energy efficiency strategies, and compliance with Saudi building codes. Includes practical case studies and design software tutorials.
**Category:** Technical Training
**Content Type:** course
**Video URL:** https://example.com/courses/hvac-advanced/intro.mp4
**Duration Minutes:** 480
**Access Tier:** basic
**Status:** published

## [Template] Maintenance Contract Template
**Title:** Comprehensive Facilities Maintenance Contract Template
**Description:** Professional, legally-vetted maintenance contract template designed for Saudi market. Includes clauses for scope of work, performance metrics, payment terms, warranty, insurance requirements, and dispute resolution. Available in English and Arabic. Fully editable Word format.
**Category:** Contracts
**File Type:** docx
**File URL:** https://example.com/templates/maintenance-contract-2024.docx
**Thumbnail URL:** https://example.com/thumbnails/contract-template.jpg
**Access Tier:** free
**Status:** published`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Bulk Markdown Upload
          </CardTitle>
          <CardDescription>
            Upload multiple signals, tenders, briefs, or events at once using markdown format
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Paste Markdown Content</label>
            <Textarea
              value={markdownContent}
              onChange={(e) => setMarkdownContent(e.target.value)}
              placeholder={exampleMarkdown}
              className="min-h-[300px] font-mono text-sm"
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleUpload} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload & Publish
                </>
              )}
            </Button>
            <Button variant="outline" onClick={() => setMarkdownContent(exampleMarkdown)}>
              <FileText className="w-4 h-4 mr-2" />
              Load Example
            </Button>
          </div>

          {results.items.length > 0 && (
            <div className="mt-6 space-y-4">
              <div className="flex gap-4">
                <Badge variant="default" className="gap-1">
                  <CheckCircle className="w-3 h-3" />
                  {results.success} Success
                </Badge>
                {results.failed > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {results.failed} Failed
                  </Badge>
                )}
              </div>

              <div className="space-y-2">
                {results.items.map((item, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${
                      item.status === 'success'
                        ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800'
                        : 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{item.type}</Badge>
                          {item.status === 'success' ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-red-600" />
                          )}
                        </div>
                        <p className="text-sm mt-1 font-medium">
                          {item.data.title || item.data.company_name || 'Untitled'}
                        </p>
                        {item.error && (
                          <p className="text-xs text-red-600 mt-1">{item.error}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">📋 Complete Markdown Format Guide</CardTitle>
          <CardDescription>Comprehensive reference for all supported content types</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Format */}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Basic Format</h4>
            <div className="bg-muted/50 p-3 rounded text-xs space-y-1">
              <p>• Start each item: <code className="bg-background px-2 py-1 rounded">## [type] Title</code></p>
              <p>• Fields format: <code className="bg-background px-2 py-1 rounded">**Field Name:** Value</code></p>
              <p>• Multi-line values: Continue on next lines without prefix</p>
              <p>• Action items: <code className="bg-background px-2 py-1 rounded">- [priority] Description</code></p>
            </div>
          </div>

          {/* Supported Types */}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Supported Content Types</h4>
            <div className="flex flex-wrap gap-2">
              <Badge variant="default">signal</Badge>
              <Badge variant="default">tender</Badge>
              <Badge variant="default">brief</Badge>
              <Badge variant="default">event</Badge>
              <Badge variant="default">report</Badge>
              <Badge variant="default">education</Badge>
              <Badge variant="default">template</Badge>
            </div>
          </div>

          {/* Signal Fields */}
          <div className="space-y-2 border-l-2 border-primary pl-3">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Badge variant="outline">signal</Badge> Market Signals
            </h4>
            <div className="text-xs space-y-1 text-muted-foreground">
              <p><strong>Required:</strong> Company, Signal Type, Description, Urgency</p>
              <p><strong>Optional:</strong> Estimated Value, Deadline, Location, Contact Name/Email/Phone, Source Link, Status, Action Items</p>
              <p><strong>Urgency values:</strong> low, medium, high, critical</p>
              <p><strong>Signal Types:</strong> Expansion, New Project, Renovation, Contract Renewal, Emergency</p>
              <p><strong>Note:</strong> "Company" can also be written as "Company Name"</p>
              <p><strong>Note:</strong> "Contact Name" can also be written as "Contact Person"</p>
              <p><strong>Note:</strong> "Source Link" can also be written as "Source" or "Link"</p>
            </div>
          </div>

          {/* Tender Fields */}
          <div className="space-y-2 border-l-2 border-amber-500 pl-3">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Badge variant="outline">tender</Badge> Tenders
            </h4>
            <div className="text-xs space-y-1 text-muted-foreground">
              <p><strong>Required:</strong> Tender Number, Title, Description, Submission Deadline</p>
              <p><strong>Optional:</strong> Value Min, Value Max, Location, Requirements, Category, Source Link, Status, Action Items</p>
              <p><strong>Value Format:</strong> Numbers only (e.g., 20000000 for 20M)</p>
              <p><strong>Categories:</strong> HVAC, Electrical, Plumbing, General Maintenance, Cleaning, Security</p>
              <p><strong>Status:</strong> open, closed, awarded</p>
              <p><strong>Note:</strong> "Value Min/Max" can also be written as "Estimated Value Min/Max" or "Min/Max Value"</p>
              <p><strong>Note:</strong> "Source Link" can also be written as "Source" or "Link"</p>
            </div>
          </div>

          {/* Brief Fields */}
          <div className="space-y-2 border-l-2 border-purple-500 pl-3">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Badge variant="outline">brief</Badge> Weekly Briefs
            </h4>
            <div className="text-xs space-y-1 text-muted-foreground">
              <p><strong>Required:</strong> Title, Content</p>
              <p><strong>Optional:</strong> Category, Author, Published At, Is Published</p>
              <p><strong>Categories:</strong> Market Update, Industry News, Regulatory, Technology, Best Practices</p>
            </div>
          </div>

          {/* Report Fields */}
          <div className="space-y-2 border-l-2 border-pink-500 pl-3">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Badge variant="outline">report</Badge> Industry Reports
            </h4>
            <div className="text-xs space-y-1 text-muted-foreground">
              <p><strong>Required:</strong> Title, Description, Category, Report Type</p>
              <p><strong>Optional:</strong> File URL, Thumbnail URL, Preview Content, Access Tier, Publication Date</p>
              <p><strong>Report Types:</strong> Market Analysis, Technical Guide, Case Study, Trends Report, Forecast</p>
              <p><strong>Access Tiers:</strong> free, basic, professional, enterprise</p>
            </div>
          </div>

          {/* Education Fields */}
          <div className="space-y-2 border-l-2 border-indigo-500 pl-3">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Badge variant="outline">education</Badge> Educational Content
            </h4>
            <div className="text-xs space-y-1 text-muted-foreground">
              <p><strong>Required:</strong> Title, Description, Category, Content Type</p>
              <p><strong>Optional:</strong> Video URL, Transcript URL, Thumbnail URL, Duration Minutes, Access Tier</p>
              <p><strong>Content Types:</strong> course, webinar, tutorial, guide, article</p>
              <p><strong>Categories:</strong> Technical Training, Business Skills, Safety, Compliance, Software</p>
            </div>
          </div>

          {/* Template Fields */}
          <div className="space-y-2 border-l-2 border-cyan-500 pl-3">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Badge variant="outline">template</Badge> Templates & Guides
            </h4>
            <div className="text-xs space-y-1 text-muted-foreground">
              <p><strong>Required:</strong> Title, Description, Category, File Type</p>
              <p><strong>Optional:</strong> File URL, Thumbnail URL, Access Tier</p>
              <p><strong>File Types:</strong> pdf, docx, xlsx, pptx, zip</p>
              <p><strong>Categories:</strong> Contracts, Checklists, Proposals, Reports, Forms, Specifications</p>
            </div>
          </div>

          {/* Event Fields */}
          <div className="space-y-2 border-l-2 border-orange-500 pl-3">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Badge variant="outline">event</Badge> Calendar Events
            </h4>
            <div className="text-xs space-y-1 text-muted-foreground">
              <p><strong>Required:</strong> Title, Event Date</p>
              <p><strong>Optional:</strong> Description, Category, Location</p>
              <p><strong>Categories:</strong> deadline, meeting, conference, training, inspection</p>
              <p><strong>Date Format:</strong> YYYY-MM-DD or YYYY-MM-DD HH:MM:SS</p>
            </div>
          </div>

          {/* Flexible Field Names */}
          <div className="bg-emerald-50 dark:bg-emerald-950 p-3 rounded space-y-2">
            <h4 className="font-semibold text-sm text-emerald-900 dark:text-emerald-100">🔄 Flexible Field Names</h4>
            <p className="text-xs text-emerald-800 dark:text-emerald-200">The system accepts multiple variations for field names to reduce errors:</p>
            <div className="grid grid-cols-2 gap-2 text-xs text-emerald-800 dark:text-emerald-200">
              <div>
                <p><strong>Tender Values:</strong></p>
                <p>• "Value Min" = "Estimated Value Min" = "Min Value"</p>
                <p>• "Value Max" = "Estimated Value Max" = "Max Value"</p>
              </div>
              <div>
                <p><strong>Contact Info:</strong></p>
                <p>• "Contact Name" = "Contact Person" = "Person"</p>
              </div>
              <div>
                <p><strong>Identifiers:</strong></p>
                <p>• "Company" = "Company Name"</p>
                <p>• "Number" = "Tender Number"</p>
              </div>
              <div>
                <p><strong>Types:</strong></p>
                <p>• "Type" (in signals) = "Signal Type"</p>
              </div>
              <div>
                <p><strong>Links:</strong></p>
                <p>• "Source Link" = "Source" = "Link"</p>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded space-y-2">
            <h4 className="font-semibold text-sm text-blue-900 dark:text-blue-100">💡 Pro Tips</h4>
            <ul className="text-xs space-y-1 text-blue-800 dark:text-blue-200">
              <li>• <strong>Test first:</strong> Upload one item to verify format before bulk uploading</li>
              <li>• <strong>Field names:</strong> System accepts variations (e.g., "Value Min" or "Min Value")</li>
              <li>• <strong>Dates:</strong> Use YYYY-MM-DD format for consistency</li>
              <li>• <strong>Numbers:</strong> Remove currency symbols and commas (e.g., 25000000 not 25,000,000 SAR)</li>
              <li>• <strong>Multi-line:</strong> Continue text on next lines without ** prefix for long descriptions</li>
              <li>• <strong>Action items:</strong> Use priorities [high], [medium], [low] to guide users</li>
              <li>• <strong>Optional fields:</strong> Leave out any fields you don't have data for</li>
              <li>• <strong>Batch size:</strong> Upload 5-10 items at a time for better error tracking</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BulkMarkdownUpload;
