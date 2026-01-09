/**
 * Pubky utility functions for common operations
 */

import { config } from "@/lib/config";
import { imageVariant } from "@/types/image";

/**
 * Get the pubky.app profile URL for a user
 * Uses config.pubkyApp.profileUrl for consistent URL generation
 * @param userId - The user's public key
 * @returns Full profile URL (e.g., https://pubky.app/profile/abc123)
 */
export function getPubkyProfileUrl(userId: string): string {
  return `${config.pubkyApp.profileUrl}/${userId}`;
}

export function getPubkyAvatarUrl(pubkyUrl: string): string {
  return `${config.gateway.url}${config.gateway.baseAvatarPath}/${pubkyUrl.replace("pubky://", "")}`;
}

export function getPubkyFileUrl(pubkyUrl: string): string {
  return `${config.gateway.url}${config.gateway.baseFilePath}/${pubkyUrl.replace("pubky://", "")}`;
}

/**
 * Get Nexus gateway URL for an image
 * This is the indexed/cached version served by Nexus
 */
export function getPubkyImageUrl(pubkyUrl: string, variant: imageVariant): string {
  // Parse pubky:// URI: pubky://userId/pub/pubky.app/files/fileId
  // Extract userId and fileId, discard intermediate path segments
  const withoutProtocol = pubkyUrl.replace("pubky://", "");
  const parts = withoutProtocol.split("/");

  // parts[0] = userId
  // parts[1] = "pub"
  // parts[2] = "pubky.app"
  // parts[3] = "files"
  // parts[4] = fileId
  const userId = parts[0];
  const fileId = parts[parts.length - 1]; // Get last segment (fileId)

  return `${config.gateway.url}${config.gateway.baseFilePath}/${userId}/${fileId}/${variant}`;
}

/**
 * Get initials from a name (first letter of first two words)
 */
export function getInitials(name: string | null | undefined): string {
  if (!name) return "";

  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  }

  return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
}

/**
 * Truncate a public key for display
 */
export function truncatePublicKey(publicKey: string | null, length: number = 8): string {
  if (!publicKey) return "";

  if (publicKey.length <= length * 2) {
    return publicKey;
  }

  return `${publicKey.slice(0, length)}...${publicKey.slice(-length)}`;
}

/**
 * Z-Base32 alphabet used by Pkarr/Pubky for public key encoding
 * https://philzimmermann.com/docs/human-oriented-base-32-encoding.txt
 */
const Z_BASE32_ALPHABET = "ybndrfg8ejkmcpqxot1uwisza345h769";

/**
 * Validate if a string is a valid Pubky public key
 * Based on pubky-app-specs PubkyId validation:
 * - Must be exactly 52 characters
 * - Must be valid Z-Base32 encoding
 * 
 * @param input - The string to validate (with or without pk: prefix)
 * @returns Object with isValid flag and cleaned pubkyId (without pk: prefix)
 */
export function validatePubkyId(input: string): { isValid: boolean; pubkyId: string } {
  // Strip pk: prefix if present (case-insensitive)
  const cleanInput = input.toLowerCase().startsWith("pk:")
    ? input.slice(3)
    : input;

  // Must be exactly 52 characters
  if (cleanInput.length !== 52) {
    return { isValid: false, pubkyId: cleanInput };
  }

  // Must only contain valid Z-Base32 characters
  const lowercaseInput = cleanInput.toLowerCase();
  for (const char of lowercaseInput) {
    if (!Z_BASE32_ALPHABET.includes(char)) {
      return { isValid: false, pubkyId: cleanInput };
    }
  }

  return { isValid: true, pubkyId: lowercaseInput };
}

/**
 * Check if input looks like it might be a public key (for UX hints)
 * Returns true if it starts with pk: or is 52 chars of valid-looking characters
 */
export function looksLikePubkyId(input: string): boolean {
  if (input.toLowerCase().startsWith("pk:")) {
    return true;
  }
  // If it's getting close to 52 chars and looks alphanumeric
  if (input.length >= 40 && /^[a-z0-9]+$/i.test(input)) {
    return true;
  }
  return false;
}
