// Re-export the official Profile type from pubky-app-specs
// PubkyAppUser is the class, we use its JSON representation
export interface UserProfile {
  name: string;
  bio?: string;
  image?: string;
  links?: Array<{ title: string; url: string }>;
  status?: string;
}
