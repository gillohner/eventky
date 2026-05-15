export interface ParsedEventkyUri {
  userId: string;
  app: string;
  resource: string;
  resourceId: string;
}

export function parseEventkyUri(uri: string): ParsedEventkyUri {
  const parsed = new URL(uri);
  if (parsed.protocol !== "pubky:") {
    throw new Error(`Expected pubky:// URI, got: ${uri}`);
  }

  const userId = parsed.hostname;
  const parts = parsed.pathname.split("/").filter(Boolean);
  if (parts.length < 4 || parts[0] !== "pub") {
    throw new Error(`Invalid Eventky URI path: ${uri}`);
  }

  const app = parts[1];
  if (app !== "eventky.app") {
    throw new Error(`Expected app path 'eventky.app' but got '${app}' in URI: ${uri}`);
  }

  const resource = parts[2];
  const resourceId = parts[3];
  if (!resourceId) {
    throw new Error(`Missing resource id in URI: ${uri}`);
  }

  return { userId, app, resource, resourceId };
}
