/**
 * Component Registry
 * 
 * Central registry for all design system components.
 * Tracks metadata, versions, and status for governance.
 * 
 * This file should be updated when:
 * - New components are added
 * - Components are deprecated
 * - Major version changes occur
 */

export type ComponentStatus = 'new' | 'stable' | 'deprecated' | 'experimental';
export type ComponentCategory = 'mobile' | 'ui' | 'contracts' | 'landing' | 'layout' | 'admin' | 'root';

export interface ComponentMetadata {
    name: string;
    version: string;
    status: ComponentStatus;
    category: ComponentCategory;
    description: string;
    author: string;
    createdAt: string;
    lastModified: string;
    documentation?: string;
    variants?: string[];
    dependencies?: string[];
    deprecationInfo?: {
        reason: string;
        migrateFrom: string;
        replacedBy?: string;
        removalVersion?: string;
    };
}

/**
 * Core UI Components (from shadcn/ui)
 * These are stable primitives that should rarely change.
 */
export const UI_COMPONENTS: Record<string, ComponentMetadata> = {
    Button: {
        name: 'Button',
        version: '1.0.0',
        status: 'stable',
        category: 'ui',
        description: 'Primary action button with variants',
        author: 'shadcn',
        createdAt: '2024-01-01',
        lastModified: '2024-12-01',
        variants: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
        dependencies: [],
    },
    Card: {
        name: 'Card',
        version: '1.0.0',
        status: 'stable',
        category: 'ui',
        description: 'Container with header, content, footer',
        author: 'shadcn',
        createdAt: '2024-01-01',
        lastModified: '2024-12-01',
        dependencies: [],
    },
    Dialog: {
        name: 'Dialog',
        version: '1.0.0',
        status: 'stable',
        category: 'ui',
        description: 'Modal dialog overlay',
        author: 'shadcn',
        createdAt: '2024-01-01',
        lastModified: '2024-12-01',
        dependencies: [],
    },
    Input: {
        name: 'Input',
        version: '1.0.0',
        status: 'stable',
        category: 'ui',
        description: 'Text input field',
        author: 'shadcn',
        createdAt: '2024-01-01',
        lastModified: '2024-12-01',
        dependencies: [],
    },
    Skeleton: {
        name: 'Skeleton',
        version: '1.0.0',
        status: 'stable',
        category: 'ui',
        description: 'Loading placeholder',
        author: 'shadcn',
        createdAt: '2024-01-01',
        lastModified: '2024-12-01',
        dependencies: [],
    },
};

/**
 * Mobile Components
 * App-specific mobile-first components.
 */
export const MOBILE_COMPONENTS: Record<string, ComponentMetadata> = {
    // Core Navigation
    FloatingNav: {
        name: 'FloatingNav',
        version: '2.0.0',
        status: 'stable',
        category: 'mobile',
        description: 'Bottom navigation bar for mobile app',
        author: 'design-system',
        createdAt: '2024-06-01',
        lastModified: '2024-12-20',
        dependencies: [],
    },
    GradientHeader: {
        name: 'GradientHeader',
        version: '1.0.0',
        status: 'stable',
        category: 'mobile',
        description: 'Page header with gradient background and back button',
        author: 'design-system',
        createdAt: '2024-06-01',
        lastModified: '2024-12-15',
        dependencies: [],
    },
    AppHeader: {
        name: 'AppHeader',
        version: '1.0.0',
        status: 'stable',
        category: 'mobile',
        description: 'App-wide header with avatar and notifications',
        author: 'design-system',
        createdAt: '2024-06-01',
        lastModified: '2024-12-20',
        dependencies: ['NotificationBell'],
    },

    // Cards
    SoftCard: {
        name: 'SoftCard',
        version: '1.0.0',
        status: 'stable',
        category: 'mobile',
        description: 'Soft rounded card with press effect',
        author: 'design-system',
        createdAt: '2024-06-01',
        lastModified: '2024-12-01',
        dependencies: [],
    },
    JobCard: {
        name: 'JobCard',
        version: '1.0.0',
        status: 'stable',
        category: 'mobile',
        description: 'Job listing card for marketplace',
        author: 'design-system',
        createdAt: '2024-06-01',
        lastModified: '2024-12-27',
        dependencies: ['SoftCard'],
    },
    JobTrackingCard: {
        name: 'JobTrackingCard',
        version: '2.0.0',
        status: 'stable',
        category: 'mobile',
        description: 'Job progress tracking with completion flow',
        author: 'design-system',
        createdAt: '2024-08-01',
        lastModified: '2024-12-28',
        dependencies: ['SoftCard', 'JobCompletionSheet'],
    },
    ActiveRequestCard: {
        name: 'ActiveRequestCard',
        version: '1.0.0',
        status: 'stable',
        category: 'mobile',
        description: 'Card showing active request with quote count',
        author: 'design-system',
        createdAt: '2024-07-01',
        lastModified: '2024-12-20',
        dependencies: [],
    },
    QuoteCard: {
        name: 'QuoteCard',
        version: '1.0.0',
        status: 'stable',
        category: 'mobile',
        description: 'Quote submission card for buyers',
        author: 'design-system',
        createdAt: '2024-07-01',
        lastModified: '2024-12-20',
        dependencies: [],
    },
    SellerQuoteCard: {
        name: 'SellerQuoteCard',
        version: '1.0.0',
        status: 'stable',
        category: 'mobile',
        description: 'Quote management card for sellers',
        author: 'design-system',
        createdAt: '2024-07-01',
        lastModified: '2024-12-25',
        dependencies: [],
    },

    // Typography
    Heading2: {
        name: 'Heading2',
        version: '1.0.0',
        status: 'stable',
        category: 'mobile',
        description: 'Section heading with RTL support',
        author: 'design-system',
        createdAt: '2024-06-01',
        lastModified: '2024-10-01',
        dependencies: [],
    },
    Heading3: {
        name: 'Heading3',
        version: '1.0.0',
        status: 'stable',
        category: 'mobile',
        description: 'Subsection heading with RTL support',
        author: 'design-system',
        createdAt: '2024-06-01',
        lastModified: '2024-10-01',
        dependencies: [],
    },
    Body: {
        name: 'Body',
        version: '1.0.0',
        status: 'stable',
        category: 'mobile',
        description: 'Body text with RTL support',
        author: 'design-system',
        createdAt: '2024-06-01',
        lastModified: '2024-10-01',
        dependencies: [],
    },
    BodySmall: {
        name: 'BodySmall',
        version: '1.0.0',
        status: 'stable',
        category: 'mobile',
        description: 'Small body text with RTL support',
        author: 'design-system',
        createdAt: '2024-06-01',
        lastModified: '2024-10-01',
        dependencies: [],
    },

    // Unified Modal/Sheet Components
    AppModal: {
        name: 'AppModal',
        version: '1.0.0',
        status: 'new',
        category: 'mobile',
        description: 'Unified modal component with RTL and bilingual support',
        author: 'design-system',
        createdAt: '2024-12-28',
        lastModified: '2024-12-28',
        dependencies: ['Dialog'],
        variants: ['default', 'confirm'],
    },
    AppSheet: {
        name: 'AppSheet',
        version: '1.0.0',
        status: 'new',
        category: 'mobile',
        description: 'Unified bottom sheet component with RTL and bilingual support',
        author: 'design-system',
        createdAt: '2024-12-28',
        lastModified: '2024-12-28',
        dependencies: ['Drawer'],
        variants: ['default', 'action'],
    },
};

/**
 * Contract Components
 * Components specific to contract management.
 */
export const CONTRACT_COMPONENTS: Record<string, ComponentMetadata> = {
    ContractProgressTracker: {
        name: 'ContractProgressTracker',
        version: '1.0.0',
        status: 'stable',
        category: 'contracts',
        description: 'Visual progress tracker for contract lifecycle',
        author: 'design-system',
        createdAt: '2024-12-20',
        lastModified: '2024-12-28',
        dependencies: ['SoftCard'],
    },
    ContractAgreementScreen: {
        name: 'ContractAgreementScreen',
        version: '1.0.0',
        status: 'stable',
        category: 'contracts',
        description: 'Full contract viewing and signing screen',
        author: 'design-system',
        createdAt: '2024-10-01',
        lastModified: '2024-12-27',
        dependencies: ['SignatureModal', 'GeneralTerms'],
    },
    GeneralTerms: {
        name: 'GeneralTerms',
        version: '1.0.0',
        status: 'stable',
        category: 'contracts',
        description: 'Standard terms and conditions display',
        author: 'design-system',
        createdAt: '2024-10-01',
        lastModified: '2024-12-01',
        dependencies: [],
    },
};

/**
 * Deprecated Components
 * Components that should not be used in new code.
 */
export const DEPRECATED_COMPONENTS: Record<string, ComponentMetadata> = {
    // Example of deprecated component structure
    // OldButton: {
    //   name: 'OldButton',
    //   version: '1.0.0',
    //   status: 'deprecated',
    //   category: 'ui',
    //   description: 'Legacy button component',
    //   author: 'early-stage',
    //   createdAt: '2024-01-01',
    //   lastModified: '2024-06-01',
    //   deprecationInfo: {
    //     reason: 'Replaced with shadcn Button for consistency',
    //     migrateFrom: 'Replace <OldButton> with <Button>',
    //     replacedBy: 'Button',
    //     removalVersion: '2.0.0',
    //   },
    // },
};

/**
 * Full Component Registry
 */
export const COMPONENT_REGISTRY: Record<string, ComponentMetadata> = {
    ...UI_COMPONENTS,
    ...MOBILE_COMPONENTS,
    ...CONTRACT_COMPONENTS,
    ...DEPRECATED_COMPONENTS,
};

/**
 * Get component metadata with deprecation warnings
 */
export function getComponent(name: string): ComponentMetadata | null {
    const metadata = COMPONENT_REGISTRY[name];

    if (!metadata) {
        console.warn(`[ComponentRegistry] Component "${name}" not found in registry`);
        return null;
    }

    if (metadata.status === 'deprecated') {
        console.warn(
            `[ComponentRegistry] ⚠️ Component "${name}" is DEPRECATED.`,
            metadata.deprecationInfo?.migrateFrom || 'Please migrate to a newer component.'
        );
    }

    if (metadata.status === 'experimental') {
        console.warn(
            `[ComponentRegistry] 🧪 Component "${name}" is EXPERIMENTAL. API may change.`
        );
    }

    return metadata;
}

/**
 * List all components by status
 */
export function listComponentsByStatus(status: ComponentStatus): ComponentMetadata[] {
    return Object.values(COMPONENT_REGISTRY).filter(c => c.status === status);
}

/**
 * List all components by category
 */
export function listComponentsByCategory(category: ComponentCategory): ComponentMetadata[] {
    return Object.values(COMPONENT_REGISTRY).filter(c => c.category === category);
}

/**
 * Check if component is safe to use
 */
export function isComponentSafe(name: string): boolean {
    const metadata = COMPONENT_REGISTRY[name];
    return metadata?.status === 'stable';
}
