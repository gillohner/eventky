"use client";

import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Area, Point } from "react-easy-crop";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { HEADER_BANNER } from "@/lib/constants";
import { getCroppedImageFile } from "@/lib/utils/image-crop";
import { ZoomIn, ZoomOut, Check, X } from "lucide-react";

interface ImageCropperProps {
    /** The image source (data URL or object URL) to crop */
    imageSrc: string;
    /** Whether the cropper dialog is open */
    open: boolean;
    /** Called when the dialog should close */
    onOpenChange: (open: boolean) => void;
    /** Called with the cropped image file when confirmed */
    onCropComplete: (croppedFile: File) => void;
    /** Called when the user cancels */
    onCancel: () => void;
}

/**
 * Modal image cropper that enforces the HEADER_BANNER aspect ratio (1200x500).
 * Uses react-easy-crop with zoom and pan controls.
 */
export function ImageCropper({
    imageSrc,
    open,
    onOpenChange,
    onCropComplete,
    onCancel,
}: ImageCropperProps) {
    const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const onCropChange = useCallback((location: Point) => {
        setCrop(location);
    }, []);

    const onZoomChange = useCallback((newZoom: number) => {
        setZoom(newZoom);
    }, []);

    const onCropAreaComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleConfirm = async () => {
        if (!croppedAreaPixels) return;

        setIsProcessing(true);
        try {
            const croppedFile = await getCroppedImageFile(imageSrc, croppedAreaPixels);
            onCropComplete(croppedFile);
        } catch (error) {
            console.error("Error cropping image:", error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCancel = () => {
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        onCancel();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Crop Image</DialogTitle>
                    <DialogDescription>
                        Drag to reposition and use the slider to zoom. Image will be resized to {HEADER_BANNER.width}×{HEADER_BANNER.height}.
                    </DialogDescription>
                </DialogHeader>

                {/* Cropper Area — taller container for more room, crop selection stays at 1200/500 */}
                <div className="relative w-full aspect-[4/3] bg-muted rounded-md overflow-hidden">
                    <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        aspect={HEADER_BANNER.ratio}
                        onCropChange={onCropChange}
                        onZoomChange={onZoomChange}
                        onCropComplete={onCropAreaComplete}
                        objectFit="horizontal-cover"
                    />
                </div>

                {/* Zoom Controls */}
                <div className="flex items-center gap-3 px-1">
                    <ZoomOut className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Slider
                        value={[zoom]}
                        onValueChange={(values) => setZoom(values[0])}
                        min={1}
                        max={3}
                        step={0.05}
                        className="flex-1"
                    />
                    <ZoomIn className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={handleCancel}
                        disabled={isProcessing}
                    >
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={isProcessing || !croppedAreaPixels}
                    >
                        <Check className="h-4 w-4 mr-1" />
                        {isProcessing ? "Processing..." : "Apply Crop"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
