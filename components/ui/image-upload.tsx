"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { FormSection } from "@/components/ui/form-section";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageCropper } from "@/components/ui/image-cropper";
import { Upload, X, RefreshCw, AlertTriangle } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { uploadImageFile, deleteImageFile, validateImageFile } from "@/lib/pubky/files";
import { getPubkyImageUrl } from "@/lib/pubky/utils";
import { HEADER_BANNER } from "@/lib/constants";
import { matchesBannerAspectRatio, getImageDimensions, getCroppedImageFile } from "@/lib/utils/image-crop";

interface ImageUploadProps {
    value?: string | null;
    onChange: (imageUri: string | undefined) => void;
    title?: string;
    description?: string;
}

export function ImageUpload({
    value,
    onChange,
    title = "Image",
    description = "Upload an image (max 5MB)",
}: ImageUploadProps) {
    const { auth } = useAuth();
    const [isUploading, setIsUploading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [imageKey, setImageKey] = useState(0);
    const [imageLoadError, setImageLoadError] = useState(false);
    const retryCountRef = useRef(0);

    const handleImageError = useCallback(() => {
        if (retryCountRef.current < 3) {
            retryCountRef.current += 1;
            const retry = retryCountRef.current;
            setTimeout(() => {
                setImageKey(prev => prev + 1);
            }, 1000 * retry);
        } else {
            setImageLoadError(true);
        }
    }, []);
    const [cropperOpen, setCropperOpen] = useState(false);
    const [pendingImageSrc, setPendingImageSrc] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Hardcoded so Tailwind can detect the class at build time
    const aspectClass = "aspect-[1200/500]";

    /**
     * Handle a selected file: validate, check aspect ratio, then either
     * skip cropping (if ratio matches) or open the cropper dialog.
     */
    const handleFileSelect = async (file: File) => {
        const validationError = validateImageFile(file, 5);
        if (validationError) {
            toast.error(validationError);
            return;
        }

        if (!auth.session) {
            toast.error("You must be logged in to upload images");
            return;
        }

        // Read the file as a data URL to check dimensions and for the cropper
        const dataUrl = await readFileAsDataUrl(file);

        try {
            const { width, height } = await getImageDimensions(dataUrl);

            if (matchesBannerAspectRatio(width, height)) {
                // Aspect ratio matches — resize directly and upload, skip cropper
                const resizedFile = await getCroppedImageFile(
                    dataUrl,
                    { x: 0, y: 0, width, height },
                    file.name
                );
                await uploadFile(resizedFile);
            } else {
                // Aspect ratio doesn't match — open cropper
                setPendingImageSrc(dataUrl);
                setCropperOpen(true);
            }
        } catch (error) {
            console.error("Error processing image:", error);
            toast.error("Failed to process image");
        }
    };

    /**
     * Upload a file (already cropped/resized) to the homeserver.
     */
    const uploadFile = async (file: File) => {
        if (!auth.session) return;

        setIsUploading(true);

        try {
            // Try to delete old image, but don't block upload if it fails
            if (value) {
                try {
                    await deleteImageFile(auth.session, value);
                } catch (deleteError) {
                    console.warn("Failed to delete old image, continuing with upload:", deleteError);
                }
            }

            const imageUri = await uploadImageFile(auth.session, auth.publicKey!, file);
            onChange(imageUri);
            setImageKey(prev => prev + 1);
            setImageLoadError(false);

            toast.success("Image uploaded successfully");
        } catch (error) {
            console.error("Error uploading image:", error);
            toast.error("Failed to upload image");
        } finally {
            setIsUploading(false);
        }
    };

    const handleCropComplete = async (croppedFile: File) => {
        setCropperOpen(false);
        setPendingImageSrc(null);
        await uploadFile(croppedFile);
    };

    const handleCropCancel = () => {
        setCropperOpen(false);
        setPendingImageSrc(null);
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        const file = e.dataTransfer.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
    };

    const handleDelete = async () => {
        if (!value || !auth.session) return;

        setIsDeleting(true);

        try {
            await deleteImageFile(auth.session, value);
            onChange(undefined);
            toast.success("Image removed");
        } catch (error) {
            console.error("Error deleting image:", error);
            toast.error("Failed to remove image");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleReplace = () => {
        fileInputRef.current?.click();
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <FormSection
            title={title}
            description={description}
        >
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileInputChange}
                className="hidden"
            />

            {value ? (
                <div className="relative group rounded-lg overflow-hidden border bg-muted -mx-6 sm:mx-0">
                    {isUploading || isDeleting ? (
                        <Skeleton className={`${aspectClass} w-full`} style={{ aspectRatio: HEADER_BANNER.aspectRatio }} />
                    ) : imageLoadError ? (
                        <div
                            className={`${aspectClass} w-full flex flex-col items-center justify-center bg-destructive/10 text-destructive p-4`}
                            style={{ aspectRatio: HEADER_BANNER.aspectRatio }}
                        >
                            <AlertTriangle className="h-8 w-8 mb-2" />
                            <p className="text-sm font-medium text-center mb-1">Image not available</p>
                            <p className="text-xs text-muted-foreground text-center mb-3">
                                The image may not be indexed yet
                            </p>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={handleReplace}
                                    disabled={isUploading || isDeleting}
                                >
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Replace
                                </Button>
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    onClick={handleDelete}
                                    disabled={isUploading || isDeleting}
                                >
                                    <X className="h-4 w-4 mr-2" />
                                    Remove
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <Image
                                key={imageKey}
                                src={getPubkyImageUrl(value, "main") + (retryCountRef.current > 0 ? `?retry=${retryCountRef.current}` : '')}
                                alt="Uploaded image"
                                width={1200}
                                height={500}
                                className={`${aspectClass} w-full object-cover`}
                                style={{ aspectRatio: HEADER_BANNER.aspectRatio }}
                                onLoad={() => {
                                    setImageLoadError(false);
                                    retryCountRef.current = 0;
                                }}
                                onError={handleImageError}
                                unoptimized
                            />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={handleReplace}
                                    disabled={isUploading || isDeleting}
                                >
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Replace
                                </Button>
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    onClick={handleDelete}
                                    disabled={isUploading || isDeleting}
                                >
                                    <X className="h-4 w-4 mr-2" />
                                    Delete
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            ) : (
                <div
                    className={`
                        border-2 border-dashed rounded-lg p-6 sm:p-8 cursor-pointer
                        transition-colors
                        ${dragActive
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50 hover:bg-accent/50"
                        }
                    `}
                    onClick={handleUploadClick}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                >
                    {isUploading ? (
                        <div className="flex flex-col items-center gap-2 sm:gap-3">
                            <Skeleton className="h-10 w-10 sm:h-12 sm:w-12 rounded-full" />
                            <Skeleton className="h-4 w-24 sm:w-32" />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-2 sm:gap-3 text-center">
                            <div className="p-2.5 sm:p-3 rounded-full bg-primary/10">
                                <Upload className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                            </div>
                            <div>
                                <p className="text-sm font-medium">
                                    Click to upload or drag and drop
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    PNG, JPG, GIF up to 5MB • Cropped to {HEADER_BANNER.width}×{HEADER_BANNER.height}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Image Cropper Dialog */}
            {pendingImageSrc && (
                <ImageCropper
                    imageSrc={pendingImageSrc}
                    open={cropperOpen}
                    onOpenChange={(open) => {
                        if (!open) handleCropCancel();
                    }}
                    onCropComplete={handleCropComplete}
                    onCancel={handleCropCancel}
                />
            )}
        </FormSection>
    );
}

function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
    });
}
