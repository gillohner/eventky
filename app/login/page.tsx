"use client";

import { useState, useRef, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { PubkyClient } from "@/lib/pubky/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { Pubky, Session, AuthToken } from "@synonymdev/pubky";
import { PubkyAuthWidget } from "@/components/ui/pubky-auth-widget";

interface LoginPageProps {
    searchParams: Promise<{
        returnPath?: string;
    }>;
}

export default function LoginPage({ searchParams }: LoginPageProps) {
    const router = useRouter();
    const params = use(searchParams);
    const returnPath = params?.returnPath || "/";
    const { signin, signinWithSession, isAuthenticated } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [passphrase, setPassphrase] = useState("");
    const [recoveryFile, setRecoveryFile] = useState<File | null>(null);
    const [isHydrated, setIsHydrated] = useState(false);
    const [authMethod, setAuthMethod] = useState<"recovery" | "qr">("qr");

    // Handle hydration
    useEffect(() => {
        setIsHydrated(true);
    }, []);

    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated && isHydrated) {
            router.push(returnPath);
        }
    }, [isAuthenticated, isHydrated, returnPath, router]);

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setRecoveryFile(file);
            setError(null);
        }
    };

    const handleQrAuthSuccess = async (publicKey: string, session?: Session, token?: AuthToken) => {
        setIsLoading(true);
        setError(null);

        try {
            // If we have a session, use it directly
            if (session) {
                // QR auth: Session persists in memory during browser session
                // Cannot be stored in localStorage (not serializable)
                // User will need to re-scan QR after page refresh
                signinWithSession(publicKey, session);
                toast.success("Successfully logged in!");
                router.push(returnPath);
                return;
            }

            // If we only have a token, we need to create a session
            if (token) {
                // For token-based auth, we'll need to create a session
                // This is a simplified approach - in a real app you might need to handle this differently
                console.log("Token-based authentication:", publicKey);
                setError("Token-based authentication not fully implemented yet. Please use recovery file method.");
            }
        } catch (error) {
            console.error("QR auth error:", error);
            setError("Failed to sign in with QR code. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleQrAuthError = (error: Error) => {
        console.error("QR auth error:", error);
        setError(`QR authentication failed: ${error.message}`);
    };

    const handleSignIn = async () => {
        if (!recoveryFile || !passphrase.trim()) {
            setError("Please select a recovery file and enter your passphrase");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Read the recovery file
            const arrayBuffer = await recoveryFile.arrayBuffer();
            const recoveryData = new Uint8Array(arrayBuffer);

            // Restore keypair from recovery file
            const keypair = PubkyClient.restoreFromRecoveryFile(recoveryData, passphrase);
            const publicKey = keypair.publicKey.z32();

            // Create a session with the restored keypair
            const pubky = new Pubky();
            const signer = pubky.signer(keypair);

            const session = await signer.signin();

            // Sign in with the restored credentials
            // The useProfile hook will automatically fetch the profile after signin
            signin(publicKey, keypair, session);

            toast.success("Successfully logged in!");
            router.push(returnPath);
        } catch (error) {
            console.error("Sign in error:", error);
            setError("Failed to sign in. Please check your recovery file and passphrase.");
        } finally {
            setIsLoading(false);
        }
    };

    // Show loading state during hydration
    if (!isHydrated) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    // Show loading state while redirecting authenticated user
    if (isAuthenticated) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Redirecting...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-8 bg-background">
            <div className="w-full max-w-2xl">
                {/* Title */}
                <h1 className="mb-4 text-center text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                    sign in
                </h1>

                {/* Subtitle */}
                <p className="mb-12 text-center text-lg text-muted-foreground">
                    Scan the QR code with Pubky Ring or use your recovery file
                </p>

                {/* Authentication Method Selector */}
                <div className="mb-8 grid w-full max-w-lg mx-auto grid-cols-2 gap-4">
                    <button
                        onClick={() => setAuthMethod("qr")}
                        className={`group relative flex flex-col items-center gap-3 rounded-2xl border-2 p-6 transition-all hover:scale-[1.02] ${authMethod === "qr"
                            ? "border-primary/50 bg-primary/5 shadow-lg shadow-primary/20"
                            : "border-border/50 bg-card/30 hover:border-primary/30"
                            }`}
                    >
                        <svg className={`h-10 w-10 transition-colors ${authMethod === "qr" ? "text-primary" : "text-muted-foreground"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                        </svg>
                        <div className="text-center">
                            <h3 className={`mb-1 text-sm font-semibold ${authMethod === "qr" ? "text-foreground" : "text-muted-foreground"}`}>
                                Pubky Ring
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                Scan QR code
                            </p>
                        </div>
                        {authMethod === "qr" && (
                            <div className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary">
                                <svg className="h-4 w-4 text-background" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                        )}
                    </button>

                    <button
                        onClick={() => setAuthMethod("recovery")}
                        className={`group relative flex flex-col items-center gap-3 rounded-2xl border-2 p-6 transition-all hover:scale-[1.02] ${authMethod === "recovery"
                            ? "border-primary/50 bg-primary/5 shadow-lg shadow-primary/20"
                            : "border-border/50 bg-card/30 hover:border-primary/30"
                            }`}
                    >
                        <svg className={`h-10 w-10 transition-colors ${authMethod === "recovery" ? "text-primary" : "text-muted-foreground"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <div className="text-center">
                            <h3 className={`mb-1 text-sm font-semibold ${authMethod === "recovery" ? "text-foreground" : "text-muted-foreground"}`}>
                                Recovery File
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                Upload .pubky file
                            </p>
                        </div>
                        {authMethod === "recovery" && (
                            <div className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary">
                                <svg className="h-4 w-4 text-background" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                        )}
                    </button>
                </div>

                {/* Authentication Content */}
                {authMethod === "recovery" ? (
                    <div className="relative mb-8 w-full max-w-[512px] mx-auto">
                        <div className="rounded-3xl border border-border/40 bg-card/50 p-8 backdrop-blur-sm transition-all hover:border-border/60 hover:bg-card/60">
                            <div className="space-y-8">
                                {/* File Upload Area */}
                                <div>
                                    <label className="mb-3 block text-left text-sm font-medium">
                                        Recovery File <span className="text-red-500">*</span>
                                    </label>
                                    <div
                                        className="border-2 border-dashed border-border/50 rounded-xl p-8 cursor-pointer hover:border-primary/50 transition-all bg-background/50"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".pubky"
                                            onChange={handleFileSelect}
                                            className="hidden"
                                        />
                                        <div className="text-center">
                                            <Upload className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                                            {recoveryFile ? (
                                                <div>
                                                    <p className="text-sm font-medium text-primary">{recoveryFile.name}</p>
                                                    <p className="text-xs text-muted-foreground mt-1">Click to change file</p>
                                                </div>
                                            ) : (
                                                <div>
                                                    <p className="text-sm font-medium text-foreground">Click to upload recovery file</p>
                                                    <p className="text-xs text-muted-foreground mt-1">Or drag and drop your .pubky file</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <p className="mt-2 text-xs text-muted-foreground text-left">
                                        Upload your encrypted backup file
                                    </p>
                                </div>

                                {/* Passphrase Input */}
                                <div>
                                    <label className="mb-3 block text-left text-sm font-medium">
                                        Passphrase <span className="text-red-500">*</span>
                                    </label>
                                    <Input
                                        type="password"
                                        value={passphrase}
                                        onChange={(e) => setPassphrase(e.target.value)}
                                        placeholder="Enter your recovery passphrase"
                                        className="h-14"
                                    />
                                    <p className="mt-2 text-xs text-muted-foreground text-left">
                                        The passphrase you used when creating the backup
                                    </p>
                                </div>

                                {/* Error Message */}
                                {error && (
                                    <div className="rounded-xl border-2 border-red-500/20 bg-red-500/5 p-4 backdrop-blur-sm">
                                        <div className="flex items-start gap-3">
                                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500/20">
                                                <svg className="h-4 w-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                </svg>
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="text-sm font-medium text-red-500">Error</h3>
                                                <p className="mt-1 text-sm text-red-400">{error}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Sign In Button */}
                                <Button
                                    onClick={handleSignIn}
                                    disabled={!recoveryFile || !passphrase.trim() || isLoading}
                                    className="w-full h-14 text-lg"
                                >
                                    {isLoading ? (
                                        <>
                                            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background/20 border-t-background"></div>
                                            Signing in...
                                        </>
                                    ) : (
                                        <>
                                            Sign In
                                            <svg className="ml-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                            </svg>
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="relative mb-8 w-full max-w-[512px] mx-auto">
                        <div className="rounded-3xl border border-border/40 bg-card/50 p-8 backdrop-blur-sm transition-all hover:border-border/60 hover:bg-card/60">
                            <div className="space-y-6">
                                {/* Pubky Auth Widget */}
                                <div className="flex justify-center">
                                    <PubkyAuthWidget
                                        open={true}
                                        onSuccess={handleQrAuthSuccess}
                                        onError={handleQrAuthError}
                                        caps="/pub/eventky.app/:rw"
                                    />
                                </div>

                                {/* Error Message */}
                                {error && (
                                    <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4">
                                        <p className="text-sm text-red-400">{error}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Note */}
                <div className="w-full max-w-md mx-auto text-center">
                    <p className="text-sm text-muted-foreground">
                        Don&apos;t have a Pubky account? Check out <a href="https://pubky.app" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">pubky.app</a> to create one.
                    </p>
                </div>
            </div>
        </div>
    );
}
