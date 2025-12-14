import { NextRequest, NextResponse } from 'next/server';

const BOT_API_URL = process.env.BOT_API_URL || 'http://localhost:5000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('request_id');
    
    if (!requestId) {
      return NextResponse.json({ error: 'Request ID required' }, { status: 400 });
    }
    
    console.log('[MFA Discord Status] Checking status for:', requestId);
    
    const response = await fetch(
      `${BOT_API_URL}/api/auth/mfa/discord/status?request_id=${requestId}`,
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[MFA Discord Status] Error:', error);
    return NextResponse.json(
      { status: 'error', error: 'Failed to check approval status' },
      { status: 503 }
    );
  }
}
