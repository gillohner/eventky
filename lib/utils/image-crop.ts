import { HEADER_BANNER } from "@/lib/constants";
import type { Area } from "react-easy-crop";

/**
 * Creates a cropped and resized image from the source image and crop area.
 * Always outputs at HEADER_BANNER dimensions (1200x500).
 * Returns a File ready for upload.
 */
export async function getCroppedImageFile(
    imageSrc: string,
    cropArea: Area,
    fileName: string = "cropped-image.jpg"
): Promise<File> {
    const image = await loadImage(imageSrc);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
        throw new Error("Failed to get canvas context");
    }

    // Output at exact HEADER_BANNER dimensions
    canvas.width = HEADER_BANNER.width;
    canvas.height = HEADER_BANNER.height;

    // Draw the cropped region scaled to output dimensions
    ctx.drawImage(
        image,
        cropArea.x,
        cropArea.y,
        cropArea.width,
        cropArea.height,
        0,
        0,
        HEADER_BANNER.width,
        HEADER_BANNER.height
    );

    // Convert canvas to blob
    const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error("Failed to create image blob"));
                }
            },
            "image/jpeg",
            0.9
        );
    });

    return new File([blob], fileName, { type: "image/jpeg" });
}

/**
 * Check if an image already matches the HEADER_BANNER aspect ratio (within tolerance).
 */
export function matchesBannerAspectRatio(
    width: number,
    height: number,
    tolerance: number = 0.02
): boolean {
    const imageRatio = width / height;
    return Math.abs(imageRatio - HEADER_BANNER.ratio) < tolerance;
}

/**
 * Get the natural dimensions of an image from a data URL or object URL.
 */
export function getImageDimensions(
    src: string
): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = src;
    });
}

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Failed to load image"));
        img.crossOrigin = "anonymous";
        img.src = src;
    });
}
