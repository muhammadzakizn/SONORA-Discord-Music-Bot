import { NextRequest, NextResponse } from "next/server";
import { authenticator } from "otplib";

// In-memory store (replace with database in production)
const userTOTPSecrets = new Map<string, string>();

// Export for setup route to use
export { userTOTPSecrets };

export async function POST(request: NextRequest) {
  try {
    const { userId, code, secret: clientSecret } = await request.json();
    
    if (!userId || !code) {
      return NextResponse.json(
        { error: "User ID and code required" },
        { status: 400 }
      );
    }

    // Try in-memory first, then fall back to client-provided secret
    let secret = userTOTPSecrets.get(userId);
    
    if (!secret && clientSecret) {
      // Use client-provided secret (for fallback/stateless mode)
      secret = clientSecret;
      console.log('[TOTP Verify] Using client-provided secret');
    }
    
    if (!secret) {
      return NextResponse.json(
        { error: "TOTP not setup. Please setup authenticator first.", valid: false },
        { status: 400 }
      );
    }

    // Verify TOTP code with tolerance for time drift
    authenticator.options = { 
      window: 1, // Allow 1 step before/after for time drift
    };
    
    const isValid = authenticator.verify({ token: code, secret });
    
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid code. Please try again.", valid: false },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      verified: true,
      message: "TOTP verification successful"
    });
  } catch (error: any) {
    console.error("TOTP verify error:", error);
    return NextResponse.json(
      { error: error.message || "Verification failed", valid: false },
      { status: 500 }
    );
  }
}
