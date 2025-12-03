import { Pubky, Keypair, Session, Address } from "@synonymdev/pubky";
import { PubkyAppUser, userUriBuilder } from "pubky-app-specs";
import { config } from "@/lib/config";

export class PubkyClient {
  /**
   * Create Pubky instance with correct configuration (testnet or mainnet)
   */
  private static createPubky(): Pubky {
    return config.env === "testnet" ? Pubky.testnet() : new Pubky();
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
    const pubky = PubkyClient.createPubky();
    const signer = pubky.signer(keypair);
    return signer.signin();
  }

  /**
   * Retrieve user profile from Pubky storage (read-only)
   * Profiles are managed in pubky.app, we only read them here
   * 
   * SDK's cookie-based session management handles authenticated requests automatically
   */
  async getProfile(publicKey: string): Promise<ReturnType<PubkyAppUser["toJson"]> | null> {
    try {
      const pubky = PubkyClient.createPubky();
      const url = userUriBuilder(publicKey);
      // Type cast needed: SDK expects Address type but userUriBuilder returns string
      const profileData = await pubky.publicStorage.getJson(url as Address);

      if (profileData && typeof profileData === "object") {
        // Convert to PubkyAppUser class to validate and sanitize
        const userClass = PubkyAppUser.fromJson(profileData);
        // Return the JSON representation
        return userClass.toJson();
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
