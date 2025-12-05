/**
 * Pubky utility functions for common operations
 */

import { config } from "@/lib/config";
import { imageVariant } from "@/types/image";

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
 * Get direct homeserver URL for a pubky:// file
 * This bypasses Nexus and fetches directly from the homeserver
 * Useful when Nexus hasn't indexed the file yet
 */
export function getDirectPubkyFileUrl(pubkyUrl: string): string {
  // Parse pubky:// URI: pubky://userId/pub/pubky.app/files/fileId
  // -> http://homeserver/{userId}/pub/pubky.app/blobs/{blobId}
  // But we need the blob data, not the file metadata
  // For direct access, we need to read the file metadata first to get the blob reference
  // 
  // For now, return the file path directly - the blob data might be accessible
  const withoutProtocol = pubkyUrl.replace("pubky://", "");
  return `${config.homeserver.url}/${withoutProtocol}`;
}/**
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
