
/**
 * File Validation Utility
 * 
 * Enforces security constraints on file uploads.
 */
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const ALLOWED_DOC_TYPES = ['application/pdf'];

export interface ValidationResult {
    valid: boolean;
    error?: string;
}

export const validateFile = (file: File, options?: {
    maxSize?: number;
    allowedTypes?: string[];
}): ValidationResult => {
    const maxSize = options?.maxSize || MAX_FILE_SIZE_BYTES;
    const allowedTypes = options?.allowedTypes || [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOC_TYPES];

    // Check Size
    if (file.size > maxSize) {
        return {
            valid: false,
            error: `File size exceeds limit of ${maxSize / (1024 * 1024)}MB`
        };
    }

    // Check Type
    if (!allowedTypes.includes(file.type)) {
        return {
            valid: false,
            error: `File type ${file.type} is not allowed. Supported: ${allowedTypes.map(t => t.split('/')[1]).join(', ')}`
        };
    }

    return { valid: true };
};
