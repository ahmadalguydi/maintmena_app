import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import { Loader2 } from 'lucide-react';

type LazyLoader<TProps> = () => Promise<{ default: ComponentType<TProps> }>;

export type PreloadableLazyComponent<TProps> = LazyExoticComponent<ComponentType<TProps>> & {
  preload?: () => Promise<unknown>;
};

export const lazyRoute = <TProps,>(loader: LazyLoader<TProps>) => {
  const Component = lazy(loader) as PreloadableLazyComponent<TProps>;
  Component.preload = loader;
  return Component;
};

export const lazyNamedRoute = <TProps, TModule extends Record<string, unknown> = Record<string, unknown>>(
  loader: () => Promise<TModule>,
  exportName: keyof TModule,
) =>
  lazyRoute<TProps>(async () => {
    const module = await loader();
    return { default: module[exportName] as ComponentType<TProps> };
  });

export function RouteLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
