"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import QRCode from "qrcode";
import * as pubky from "@synonymdev/pubky";
import { config } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink, Check } from "lucide-react";
import { toast } from "sonner";

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

  // TODO: How to implement callback to prevent opening pubky.app on authorization?
  const handleOpenInPubkyRing = useCallback(() => {
    if (!authUrl) return;

    const pubkyRingUrl = `pubkyring://auth?url=${encodeURIComponent(authUrl)}`;
    window.location.href = pubkyRingUrl;
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
      onError?.(e as Error);
    }
  }, [authUrl, onError]);

  // Generate auth flow
  const generateFlow = useCallback(async () => {
    if (!sdkRef.current) return;

    setPubkyZ32("");
    setAuthUrl("");

    try {
      const relayUrl = relay || config.relay.url;

      // Start the flow with the SDK's client
      const flow = sdkRef.current.startAuthFlow(caps as pubky.Capabilities, relayUrl);

      // Capture the deep link before awaiting
      const url = flow.authorizationUrl;
      setAuthUrl(url);

      // Update QR code after URL is set
      setTimeout(() => {
        updateQr();
        requestAnimationFrame(() => updateQr());
      }, 50);

      // Wait for approval based on capabilities (this is async and will happen in background)
      if (caps && caps.trim().length > 0) {
        // Capabilities requested -> wait for a Session
        const session = await flow.awaitApproval();
        const publicKey = session.info.publicKey.z32();
        setPubkyZ32(publicKey);
        onSuccess?.(publicKey, session);
      } else {
        // No capabilities -> wait for an AuthToken
        const token = await flow.awaitToken();
        const publicKey = token.publicKey.z32();
        setPubkyZ32(publicKey);
        onSuccess?.(publicKey, undefined, token);
      }
    } catch (error) {
      console.error("Auth flow failed:", error);
      onError?.(error as Error);
    }
  }, [relay, caps, onSuccess, onError, updateQr]);

  // Initialize SDK
  useEffect(() => {
    sdkRef.current = config.env === "testnet" ? pubky.Pubky.testnet() : new pubky.Pubky();
  }, []);

  // Auto-generate flow if open prop is true
  useEffect(() => {
    if (open && !authUrl && sdkRef.current) {
      // Use setTimeout to ensure SDK and state are ready
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

  const instruction = caps && caps.trim().length
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
