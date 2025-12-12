import { NextRequest, NextResponse } from "next/server";
import { authenticator } from "otplib";

// In-memory store (replace with database in production)
const userTOTPSecrets = new Map<string, string>();

export async function POST(request: NextRequest) {
  try {
    const { userId, code } = await request.json();
    
    if (!userId || !code) {
      return NextResponse.json(
        { error: "User ID and code required" },
        { status: 400 }
      );
    }

    const secret = userTOTPSecrets.get(userId);
    if (!secret) {
      return NextResponse.json(
        { error: "TOTP not setup. Please setup authenticator first." },
        { status: 400 }
      );
    }

    // Verify TOTP code
    const isValid = authenticator.verify({ token: code, secret });
    
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid code. Please try again." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      verified: true,
      message: "TOTP verification successful"
    });
  } catch (error: any) {
    console.error("TOTP verify error:", error);
    return NextResponse.json(
      { error: error.message || "Verification failed" },
      { status: 500 }
    );
  }
}
