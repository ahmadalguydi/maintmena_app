# Design System Governance

This document outlines the governance policies for the Siqal design system.

## Component Lifecycle

### Statuses

| Status | Description | Usage |
|--------|------------|-------|
| `new` | Recently created, under review | Use with caution |
| `stable` | Production ready | Safe for all use cases |
| `experimental` | Testing new patterns | API may change |
| `deprecated` | Being phased out | Migrate away ASAP |

### Version Policy

We follow semantic versioning:
- **MAJOR** (x.0.0): Breaking API changes
- **MINOR** (0.x.0): New features, backwards compatible
- **PATCH** (0.0.x): Bug fixes

## Adding New Components

### Before Creating a Component

1. **Check the Registry**: Does a similar component exist?
2. **Check Consolidation**: Can an existing component be extended?
3. **Document Intent**: What problem does this solve?

### Component Checklist

- [ ] Added to `component-registry.ts`
- [ ] Follows naming conventions
- [ ] Has RTL support (Arabic)
- [ ] Works on mobile viewport
- [ ] Has loading/error states
- [ ] Uses design tokens (colors, spacing)
- [ ] Documented with JSDoc comments

### Naming Conventions

```
[Domain][Type]
```

Examples:
- `JobCard` - Job domain, Card type
- `QuoteModal` - Quote domain, Modal type
- `BuyerProfile` - Buyer domain, Profile type

## Deprecating Components

### Deprecation Process

1. **Mark in Registry**:
```typescript
{
  status: 'deprecated',
  deprecationInfo: {
    reason: 'Why deprecated',
    migrateFrom: 'Migration instructions',
    replacedBy: 'NewComponent',
    removalVersion: '2.0.0'
  }
}
```

2. **Add Console Warning**: Component should warn when used
3. **Update Documentation**: Mark as deprecated
4. **Communicate**: Notify team in standup/PR
5. **Set Removal Date**: At least 2 sprints notice

### Removal Criteria

A component can be removed when:
- Zero usages in codebase (verified by audit)
- Deprecated for at least 2 release cycles
- Migration path documented and tested

## Component Categories

### `/components/ui` - Primitives
Base UI components from shadcn. **Do not modify** without team approval.

### `/components/mobile` - App Components
Mobile-first app components. Most new work happens here.

### `/components/contracts` - Contract Domain
Contract-specific components. High consistency requirements.

### `/components/layout` - Layout Components
Page layouts, containers, grids.

### `/components/landing` - Marketing
Landing page components. May have different patterns.

### `/components/admin` - Admin Dashboard
Admin-only components. Lower priority for mobile.

## Modal vs Sheet Usage

### When to Use `AppModal` (Dialog)
- **Confirmation dialogs** - "Are you sure?"
- **Form inputs** - Complex forms that need focus
- **Detail views** - Viewing detailed information
- **Desktop-optimized flows** - When user is likely on larger screen

### When to Use `AppSheet` (Drawer)
- **Mobile-first actions** - Quick selections, filters
- **Bottom-up navigation** - Natural thumb reach on mobile
- **List selections** - Choosing from options
- **Quick confirmations** - Completion sheets, success messages

### Unified Component Benefits
The `AppModal` and `AppSheet` components provide:
- ✅ Automatic RTL support
- ✅ Bilingual text patterns
- ✅ Consistent styling
- ✅ Size variants
- ✅ Footer patterns

```tsx
// Example: AppModal
<AppModal
  open={isOpen}
  onOpenChange={setIsOpen}
  title={{ en: "Confirm Action", ar: "تأكيد الإجراء" }}
  currentLanguage={currentLanguage}
>
  <Content />
</AppModal>

// Example: AppSheet
<AppSheet
  open={isOpen}
  onOpenChange={setIsOpen}
  title={{ en: "Select Option", ar: "اختر خياراً" }}
  currentLanguage={currentLanguage}
>
  <Content />
</AppSheet>
```

## Running Audits

### Full Audit
```bash
npx ts-node scripts/audit-components.ts
```

Generates:
- Usage statistics
- Dead code detection
- Consolidation opportunities
- JSON report for tracking

### Quick Check
```bash
grep -r "ComponentName" src/ --include="*.tsx" | wc -l
```

## Breaking Change Policy

### Before Making Breaking Changes

1. Run audit to check impact
2. If >10 usages, consider deprecation instead
3. Document migration path
4. Add to CHANGELOG

### Migration Guides

Create migration guide in `/docs/migrations/`:
```markdown
# Migrating from ComponentV1 to ComponentV2

## What Changed
- Prop `size={12}` → `size="md"`

## Before
<Button size={12}>Click</Button>

## After  
<Button size="md">Click</Button>
```

## Style Drift Prevention

### Design Tokens

Always use tokens from `src/lib/`:
- `colors.ts` - Color palette
- `spacing.ts` - Spacing scale (if exists)
- CSS variables in `index.css`

### Prohibited Patterns

❌ Hard-coded colors: `color: #1a1a1a`
✅ Use tokens: `text-foreground` or `var(--foreground)`

❌ Magic numbers: `padding: 13px`  
✅ Use scale: `p-3` or `p-4`

❌ Inline styles (unless dynamic):
```tsx
// Bad
<div style={{ margin: '20px' }}>

// Good  
<div className="m-5">
```

## Component Consolidation

### When to Consolidate

- 3+ similar components exist (e.g., Button, PrimaryButton, ActionButton)
- Components share >70% of code
- Variants can be expressed as props

### Consolidation Process

1. Create unified component with variants
2. Mark old components as deprecated
3. Migrate each usage
4. Delete old components

## Ownership

| Area | Owner |
|------|-------|
| `/ui` | Core Team |
| `/mobile` | Mobile Team |
| `/contracts` | Contracts Team |
| Registry | Design System Lead |

## Review Checklist

When reviewing component PRs:

- [ ] Follows naming conventions
- [ ] Added to registry if new
- [ ] No style drift (uses tokens)
- [ ] Works in RTL
- [ ] Mobile responsive
- [ ] No prop explosion (max 8-10 props)
- [ ] Documented with JSDoc

---

*Last updated: 2024-12-28*
