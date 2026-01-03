import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Brief {
  id: string;
  title: string;
  content: string;
  publication_date: string;
}

interface Signal {
  id: string;
  company_name: string;
  signal_type: string;
  description: string;
  urgency: string;
  estimated_value: string | null;
  deadline: string | null;
  location: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  source_link: string | null;
}

interface Tender {
  id: string;
  tender_number: string;
  title: string;
  description: string;
  value_min: number | null;
  value_max: number | null;
  submission_deadline: string;
  location: string | null;
  requirements: string | null;
  category: string | null;
  source_link: string | null;
}

export function useBriefData() {
  const [latestBrief, setLatestBrief] = useState<Brief | null>(null);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBriefData();
    setupRealtimeSubscription();
  }, []);

  const fetchBriefData = async () => {
    try {
      // Fetch latest published brief
      const { data: briefData } = await supabase
        .from('briefs')
        .select('*')
        .eq('status', 'published')
        .order('publication_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (briefData) {
        setLatestBrief(briefData);

        // Fetch signals linked to this brief
        const { data: briefSignals } = await supabase
          .from('brief_signals')
          .select('signal_id')
          .eq('brief_id', briefData.id);

        if (briefSignals && briefSignals.length > 0) {
          const signalIds = briefSignals.map(bs => bs.signal_id);
          const { data: signalsData } = await supabase
            .from('signals')
            .select('*')
            .in('id', signalIds)
            .eq('status', 'active')
            .order('created_at', { ascending: false });

          if (signalsData) {
            setSignals(signalsData);
          }
        } else {
          setSignals([]);
        }

        // Fetch tenders linked to this brief
        const { data: briefTenders } = await supabase
          .from('brief_tenders')
          .select('tender_id')
          .eq('brief_id', briefData.id);

        if (briefTenders && briefTenders.length > 0) {
          const tenderIds = briefTenders.map(bt => bt.tender_id);
          const { data: tendersData } = await supabase
            .from('tenders')
            .select('*')
            .in('id', tenderIds)
            .eq('status', 'open')
            .order('submission_deadline', { ascending: true });

          if (tendersData) {
            setTenders(tendersData);
          }
        } else {
          setTenders([]);
        }
      } else {
        setLatestBrief(null);
        setSignals([]);
        setTenders([]);
      }
    } catch (error) {
      console.error('Error fetching brief data:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('brief-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'briefs' },
        () => fetchBriefData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'signals' },
        () => fetchBriefData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tenders' },
        () => fetchBriefData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'brief_signals' },
        () => fetchBriefData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'brief_tenders' },
        () => fetchBriefData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  return {
    latestBrief,
    signals,
    tenders,
    loading,
    refreshData: fetchBriefData
  };
}
