import { Pubky, Keypair, PublicKey, Session } from "@synonymdev/pubky";
import { PubkyAppUser } from "pubky-app-specs";
import { UserProfile } from "@/types/profile";

// Environment-based homeserver configuration
const HOMESERVERS = {
  testnet: "testnet-homeserver-publickey", // Replace with actual testnet homeserver
  staging: "ufibwbmed6jeq9k4p583go95wofakh9fwpp4k734trq79pd9u1uy", // Staging homeserver
  live: "ufibwbmed6jeq9k4p583go95wofakh9fwpp4k734trq79pd9u1uy", // Replace with live homeserver when available
};

// Get homeserver based on environment
function getHomeserver(): string {
  const env = process.env.NEXT_PUBLIC_PUBKY_ENV || "staging";
  const customHomeserver = process.env.NEXT_PUBLIC_PUBKY_HOMESERVER;
  
  if (customHomeserver) {
    return customHomeserver;
  }
  
  return HOMESERVERS[env as keyof typeof HOMESERVERS] || HOMESERVERS.staging;
}

const DEFAULT_HOMESERVER = getHomeserver();
// Use standardized path from pubky-app-specs
const PROFILE_PATH = "/pub/pubky.app/profile.json";

export class PubkyClient {
  private pubky: Pubky;
  private homeserver: PublicKey;

  constructor() {
    this.pubky = new Pubky();
    this.homeserver = PublicKey.from(DEFAULT_HOMESERVER);
  }

  /**
   * Restore keypair from recovery file (for login only)
   */
  static restoreFromRecoveryFile(
    recoveryFile: Uint8Array,
    passphrase: string
  ): Keypair {
    return Keypair.fromRecoveryFile(recoveryFile, passphrase);
  }

  /**
   * Sign in with restored keypair (for login only)
   */
  async signin(keypair: Keypair): Promise<Session> {
    const signer = this.pubky.signer(keypair);
    return signer.signin();
  }

  /**
   * Retrieve user profile from Pubky storage (read-only)
   * Profiles are managed in pubky.app, we only read them here
   */
  async getProfile(session: Session): Promise<UserProfile | null> {
    try {
      const profileData = await session.storage.getJson(PROFILE_PATH);
      if (profileData && typeof profileData === "object") {
        // Convert to PubkyAppUser class to validate and sanitize
        const userClass = PubkyAppUser.fromJson(profileData);
        // Return the JSON representation
        return userClass.toJson() as UserProfile;
      }
      return null;
    } catch (error) {
      console.error("Error retrieving profile from storage:", error);
      return null;
    }
  }
}

// Export singleton instance
export const pubkyClient = new PubkyClient();
