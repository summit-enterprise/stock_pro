'use client';

import { useState } from 'react';
import Image from 'next/image';
import { normalizeLogoUrl } from '@/utils/imageUtils';

interface AssetIconProps {
  symbol: string;
  name?: string;
  type?: string;
  category?: string;
  logoUrl?: string | null;
  size?: number;
  className?: string;
}

const DEFAULT_ICONS: { [key: string]: string } = {
  stock: '📈',
  equity: '📈',
  equities: '📈',
  crypto: '₿',
  cryptocurrency: '₿',
  etf: '📊',
  forex: '💱',
  commodity: '⚡',
  bond: '📜',
  default: '💼',
};

export default function AssetIcon({ 
  symbol, 
  name, 
  type, 
  category, 
  logoUrl, 
  size = 24,
  className = '' 
}: AssetIconProps) {
  const [imgError, setImgError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const assetType = (category || type || '').toLowerCase();
  const defaultIcon = DEFAULT_ICONS[assetType] || DEFAULT_ICONS.default;

  // If no logo URL or image failed to load, show default icon
  if (!logoUrl || imgError) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-200 dark:bg-zinc-700 rounded-full ${className}`}
        style={{ width: size, height: size, minWidth: size, minHeight: size }}
        title={name || symbol}
      >
        <span style={{ fontSize: size * 0.6 }}>{defaultIcon}</span>
      </div>
    );
  }

  // Normalize logo URL for Next.js Image component
  // Ensures GCP URLs use Next.js API route for optimization and caching
  const normalizedLogoUrl = normalizeLogoUrl(logoUrl);

  return (
    <div 
      className={`relative flex items-center justify-center rounded-full overflow-hidden ${className}`}
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
      title={name || symbol}
    >
      {normalizedLogoUrl && (
        <Image
          src={normalizedLogoUrl}
          alt={`${name || symbol} logo`}
          width={size}
          height={size}
          className="object-cover w-full h-full"
          onError={() => {
            setImgError(true);
            setIsLoading(false);
          }}
          onLoad={() => setIsLoading(false)}
          style={{ display: isLoading ? 'none' : 'block' }}
          unoptimized={normalizedLogoUrl?.includes('lh3.googleusercontent.com')} // OAuth avatars don't need optimization
        />
      )}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-200 dark:bg-zinc-700">
          <span style={{ fontSize: size * 0.4 }}>⏳</span>
        </div>
      )}
    </div>
  );
}

