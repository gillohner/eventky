# Images

How images are stored and served in Eventky.

## Architecture

Images use Pubky's two-record pattern:

1. **Blob** — Raw binary data stored at `/pub/pubky.app/blobs/:id`
2. **File** — JSON metadata referencing the blob at `/pub/pubky.app/files/:id`

## Storage (Write Path)

Use `uploadImageFile()` to upload images:

```typescript
import { uploadImageFile } from "@/lib/pubky/files";

const fileUri = await uploadImageFile(session, userId, file);
// Returns: pubky://userId/pub/pubky.app/files/fileId
```

This function:
1. Reads file as `Uint8Array`
2. Creates blob record via `PubkySpecsBuilder.createBlob()`
3. Uploads raw bytes to homeserver
4. Creates file metadata via `PubkySpecsBuilder.createFile()`
5. Uploads file JSON to homeserver

### Deletion

```typescript
import { deleteImageFile } from "@/lib/pubky/files";

await deleteImageFile(session, fileUri);
```

Deletes both blob and file records.

## Display (Read Path)

Images are served through Nexus, which:
- Indexes uploaded files
- Generates size variants
- Caches for performance

### URL Helpers

```typescript
import { getPubkyImageUrl, getPubkyAvatarUrl } from "@/lib/pubky/utils";

// Event/calendar images
getPubkyImageUrl(fileUri, "main");  // Full size
getPubkyImageUrl(fileUri, "feed");  // Thumbnail

// User avatars
getPubkyAvatarUrl(userUri);
```

### Variants

| Variant | Use Case | Size |
|---------|----------|------|
| `main` | Full display, modals | Original/large |
| `feed` | Lists, thumbnails | Smaller |

### URL Format

```
https://nexus.pubky.app/file/{userId}/{fileId}/{variant}
https://nexus.pubky.app/avatar/{userId}
```

## In Event/Calendar Records

Images are referenced by their file URI:

```typescript
// Event with image
const event = {
    // ...
    image_uri: "pubky://userId/pub/pubky.app/files/abc123"
};

// Calendar with image  
const calendar = {
    // ...
    image_uri: "pubky://userId/pub/pubky.app/files/xyz789"
};
```

## Related

- [`lib/pubky/files.ts`](/lib/pubky/files.ts) — Upload/delete functions
- [`lib/pubky/utils.ts`](/lib/pubky/utils.ts) — URL helpers
- [`types/image.ts`](/types/image.ts) — Variant types
