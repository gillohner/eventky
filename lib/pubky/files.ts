/**
 * File and blob upload utilities for Pubky
 */

import { Session } from "@synonymdev/pubky";
import { PubkySpecsBuilder } from "pubky-app-specs";

/**
 * Upload an image file to Pubky homeserver
 * Creates both blob and file records
 * 
 * @param session - Authenticated Pubky session
 * @param userId - User's public key (z32 format)
 * @param file - File object to upload
 * @returns File URI (pubky://) for use in image_uri field
 */
export async function uploadImageFile(
    session: Session,
    userId: string,
    file: File
): Promise<string> {
    const builder = new PubkySpecsBuilder(userId);

    // Read file as blob data
    const arrayBuffer = await file.arrayBuffer();
    const blobData = new Uint8Array(arrayBuffer);

    // Create blob record
    const blobResult = builder.createBlob(blobData);

    // Upload blob data to homeserver
    // Blob must be uploaded as raw binary data, not JSON
    const blobPath = blobResult.meta.path as `/pub/${string}`;

    try {
        // Use session.storage.putBytes for raw binary upload
        await session.storage.putBytes(blobPath, blobData);
    } catch (error) {
        console.error("Blob upload error:", error);
        throw new Error(`Failed to upload blob: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Create file metadata record
    const fileResult = builder.createFile(
        file.name,
        blobResult.meta.url, // Reference to blob
        file.type,
        file.size
    );

    // Upload file metadata as JSON
    await session.storage.putJson(
        fileResult.meta.path as `/pub/${string}`,
        fileResult.file.toJson()
    );

    // Return file URI for use in form
    return fileResult.meta.url;
}

/**
 * Delete an image file and its associated blob from homeserver
 * 
 * @param session - Authenticated Pubky session
 * @param fileUri - File URI (pubky://) to delete
 */
export async function deleteImageFile(
    session: Session,
    fileUri: string
): Promise<void> {
    // Parse file URI to get path
    // Format: pubky://USER_ID/pub/pubky.app/files/FILE_ID
    const fileUrl = new URL(fileUri);
    const filePath = fileUrl.pathname as `/pub/${string}`;

    // Get file metadata to find blob reference
    const fileResponse = await session.storage.get(filePath);
    if (fileResponse && fileResponse.ok) {
        const fileData = await fileResponse.arrayBuffer();
        const fileJson = JSON.parse(new TextDecoder().decode(fileData));
        const blobUri = fileJson.src;

        // Delete blob if it exists
        if (blobUri) {
            const blobUrl = new URL(blobUri);
            const blobPath = blobUrl.pathname as `/pub/${string}`;
            await session.storage.delete(blobPath);
        }
    }

    // Delete file metadata
    await session.storage.delete(filePath);
}

/**
 * Validate image file before upload
 * 
 * @param file - File object to validate
 * @param maxSizeMB - Maximum file size in megabytes (default: 5MB)
 * @returns Error message if invalid, null if valid
 */
export function validateImageFile(file: File, maxSizeMB: number = 5): string | null {
    // Check file type
    if (!file.type.startsWith('image/')) {
        return 'Please select an image file';
    }

    // Check file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
        return `Image size must be less than ${maxSizeMB}MB`;
    }

    return null;
}
