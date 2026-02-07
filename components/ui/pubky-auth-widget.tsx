"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import QRCode from "qrcode";
import * as pubky from "@synonymdev/pubky";
import { config } from "@/lib/config";
import { PubkyService } from "@/lib/pubky/service";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink, Check } from "lucide-react";
import { toast } from "sonner";

// ============================================================================
// Polling constants — match pubky-app's homeserver.utils.ts
// ============================================================================
const AUTH_POLL_INTERVAL_MS = 2_000;
const AUTH_POLL_MAX_ATTEMPTS = 150; // 150 × 2s = 5 min

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface PubkyAuthWidgetProps {
  relay?: string;
  caps?: string;
  open?: boolean;
  onSuccess?: (publicKey: string, session?: pubky.Session, token?: pubky.AuthToken) => void;
  onError?: (error: Error) => void;
  className?: string;
}

export function PubkyAuthWidget({
  relay,
  caps = "",
  open = false,
  onSuccess,
  onError,
  className = "",
}: PubkyAuthWidgetProps) {
  const [pubkyZ32, setPubkyZ32] = useState<string>("");
  const [authUrl, setAuthUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sdkRef = useRef<pubky.Pubky | null>(null);
  const isMountedRef = useRef(true);

  // Ref-stable callbacks to avoid stale closure issues.
  // The onSuccess/onError props may change on re-renders (e.g. parent re-renders),
  // but the polling promise captures the ref, not the prop value.
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  // Resolve capabilities; default to Eventky app folder
  const effectiveCaps = caps && caps.trim().length > 0
    ? caps
    : "/pub/eventky.app/:rw";

  // Cancel state for the polling loop
  const cancelRef = useRef<(() => void) | null>(null);

  // Copy auth URL to clipboard
  const handleCopyAuthUrl = useCallback(async () => {
    if (!authUrl) return;

    try {
      await navigator.clipboard.writeText(authUrl);
      setCopied(true);
      toast.success("Auth link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
      toast.error("Failed to copy link");
    }
  }, [authUrl]);

  const handleOpenInPubkyRing = useCallback(() => {
    if (!authUrl) return;

    // Try window.open first; fall back to location.href if blocked
    const opened = window.open(authUrl, "_blank");
    if (!opened) {
      window.location.href = authUrl;
    }
  }, [authUrl]);

  // Generate QR code
  const updateQr = useCallback(() => {
    if (!canvasRef.current || !authUrl) return;

    try {
      QRCode.toCanvas(canvasRef.current, authUrl, {
        margin: 2,
        width: 192, // 48 * 4 = 192px (w-48)
        color: { light: "#fff", dark: "#000" },
      });
    } catch (e) {
      console.error("QR render error:", e);
      onErrorRef.current?.(e as Error);
    }
  }, [authUrl]);

  // Generate auth flow — uses tryPollOnce loop with cancellation
  // Mirrors pubky-app's createCancelableAuthApproval pattern
  const generateFlow = useCallback(async () => {
    if (!sdkRef.current) return;

    // Cancel any previous flow
    cancelRef.current?.();

    setPubkyZ32("");
    setAuthUrl("");

    let canceled = false;
    let freed = false;
    let flow: pubky.AuthFlow | null = null;

    const cancel = () => {
      canceled = true;
      if (freed || !flow) return;
      freed = true;
      try { flow.free(); } catch { /* ignore double-free */ }
    };

    cancelRef.current = cancel;

    try {
      const relayUrl = relay || config.relay.url;
      const capabilities = effectiveCaps as pubky.Capabilities;

      // Start the flow with the SDK's client
      const flowKind = pubky.AuthFlowKind.signin();
      flow = sdkRef.current.startAuthFlow(capabilities, flowKind, relayUrl);

      // Capture the deep link before polling
      const url = flow.authorizationUrl;
      setAuthUrl(url);
      console.log("[PubkyAuthWidget] Auth flow started, URL:", url.substring(0, 60) + "...");

      // Update QR code after URL is set
      setTimeout(() => {
        updateQr();
        requestAnimationFrame(() => updateQr());
      }, 50);

      // Poll for approval using tryPollOnce — matches pubky-app's pattern.
      // Unlike awaitApproval() which consumes the WASM handle,
      // tryPollOnce() keeps flow.free() usable for cancellation.
      await sleep(0); // yield to microtask queue
      let attempts = 0;

      for (; ;) {
        if (canceled || !isMountedRef.current) {
          console.log("[PubkyAuthWidget] Polling canceled");
          return;
        }

        if (++attempts > AUTH_POLL_MAX_ATTEMPTS) {
          throw new Error("Auth flow timed out (5 minutes)");
        }

        try {
          const maybeSession = await flow.tryPollOnce();
          if (maybeSession) {
            console.log("[PubkyAuthWidget] Session received from polling");
            const publicKey = maybeSession.info.publicKey.z32();
            console.log("[PubkyAuthWidget] Public key:", publicKey);

            if (!isMountedRef.current || canceled) return;
            setPubkyZ32(publicKey);
            onSuccessRef.current?.(publicKey, maybeSession);
            return;
          }
        } catch (pollError) {
          if (canceled || !isMountedRef.current) return;
          // Retry on transient relay errors
          console.warn("[PubkyAuthWidget] Poll error (retrying):", pollError);
        }

        await sleep(AUTH_POLL_INTERVAL_MS);
      }
    } catch (error) {
      if (canceled || !isMountedRef.current) return;
      console.error("[PubkyAuthWidget] Auth flow failed:", error);
      onErrorRef.current?.(error as Error);
    } finally {
      // Clean up the flow handle
      if (!freed && flow) {
        freed = true;
        try { flow.free(); } catch { /* ignore */ }
      }
    }
  }, [relay, effectiveCaps, updateQr]);

  // Initialize SDK and manage lifecycle
  useEffect(() => {
    isMountedRef.current = true;
    sdkRef.current = PubkyService.getInstance();

    return () => {
      isMountedRef.current = false;
      cancelRef.current?.(); // Cancel any active polling on unmount
    };
  }, []);

  // Auto-generate flow if open prop is true
  useEffect(() => {
    if (open && !authUrl && sdkRef.current) {
      const timer = setTimeout(() => {
        generateFlow();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open, authUrl, generateFlow]);

  // Update QR when authUrl changes
  useEffect(() => {
    updateQr();
  }, [updateQr]);

  const showSuccess = Boolean(pubkyZ32);

  const instruction = effectiveCaps && effectiveCaps.trim().length
    ? "Scan or copy Pubky auth URL"
    : "Scan to authenticate (no capabilities requested)";

  return (
    <div
      className={`
        relative flex flex-col items-center
        transition-all duration-300 ease-in-out
        ${className}
      `}
    >
      {/* Instruction */}
      <p className="mb-6 text-center text-sm text-muted-foreground">
        {instruction}
      </p>

      {/* Content */}
      {showSuccess ? (
        caps?.length ? (
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">Successfully authorized:</p>
            <p className="text-sm font-mono mb-2">{pubkyZ32}</p>
            <p className="text-sm text-muted-foreground mb-2">With capabilities</p>
            {caps.split(",").map((cap, index) => (
              <p key={index} className="text-sm text-muted-foreground">{cap}</p>
            ))}
          </div>
        ) : (
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">Successfully authenticated:</p>
            <p className="text-sm font-mono">{pubkyZ32}</p>
          </div>
        )
      ) : (
        <div className="flex flex-col items-center w-full">
          {/* QR Code - Clean, no background */}
          <div className="flex justify-center items-center bg-white p-4 rounded-2xl">
            <canvas
              ref={canvasRef}
              className="w-48 h-48"
            />
          </div>

          {/* Action Buttons */}
          {authUrl && (
            <div className="mt-6 flex flex-col gap-2 w-full max-w-xs">
              <Button
                onClick={handleCopyAuthUrl}
                variant="outline"
                className="w-full"
                disabled={!authUrl}
              >
                {copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Auth Link
                  </>
                )}
              </Button>

              <Button
                onClick={handleOpenInPubkyRing}
                variant="default"
                className="w-full"
                disabled={!authUrl}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Open in Pubky Ring
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
