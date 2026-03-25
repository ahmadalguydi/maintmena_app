# Contributing to Siqal Components

## Quick Reference

### Before Creating a New Component

```bash
# 1. Check if similar component exists
grep -r "YourComponentName" src/components/ --include="*.tsx"

# 2. Check the registry
cat src/lib/component-registry.ts | grep -i "similar"

# 3. If truly new, follow the template below
```

### Component Template

```tsx
/**
 * ComponentName
 * 
 * Brief description of what this component does.
 * 
 * @example
 * <ComponentName variant="primary" size="md">
 *   Content
 * </ComponentName>
 * 
 * @prop variant - 'primary' | 'secondary' (default: 'primary')
 * @prop size - 'sm' | 'md' | 'lg' (default: 'md')
 */

import { cn } from '@/lib/utils';

interface ComponentNameProps {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
}

export function ComponentName({
  variant = 'primary',
  size = 'md',
  children,
  className,
}: ComponentNameProps) {
  return (
    <div
      className={cn(
        // Base styles
        'rounded-lg transition-all',
        // Variant styles
        variant === 'primary' && 'bg-primary text-primary-foreground',
        variant === 'secondary' && 'bg-secondary text-secondary-foreground',
        // Size styles
        size === 'sm' && 'p-2 text-sm',
        size === 'md' && 'p-4 text-base',
        size === 'lg' && 'p-6 text-lg',
        // Custom className
        className
      )}
    >
      {children}
    </div>
  );
}
```

### After Creating a Component

1. **Add to Registry** (`src/lib/component-registry.ts`):
```typescript
ComponentName: {
  name: 'ComponentName',
  version: '1.0.0',
  status: 'new',
  category: 'mobile',
  description: 'What it does',
  author: 'your-name',
  createdAt: '2024-12-28',
  lastModified: '2024-12-28',
  dependencies: [],
},
```

2. **Test RTL** - View component in Arabic mode
3. **Test Mobile** - Check on 375px viewport

## Component Guidelines

### ✅ DO

- Use `cn()` for conditional classes
- Accept `className` prop for customization
- Use design tokens (colors, spacing)
- Support RTL with `text-start`/`text-end`
- Keep props under 10
- Use TypeScript strict types

### ❌ DON'T

- Hardcode colors (`#1a1a1a`)
- Use magic numbers (`margin: 13px`)
- Create component when variant works
- Ignore mobile viewport
- Skip TypeScript types

## Deprecating Components

```typescript
// In the component file
/**
 * @deprecated Use NewComponent instead
 * Migration: Replace <OldComponent> with <NewComponent variant="legacy">
 */
export function OldComponent(props: OldComponentProps) {
  if (process.env.NODE_ENV === 'development') {
    console.warn('OldComponent is deprecated. Use NewComponent instead.');
  }
  // ...implementation
}
```

## Running Audit

```bash
# Full component audit
npx ts-node scripts/audit-components.ts

# Results saved to component-audit-report.json
```

## Questions?

- Check `docs/DESIGN_SYSTEM_GOVERNANCE.md`
- Ask in team chat
- Review existing similar components
