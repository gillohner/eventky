import { Keypair, Session, Address, PublicKey } from "@synonymdev/pubky";
import { PubkyAppUser, userUriBuilder } from "@eventky/pubky-app-specs";
import { config, isTestnet } from "@/lib/config";
import { PubkyService } from "@/lib/pubky/service";

export class PubkyClient {
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
     * Sign in with restored keypair.
     * Uses the singleton PubkyService instance.
     *
     * For testnet: Uses signup() with the configured homeserver since PKARR
     * records aren't published in local testnet environments.
     *
     * For mainnet: Uses signin() which resolves the homeserver via PKARR/PKDNS.
     */
    async signin(keypair: Keypair): Promise<Session> {
        const pubky = PubkyService.getInstance();
        const signer = pubky.signer(keypair);

        if (isTestnet) {
            // In testnet, PKARR records aren't published to a resolvable DHT,
            // so we use signup() with the configured homeserver instead.
            const homeserverKey = PublicKey.from(config.homeserver.publicKey);
            return signer.signup(homeserverKey);
        }

        return signer.signin();
    }

    /**
     * Retrieve user profile from Pubky storage (read-only)
     * Uses the singleton PubkyService instance.
     */
    async getProfile(publicKey: string): Promise<ReturnType<PubkyAppUser["toJson"]> | null> {
        try {
            const pubky = PubkyService.getInstance();
            const url = userUriBuilder(publicKey);
            const profileData = await pubky.publicStorage.getJson(url as Address);

            if (profileData && typeof profileData === "object") {
                const userClass = PubkyAppUser.fromJson(profileData);
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
