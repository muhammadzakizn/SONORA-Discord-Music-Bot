import { NextRequest, NextResponse } from 'next/server';

const BOT_API_URL = process.env.BOT_API_URL || 'http://localhost:5000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('[MFA Discord Verify] Proxying to bot API:', BOT_API_URL);
    
    const response = await fetch(`${BOT_API_URL}/api/auth/mfa/discord/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    console.log('[MFA Discord Verify] Bot API response:', data);
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[MFA Discord Verify] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to verify code. Bot may be offline.',
      },
      { status: 503 }
    );
  }
}
