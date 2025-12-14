import { NextRequest, NextResponse } from 'next/server';

const BOT_API_URL = process.env.BOT_API_URL || 'http://localhost:5000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Get device info from request headers
    const deviceInfo = {
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'Unknown',
      user_agent: request.headers.get('user-agent') || 'Unknown',
    };
    
    console.log('[MFA Discord Send] Proxying to bot API:', BOT_API_URL);
    
    const response = await fetch(`${BOT_API_URL}/api/auth/mfa/discord/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...body,
        device_info: deviceInfo,
      }),
    });
    
    const data = await response.json();
    console.log('[MFA Discord Send] Bot API response:', data);
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[MFA Discord Send] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to connect to bot API. Bot may be offline.',
        dev_mode: process.env.NODE_ENV === 'development',
      },
      { status: 503 }
    );
  }
}
