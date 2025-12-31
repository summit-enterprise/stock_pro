/**
 * Image URL Utilities
 * Normalizes image URLs, especially for avatars
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

/**
 * Normalize avatar URL - converts old mock-storage URLs to new format
 * Uses Next.js API route for proper image optimization
 * @param {string} avatarUrl - Original avatar URL
 * @returns {string | null} Normalized avatar URL
 */
export function normalizeAvatarUrl(avatarUrl: string | null | undefined): string | null {
  if (!avatarUrl) return null;
  
  // Convert old mock-storage.example.com URLs
  if (avatarUrl.includes('mock-storage.example.com')) {
    // Extract filename from old URL
    const match = avatarUrl.match(/\/avatars\/(.+)$/);
    if (match) {
      const filename = match[1];
      // Convert .jpg to .webp if needed (old format was .jpg, new is .webp)
      const normalizedFilename = filename.replace(/\.jpg$/, '.webp');
      // Use Next.js API route for proper image optimization
      return `/api/image/avatar/${normalizedFilename}`;
    }
  }
  
  // If it's already a backend URL, convert to Next.js API route
  if (avatarUrl.includes(BACKEND_URL) && avatarUrl.includes('/api/image/avatar/')) {
    const match = avatarUrl.match(/\/api\/image\/avatar\/(.+)$/);
    if (match) {
      return `/api/image/avatar/${match[1]}`;
    }
  }
  
  // If it's a GCP URL, use the GCP proxy route
  if (avatarUrl.includes('/api/image/gcp/')) {
    const match = avatarUrl.match(/\/api\/image\/gcp\/(.+)$/);
    if (match) {
      // For GCP images, we need to proxy through Next.js API route too
      return `/api/image/gcp/${match[1]}`;
    }
  }
  
  // Return as-is if already in correct format (Next.js API route)
  if (avatarUrl.startsWith('/api/image/')) {
    return avatarUrl;
  }
  
  // Handle OAuth provider avatar URLs (Google, Apple, Meta, X, etc.)
  // These are external URLs that Next.js Image can handle directly
  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
    // Google OAuth avatars
    if (avatarUrl.includes('lh3.googleusercontent.com') || 
        avatarUrl.includes('googleusercontent.com')) {
      return avatarUrl;
    }
    // Future: Add other OAuth providers (Apple, Meta, X, etc.)
    // For now, return as-is for any external URL
    return avatarUrl;
  }
  
  // Return as-is for external URLs
  return avatarUrl;
}

