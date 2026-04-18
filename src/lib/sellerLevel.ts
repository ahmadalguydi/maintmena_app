/**
 * Unified seller trust level system.
 *
 * Levels are designed around psychological milestones:
 * - New (0-2): just started, building first impressions
 * - Rising (3-9): gaining momentum, proving reliability
 * - Pro (10-24): established track record, trusted by repeat buyers
 * - Expert (25-49): top-tier, buyers feel confident booking sight-unseen
 * - Master (50+): elite status, aspirational for other sellers
 *
 * Thresholds are set so sellers hit "Rising" quickly (3 jobs) for early
 * motivation, then feel a meaningful achievement at "Pro" (10 jobs).
 * The gap between Pro→Expert and Expert→Master is longer to maintain prestige.
 */

export interface SellerLevel {
  key: 'new' | 'rising' | 'pro' | 'expert' | 'master';
  label: string;
  labelAr: string;
  badge: string;
  ring: string;
  color: string;
  /** Jobs needed to reach this level */
  threshold: number;
}

const LEVELS: SellerLevel[] = [
  { key: 'master',  label: 'Master',  labelAr: 'خبير متميز', badge: '👑', ring: 'ring-amber-400',   color: 'text-amber-600',  threshold: 50 },
  { key: 'expert',  label: 'Expert',  labelAr: 'خبير',       badge: '💎', ring: 'ring-purple-400',  color: 'text-purple-600', threshold: 25 },
  { key: 'pro',     label: 'Pro',     labelAr: 'محترف',      badge: '🔥', ring: 'ring-blue-400',    color: 'text-blue-600',   threshold: 10 },
  { key: 'rising',  label: 'Rising',  labelAr: 'صاعد',       badge: '⚡', ring: 'ring-emerald-400', color: 'text-emerald-600', threshold: 3 },
  { key: 'new',     label: 'New',     labelAr: 'جديد',       badge: '🌱', ring: 'ring-slate-300',   color: 'text-slate-500',  threshold: 0 },
];

/** Get the seller's current trust level based on completed jobs. */
export function getSellerLevel(completedJobs: number): SellerLevel {
  for (const level of LEVELS) {
    if (completedJobs >= level.threshold) return level;
  }
  return LEVELS[LEVELS.length - 1];
}

/** Get progress toward the next level. Returns null if already at max. */
export function getSellerLevelProgress(completedJobs: number): {
  current: SellerLevel;
  next: SellerLevel | null;
  /** Jobs completed within current level range */
  progress: number;
  /** Total jobs needed within current level range */
  total: number;
  /** 0-100 percentage */
  percentage: number;
  /** Jobs remaining to next level */
  remaining: number;
} {
  const current = getSellerLevel(completedJobs);

  // Find the next level above current
  const currentIdx = LEVELS.indexOf(current);
  const next = currentIdx > 0 ? LEVELS[currentIdx - 1] : null;

  if (!next) {
    return { current, next: null, progress: 0, total: 0, percentage: 100, remaining: 0 };
  }

  const progress = completedJobs - current.threshold;
  const total = next.threshold - current.threshold;
  const percentage = Math.round((progress / total) * 100);
  const remaining = next.threshold - completedJobs;

  return { current, next, progress, total, percentage, remaining };
}
