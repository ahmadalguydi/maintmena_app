import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks.
 * Uses DOMPurify to remove potentially dangerous elements and attributes.
 */
export function sanitizeHtml(html: string): string {
    if (!html) return '';

    return DOMPurify.sanitize(html, {
        // Allow standard HTML formatting tags
        ALLOWED_TAGS: [
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'p', 'br', 'hr',
            'strong', 'b', 'em', 'i', 'u', 's', 'mark',
            'ul', 'ol', 'li',
            'a', 'img',
            'blockquote', 'pre', 'code',
            'table', 'thead', 'tbody', 'tr', 'th', 'td',
            'div', 'span',
            'figure', 'figcaption',
        ],
        // Allow safe attributes
        ALLOWED_ATTR: [
            'href', 'src', 'alt', 'title', 'class', 'id', 'target', 'rel',
            'width', 'height', 'style',
        ],
        // Force links to open in new tab with noopener
        ADD_ATTR: ['target', 'rel'],
        // Remove potentially dangerous protocols
        ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
    });
}

/**
 * Sanitize HTML and return object for dangerouslySetInnerHTML
 */
export function createSafeHtml(html: string): { __html: string } {
    return { __html: sanitizeHtml(html) };
}
