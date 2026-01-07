import { Pubky, Keypair, Session, Address, PublicKey } from "@synonymdev/pubky";
import { PubkyAppUser } from "pubky-app-specs";
import { config, isTestnet } from "@/lib/config";

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
   * Sign in with restored keypair
   * 
   * For testnet: Uses signup() with the configured homeserver since PKARR
   * records aren't published in local testnet environments.
   * 
   * For mainnet: Uses signin() which resolves the homeserver via PKARR/PKDNS.
   */
  async signin(keypair: Keypair): Promise<Session> {
    const pubky = PubkyClient.createPubky();
    const signer = pubky.signer(keypair);

    if (isTestnet) {
      // In testnet, PKARR records aren't published to a resolvable DHT,
      // so we use signup() with the configured homeserver instead.
      // signup() works for both new and existing users.
      const homeserverKey = PublicKey.from(config.homeserver.publicKey);
      return signer.signup(homeserverKey);
    }

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
      // Build user URI manually: pubky://publicKey/pub/pubky.app/profile.json
      const url = `pubky://${publicKey}/pub/pubky.app/profile.json`;
      // Type cast needed: SDK expects Address type but we're providing string
      const profileData = await pubky.publicStorage.getJson(url as Address);

      if (profileData && typeof profileData === "object") {
        // Return profile data directly - validation happens on the homeserver
        // No need to validate again with WASM during SSR/render
        return profileData as ReturnType<PubkyAppUser["toJson"]>;
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
