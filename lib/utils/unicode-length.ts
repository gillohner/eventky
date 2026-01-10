/**
 * Get the Unicode code point length of a string
 * This matches Rust's String.chars().count() behavior
 * 
 * JavaScript's string.length counts UTF-16 code units, which can be misleading
 * for characters outside the Basic Multilingual Plane (e.g., emoji, some Chinese characters).
 * 
 * Example:
 * - "Hi🔥".length === 4 (JavaScript counts UTF-16 code units)
 * - getUnicodeLength("Hi🔥") === 3 (matches Rust's behavior - counts code points)
 * 
 * @param str - The string to measure
 * @returns The number of Unicode code points in the string
 */
export function getUnicodeLength(str: string): number {
    // Spread operator converts string to array of code points
    return [...str].length;
}

/**
 * Check if a string exceeds a maximum Unicode length
 * @param str - The string to check
 * @param maxLength - Maximum allowed Unicode code points
 * @returns true if string exceeds max length
 */
export function exceedsUnicodeLength(str: string, maxLength: number): boolean {
    return getUnicodeLength(str) > maxLength;
}

/**
 * Truncate a string to a maximum Unicode length
 * @param str - The string to truncate
 * @param maxLength - Maximum allowed Unicode code points
 * @returns Truncated string
 */
export function truncateToUnicodeLength(str: string, maxLength: number): string {
    const chars = [...str];
    if (chars.length <= maxLength) return str;
    return chars.slice(0, maxLength).join('');
}
