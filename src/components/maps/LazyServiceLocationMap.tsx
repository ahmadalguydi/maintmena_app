import { Suspense, lazy } from 'react';
import type { ServiceLocationMapProps } from './ServiceLocationMap';

const ServiceLocationMap = lazy(async () => {
  const module = await import('./ServiceLocationMap');
  return { default: module.ServiceLocationMap };
});

export function LazyServiceLocationMap(props: ServiceLocationMapProps) {
  const heightClassName = props.heightClassName ?? 'h-40';

  return (
    <Suspense
      fallback={
        <div
          className={`relative overflow-hidden rounded-[28px] border border-border/50 bg-[linear-gradient(180deg,rgba(255,247,237,0.95),rgba(255,255,255,0.98))] shadow-[0_18px_40px_rgba(0,0,0,0.06)] ${props.className ?? ''}`}
        >
          <div className={`relative w-full animate-pulse bg-muted/40 ${heightClassName}`} />
        </div>
      }
    >
      <ServiceLocationMap {...props} />
    </Suspense>
  );
}
