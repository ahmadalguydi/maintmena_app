import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type SubscriptionTier = 'free' | 'starter' | 'comfort' | 'priority' | 'professional' | 'elite' | 'basic' | 'enterprise';

export interface Subscription {
  id: string;
  user_id: string;
  tier: string;
  status: string;
  trial_ends_at: string | null;
  subscription_ends_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnTrial, setIsOnTrial] = useState(false);
  const [daysLeftInTrial, setDaysLeftInTrial] = useState<number | null>(null);

  useEffect(() => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    fetchSubscription();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('subscription-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchSubscription();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchSubscription = async () => {
    if (!user) return;

    try {
      const { data, error } = await (supabase as any)
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      setSubscription(data);

      // Check if on trial
      if (data?.trial_ends_at) {
        const trialEnd = new Date(data.trial_ends_at);
        const now = new Date();
        const isActive = trialEnd > now;
        setIsOnTrial(isActive);

        if (isActive) {
          const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          setDaysLeftInTrial(daysLeft);
        } else {
          setDaysLeftInTrial(null);
        }
      } else {
        setIsOnTrial(false);
        setDaysLeftInTrial(null);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasAccess = (requiredTier: SubscriptionTier): boolean => {
    // Allow free tier content for everyone
    if (requiredTier === 'free') return true;

    // If user is authenticated, allow basic tier access by default
    if (!subscription && user) {
      return requiredTier === 'basic';
    }

    if (!subscription || subscription.status !== 'active') return false;

    // Align with backend has_subscription_access logic:
    // Access granted if either trial is valid OR paid subscription is valid
    const now = new Date();
    const trialOk = !subscription.trial_ends_at || new Date(subscription.trial_ends_at) > now;
    const paidOk = !subscription.subscription_ends_at || new Date(subscription.subscription_ends_at) > now;

    // If both trial and paid subscription are expired/invalid, deny access
    if (!trialOk && !paidOk) return false;

    const tierHierarchy: Record<string, number> = {
      free: 0,
      starter: 0,
      basic: 1,       // backward compatibility
      comfort: 1,     // buyer tier 1
      priority: 2,    // buyer tier 2
      professional: 1, // seller tier 1
      enterprise: 2,  // backward compatibility
      elite: 2        // seller tier 2
    };

    const currentTierLevel = tierHierarchy[subscription.tier] || 0;
    const requiredTierLevel = tierHierarchy[requiredTier] || 0;

    return currentTierLevel >= requiredTierLevel;
  };

  const updateSubscriptionTier = async (tier: SubscriptionTier) => {
    if (!user) return { error: 'Not authenticated' };

    try {
      const { error } = await (supabase as any)
        .from('subscriptions')
        .update({
          tier,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      await fetchSubscription();
      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  };

  const cancelSubscription = async () => {
    if (!user) return { error: 'Not authenticated' };

    try {
      const { error } = await (supabase as any)
        .from('subscriptions')
        .update({
          tier: 'free',
          status: 'cancelled',
          subscription_ends_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      await fetchSubscription();
      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  };

  return {
    subscription,
    loading,
    isOnTrial,
    daysLeftInTrial,
    hasAccess,
    updateSubscriptionTier,
    cancelSubscription,
    refetch: fetchSubscription
  };
}
