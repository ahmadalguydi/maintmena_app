const prefetchedGroups = new Set<string>();

type ImportTask = () => Promise<unknown>;

const runImportTasks = (tasks: ImportTask[]) => {
  tasks.forEach((task) => {
    void task().catch(() => undefined);
  });
};

export const scheduleIdlePrefetch = (groupKey: string, tasks: ImportTask[]) => {
  if (typeof window === 'undefined' || prefetchedGroups.has(groupKey) || tasks.length === 0) {
    return () => undefined;
  }

  let cancelled = false;
  const run = () => {
    if (cancelled || prefetchedGroups.has(groupKey)) return;
    prefetchedGroups.add(groupKey);
    runImportTasks(tasks);
  };

  if (typeof window.requestIdleCallback === 'function') {
    const handle = window.requestIdleCallback(run, { timeout: 1500 });
    return () => {
      cancelled = true;
      window.cancelIdleCallback?.(handle);
    };
  }

  const timeoutId = window.setTimeout(run, 700);
  return () => {
    cancelled = true;
    window.clearTimeout(timeoutId);
  };
};

export const authEntryPrefetchTasks: ImportTask[] = [
  () => import('@/app/buyer/home/BuyerHome'),
  () => import('@/app/seller/home/SellerHome'),
];

export const buyerCorePrefetchTasks: ImportTask[] = [
  () => import('@/app/buyer/activity/BuyerActivity'),
  () => import('@/app/buyer/requests/RequestDetail'),
  () => import('@/app/shared/MessagesHub'),
  () => import('@/app/shared/MessageThread'),
  () => import('@/components/mobile/ServiceFlowScreen'),
];

export const sellerCorePrefetchTasks: ImportTask[] = [
  () => import('@/app/seller/jobs/ActiveJobs'),
  () => import('@/app/seller/jobs/SellerJobDetail'),
  () => import('@/app/shared/MessagesHub'),
  () => import('@/app/shared/MessageThread'),
  () => import('@/app/seller/profile/SellerProfile'),
];
