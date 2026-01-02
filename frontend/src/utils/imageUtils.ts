/**
 * Image URL Utilities
 * Normalizes image URLs for avatars and asset logos
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

/**
 * Normalize GCP image URL - converts backend URLs to Next.js API route format
 * @param {string} url - Original URL (may include backend URL prefix)
 * @returns {string | null} Normalized URL for Next.js Image component
 */
function normalizeGcpUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  
  // Handle backend URLs with GCP path (most common case)
  if (url.includes('/api/image/gcp/')) {
    const match = url.match(/\/api\/image\/gcp\/(.+)$/);
    if (match) {
      // Remove backend URL prefix if present, keep just the path
      const gcpPath = match[1];
      return `/api/image/gcp/${gcpPath}`;
    }
  }
  
  // Return as-is if already in correct format (Next.js API route)
  if (url.startsWith('/api/image/')) {
    return url;
  }
  
  return url;
}

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
  
  // Handle GCP URLs
  const gcpNormalized = normalizeGcpUrl(avatarUrl);
  if (gcpNormalized) return gcpNormalized;
  
  // Handle backend URLs with avatar path (legacy)
  if (avatarUrl.includes('/api/image/avatar/')) {
    const match = avatarUrl.match(/\/api\/image\/avatar\/(.+)$/);
    if (match) {
      // Remove backend URL prefix if present
      return `/api/image/avatar/${match[1]}`;
    }
  }
  
  // Handle OAuth provider avatar URLs (Google, Apple, Meta, X, etc.)
  // Note: OAuth avatars should now be stored in GCP, but we keep this for backward compatibility
  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
    // Google OAuth avatars - these should be migrated to GCP
    if (avatarUrl.includes('lh3.googleusercontent.com') || 
        avatarUrl.includes('googleusercontent.com')) {
      // In development, allow OAuth URLs temporarily
      // In production, all avatars should be in GCP
      if (process.env.NODE_ENV === 'production') {
        console.warn('OAuth avatar URL detected in production - should be migrated to GCP:', avatarUrl);
      }
      return avatarUrl;
    }
    // Return as-is for any external URL
    return avatarUrl;
  }
  
  // Return as-is for external URLs
  return avatarUrl;
}

/**
 * Normalize logo URL - converts backend URLs to Next.js API route format
 * Ensures all logos use GCP URLs with proper caching
 * @param {string} logoUrl - Original logo URL
 * @returns {string | null} Normalized logo URL
 */
export function normalizeLogoUrl(logoUrl: string | null | undefined): string | null {
  if (!logoUrl) return null;
  
  // Handle GCP URLs (most common case)
  const gcpNormalized = normalizeGcpUrl(logoUrl);
  if (gcpNormalized) return gcpNormalized;
  
  // Handle external URLs (from APIs - should be migrated to GCP)
  if (logoUrl.startsWith('http://') || logoUrl.startsWith('https://')) {
    // Log warning for external URLs that should be in GCP
    if (process.env.NODE_ENV === 'production') {
      console.warn('External logo URL detected - should be migrated to GCP:', logoUrl);
    }
    return logoUrl;
  }
  
  return logoUrl;
}

