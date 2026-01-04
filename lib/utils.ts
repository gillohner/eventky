import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Copy text to clipboard with fallback for insecure contexts
 * navigator.clipboard requires HTTPS or localhost, so we provide
 * a fallback using execCommand for IP:port access during development
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    // Try modern clipboard API first if available and in secure context
    if (typeof navigator !== 'undefined' &&
      navigator.clipboard &&
      typeof window !== 'undefined' &&
      window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (error) {
    console.warn("Clipboard API failed, falling back to execCommand:", error);
  }

  // Fallback for insecure contexts (e.g., IP:port access) or if clipboard API failed
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      const success = document.execCommand("copy");
      textArea.remove();
      return success;
    } catch (err) {
      textArea.remove();
      throw err;
    }
  } catch (error) {
    console.error("Failed to copy to clipboard:", error);
    return false;
  }
}
