/**
 * Next.js API Route to proxy avatar images from backend
 * This handles Next.js Image component optimization requests
 */

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    // Await params (Next.js 15+ requires this)
    const resolvedParams = await params;
    // Reconstruct the filename from the path array
    const filename = resolvedParams.path.join('/');
    
    // Get query parameters from the request
    const searchParams = request.nextUrl.searchParams;
    const width = searchParams.get('w');
    const height = searchParams.get('h');
    const format = searchParams.get('format') || 'webp';
    
    // Build the backend URL
    const backendUrl = new URL(`${BACKEND_URL}/api/image/avatar/${filename}`);
    if (width) backendUrl.searchParams.set('w', width);
    if (height) backendUrl.searchParams.set('h', height);
    if (format) backendUrl.searchParams.set('format', format);
    
    // Fetch the image from backend
    const response = await fetch(backendUrl.toString());
    
    if (!response.ok) {
      return new NextResponse('Image not found', { status: response.status });
    }
    
    // Get the image buffer
    const imageBuffer = await response.arrayBuffer();
    
    // Get content type from response or default to format
    const contentType = response.headers.get('Content-Type') || `image/${format}`;
    
    // Return the image with appropriate headers
    // Use long cache for avatars (they're immutable)
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable', // Cache for 1 year
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Error proxying avatar image:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

