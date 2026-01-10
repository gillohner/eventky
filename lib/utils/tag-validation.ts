import { getUnicodeLength } from './unicode-length';

/**
 * Tag validation constants matching pubky-app-specs
 * See: pubky-app-specs/src/constants.rs
 */
export const MAX_TAG_LABEL_LENGTH = 20;
export const MIN_TAG_LABEL_LENGTH = 1;
export const INVALID_TAG_CHARS = [',', ':'];

/**
 * Sanitize a tag label by trimming whitespace and converting to lowercase
 * Matches pubky-app-specs/src/models/tag.rs sanitize_tag_label()
 * 
 * @param tag - The tag label to sanitize
 * @returns Sanitized tag label (trimmed and lowercased)
 */
export function sanitizeTagLabel(tag: string): string {
    return tag.trim().toLowerCase();
}

/**
 * Validate a tag label according to pubky-app-specs rules
 * Matches pubky-app-specs/src/models/tag.rs validate_tag_label()
 * 
 * Validation rules:
 * - Length: 1-20 Unicode code points
 * - No whitespace characters
 * - No invalid characters: comma (,) or colon (:)
 * 
 * @param tag - The tag label to validate
 * @returns Error message if invalid, null if valid
 */
export function validateTagLabel(tag: string): string | null {
    const tagLen = getUnicodeLength(tag);

    // Validate tag length
    if (tagLen > MAX_TAG_LABEL_LENGTH) {
        return `Tag exceeds maximum length of ${MAX_TAG_LABEL_LENGTH} characters`;
    }
    if (tagLen < MIN_TAG_LABEL_LENGTH) {
        return `Tag must be at least ${MIN_TAG_LABEL_LENGTH} character`;
    }

    // Validate no whitespace
    if (/\s/.test(tag)) {
        return 'Tag cannot contain whitespace characters';
    }

    // Validate no invalid characters
    const invalidChar = INVALID_TAG_CHARS.find(char => tag.includes(char));
    if (invalidChar) {
        return `Tag cannot contain the character: ${invalidChar}`;
    }

    return null; // Valid
}

/**
 * Sanitize and validate a tag label
 * Returns sanitized label if valid, or throws error with validation message
 * 
 * @param tag - The tag label to sanitize and validate
 * @returns Sanitized tag label
 * @throws Error with validation message if invalid
 */
export function sanitizeAndValidateTag(tag: string): string {
    const sanitized = sanitizeTagLabel(tag);
    const error = validateTagLabel(sanitized);

    if (error) {
        throw new Error(error);
    }

    return sanitized;
}
