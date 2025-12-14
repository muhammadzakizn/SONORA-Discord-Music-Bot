import { NextRequest, NextResponse } from "next/server";

// Bot API URL for TOTP operations
const BOT_API_URL = process.env.BOT_API_URL || 'http://localhost:5000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = body.userId || body.user_id;
    
    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    console.log('[TOTP Setup] Proxying to Bot API for user:', userId);

    // Proxy to Bot API which handles encryption and database storage
    const response = await fetch(`${BOT_API_URL}/api/auth/mfa/totp/setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }),
    });

    if (!response.ok) {
      console.error('[TOTP Setup] Bot API error:', response.status);
      // Fallback: generate locally if Bot API unavailable
      const { authenticator } = await import("otplib");
      const QRCode = await import("qrcode");
      
      const secret = authenticator.generateSecret();
      const otpAuthUrl = authenticator.keyuri(
        `user_${userId}`,
        "SONORA Dashboard",
        secret
      );
      const qrCode = await QRCode.default.toDataURL(otpAuthUrl);
      
      console.log('[TOTP Setup] Fallback mode - NOTE: Secret NOT persisted to database!');
      
      return NextResponse.json({
        success: true,
        qrCode,
        secret,
        fallback: true,
        message: "Scan QR code with your authenticator app (Fallback mode)"
      });
    }

    const data = await response.json();
    console.log('[TOTP Setup] Bot API success');
    
    return NextResponse.json({
      success: true,
      qrCode: data.qr_code,
      secret: data.secret,
      message: "Scan QR code with your authenticator app"
    });
  } catch (error: unknown) {
    console.error("TOTP setup error:", error);
    const message = error instanceof Error ? error.message : "Failed to setup authenticator";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
