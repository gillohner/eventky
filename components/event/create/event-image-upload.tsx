"use client";

import { useState, useRef } from "react";
import { Control, UseFormSetValue } from "react-hook-form";
import type { EventFormData } from "@/types/event";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Upload, X, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { uploadImageFile, deleteImageFile, validateImageFile } from "@/lib/pubky/files";
import { getPubkyImageUrl } from "@/lib/pubky/utils";

interface EventImageUploadProps {
    control: Control<EventFormData>;
    setValue: UseFormSetValue<EventFormData>;
    value?: string | null;
}

export function EventImageUpload({
    setValue,
    value,
}: EventImageUploadProps) {
    const { auth } = useAuth();
    const [isUploading, setIsUploading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [imageKey, setImageKey] = useState(0); // Force image reload
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (file: File) => {
        // Validate file
        const validationError = validateImageFile(file, 5);
        if (validationError) {
            toast.error(validationError);
            return;
        }

        if (!auth.session) {
            toast.error("You must be logged in to upload images");
            return;
        }

        setIsUploading(true);

        try {
            // Delete old image if replacing
            if (value) {
                await deleteImageFile(auth.session, value);
            }

            // Upload new image
            const imageUri = await uploadImageFile(auth.session, auth.publicKey!, file);
            setValue("image_uri", imageUri);

            // Force image reload with new key
            setImageKey(prev => prev + 1);

            toast.success("Image uploaded successfully");
        } catch (error) {
            console.error("Error uploading image:", error);
            toast.error("Failed to upload image");
        } finally {
            setIsUploading(false);
        }
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
        // Reset input
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
            setValue("image_uri", undefined);
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
        <Card>
            <CardContent className="pt-6">
                <div className="space-y-2">
                    <Label>Event Image</Label>
                    <p className="text-sm text-muted-foreground">
                        Upload a banner image for your event (max 5MB)
                    </p>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileInputChange}
                        className="hidden"
                    />

                    {value ? (
                        // Image Preview with Controls - extends beyond card on mobile
                        <div className="relative group rounded-lg overflow-hidden border bg-muted -mx-6 sm:mx-0">
                            {isUploading || isDeleting ? (
                                <Skeleton className="aspect-video sm:aspect-[21/9] w-full" />
                            ) : (
                                <>
                                    <img
                                        key={imageKey}
                                        src={getPubkyImageUrl(value, "main")}
                                        alt="Event banner"
                                        className="aspect-video sm:aspect-[21/9] w-full object-cover"
                                        onError={(e) => {
                                            // Retry loading after delay if image fails
                                            const img = e.currentTarget;
                                            const retryCount = parseInt(img.dataset.retryCount || "0");
                                            if (retryCount < 3) {
                                                img.dataset.retryCount = String(retryCount + 1);
                                                setTimeout(() => {
                                                    img.src = getPubkyImageUrl(value, "main") + `?retry=${retryCount}`;
                                                }, 1000 * (retryCount + 1)); // 1s, 2s, 3s delays
                                            }
                                        }}
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
                        // Upload Area
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
                                            PNG, JPG, GIF up to 5MB
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
