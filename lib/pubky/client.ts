import { Pubky, Keypair, PublicKey, Session } from "@synonymdev/pubky";
import { PubkyAppUser } from "pubky-app-specs";
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
   */
  async getProfile(session: Session): Promise<UserProfile | null> {
    try {
      const profileData = await session.storage.getJson(config.profile.path as `/pub/${string}`);
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
