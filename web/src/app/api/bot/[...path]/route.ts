import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy API requests to the Flask backend
 * This allows the Next.js frontend to communicate with Flask bot API
 * Works both locally (localhost:5000) and on Vercel (via BOT_API_URL)
 * 
 * Supports both JSON and FormData (for file uploads)
 */

const BOT_API_URL = process.env.BOT_API_URL || 'http://localhost:5000';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const targetPath = path.join('/');
  
  // Forward query parameters from the original request
  const searchParams = request.nextUrl.searchParams.toString();
  const queryString = searchParams ? `?${searchParams}` : '';
  const url = `${BOT_API_URL}/api/${targetPath}${queryString}`;
  
  console.log(`[Proxy] GET ${url}`);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log(`[Proxy] Response status: ${response.status}`);
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[Proxy] Connection error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to backend API', details: String(error) },
      { status: 503 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const targetPath = path.join('/');
  const url = `${BOT_API_URL}/api/${targetPath}`;
  
  const contentType = request.headers.get('content-type') || '';
  
  console.log(`[Proxy] POST ${url} (content-type: ${contentType})`);
  
  try {
    let fetchOptions: RequestInit;
    
    // Handle FormData (multipart/form-data) for file uploads
    if (contentType.includes('multipart/form-data')) {
      // Get the raw body as ArrayBuffer and forward it
      const body = await request.arrayBuffer();
      
      fetchOptions = {
        method: 'POST',
        headers: {
          // Forward the original content-type with boundary
          'Content-Type': contentType,
        },
        body: body,
      };
      
      console.log(`[Proxy] Forwarding FormData request (${body.byteLength} bytes)`);
    } else {
      // Handle JSON
      const body = await request.json().catch(() => ({}));
      
      fetchOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      };
    }
    
    const response = await fetch(url, fetchOptions);
    
    console.log(`[Proxy] Response status: ${response.status}`);
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[Proxy] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to backend API', details: String(error) },
      { status: 503 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const targetPath = path.join('/');
  const url = `${BOT_API_URL}/api/${targetPath}`;
  
  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to backend API' },
      { status: 503 }
    );
  }
}
