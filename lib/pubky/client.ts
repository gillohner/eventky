import { Pubky, Keypair, PublicKey, Session } from "@synonymdev/pubky";
import { PubkyAppUser, userUriBuilder } from "pubky-app-specs";
import { UserProfile } from "@/types/profile";
import { config } from "@/lib/config";

export class PubkyClient {
  private homeserver: PublicKey;

  constructor() {
    this.homeserver = PublicKey.from(config.homeserver.publicKey);
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
    const pubky = new Pubky();
    const signer = pubky.signer(keypair);
    return signer.signin();
  }

  /**
   * Retrieve user profile from Pubky storage (read-only)
   * Profiles are managed in pubky.app, we only read them here
   * 
   * Can use either session.storage (when available) or publicStorage (when reading any user)
   */
  async getProfile(publicKey: string, session?: Session): Promise<UserProfile | null> {
    try {
      const pubky = new Pubky();
      let profileData;

      if (session) {
        // Use session storage for authenticated user
        profileData = await session.storage.getJson(config.profile.path as `/pub/${string}`);
      } else {
        // Use public storage for any user
        const url = userUriBuilder(publicKey);
        // Type cast needed: SDK expects Address type but userUriBuilder returns string
        profileData = await pubky.publicStorage.getJson(url as any);
      }

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
