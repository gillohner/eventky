/**
 * Pubky utility functions for common operations
 */

/**
 * Parse a Pubky image URL and return a usable HTTP URL
 * Converts pubky:// URLs to HTTP URLs via a gateway
 * 
 * Gateway can be configured via NEXT_PUBLIC_PUBKY_GATEWAY env variable
 */
export function getPubkyImageUrl(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) return null;

  // If it's already an HTTP URL, return as-is
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }

  // If it's a pubky:// URL, convert to HTTP gateway URL
  if (imageUrl.startsWith("pubky://")) {
    // Remove pubky:// prefix
    const path = imageUrl.replace("pubky://", "");
    
    // Use configurable gateway (defaults to staging)
    const gateway = process.env.NEXT_PUBLIC_PUBKY_GATEWAY || "https://gateway.staging.pubky.app";
    return `${gateway}/${path}`;
  }

  return null;
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
 * Format a Pubky profile for storage (minimal version)
 * This ensures profile data matches the PubkyAppUser structure
 */
export function formatProfileForStorage(profile: {
  name?: string;
  bio?: string;
  image?: string;
  links?: Array<{ title: string; url: string }>;
  status?: string;
}): {
  name: string;
  bio?: string;
  image?: string;
  links?: Array<{ title: string; url: string }>;
  status?: string;
} {
  return {
    name: profile.name || "Anonymous",
    bio: profile.bio,
    image: profile.image,
    links: profile.links,
    status: profile.status,
  };
}
