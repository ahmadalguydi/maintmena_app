/**
 * Route depth helper for direction-aware transitions.
 * Used to determine if navigation is "pushing" deeper or "popping" back.
 */

// Approximate depth by counting URL segments
export function getRouteDepth(pathname: string): number {
    const segments = pathname.split('/').filter(Boolean);
    return segments.length;
}

// Check if navigating to a "sheet" screen (modal-like)
const sheetPatterns = [
    '/contract/',
    '/sign',
    '/new',
    '/edit',
    '/review',
    '/quote/',
];

export function isSheetRoute(pathname: string): boolean {
    return sheetPatterns.some(pattern => pathname.includes(pattern));
}

// Check if this is a tab switch (same depth, different section)
export function isTabSwitch(from: string, to: string): boolean {
    const fromParts = from.split('/').filter(Boolean);
    const toParts = to.split('/').filter(Boolean);

    // Same depth and both are "home" level routes
    if (fromParts.length === toParts.length && fromParts.length <= 3) {
        // /app/buyer/home vs /app/buyer/explore = tab switch
        // /app/seller/home vs /app/seller/marketplace = tab switch
        return fromParts[0] === toParts[0] && fromParts[1] === toParts[1];
    }
    return false;
}
