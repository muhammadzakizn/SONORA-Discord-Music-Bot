import { NextRequest, NextResponse } from "next/server";

// Bot API URL for TOTP operations
const BOT_API_URL = process.env.BOT_API_URL || 'http://localhost:5000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = body.userId || body.user_id;
    const code = body.code;
    const secret = body.secret; // For setup verification
    const isSetup = body.isSetup !== false; // Default true for backwards compatibility
    
    if (!userId || !code) {
      return NextResponse.json(
        { error: "User ID and code required", valid: false },
        { status: 400 }
      );
    }

    console.log('[TOTP Verify] Proxying to Bot API for user:', userId, 'isSetup:', isSetup);

    // Choose endpoint based on whether this is setup verification or login verification
    const endpoint = isSetup && secret 
      ? `${BOT_API_URL}/api/auth/mfa/totp/verify-setup`
      : `${BOT_API_URL}/api/auth/mfa/totp/verify`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        user_id: userId, 
        code,
        ...(secret && isSetup ? { secret } : {})
      }),
    });

    if (!response.ok) {
      console.error('[TOTP Verify] Bot API error:', response.status);
      
      // Fallback: verify locally if Bot API unavailable AND we have secret
      if (secret) {
        const { authenticator } = await import("otplib");
        authenticator.options = { window: 1 };
        const isValid = authenticator.verify({ token: code, secret });
        
        if (isValid) {
          console.log('[TOTP Verify] Fallback verification successful');
          return NextResponse.json({
            valid: true,
            verified: true,
            success: true,
            message: "TOTP verification successful (Fallback mode)",
            fallback: true
          });
        }
      }
      
      return NextResponse.json(
        { error: "Invalid code. Please try again.", valid: false },
        { status: 400 }
      );
    }

    const data = await response.json();
    console.log('[TOTP Verify] Bot API response:', data.success);
    
    return NextResponse.json({
      valid: data.success,
      verified: data.success,
      success: data.success,
      message: data.message || "TOTP verification successful",
      backup_codes: data.backup_codes,
      remaining_codes: data.remaining_codes
    });
  } catch (error: unknown) {
    console.error("TOTP verify error:", error);
    const message = error instanceof Error ? error.message : "Verification failed";
    return NextResponse.json(
      { error: message, valid: false },
      { status: 500 }
    );
  }
}
