import { NextRequest, NextResponse } from "next/server";
import { authenticator } from "otplib";
import QRCode from "qrcode";

// In-memory store (replace with database in production)
const userTOTPSecrets = new Map<string, string>();

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    // Generate TOTP secret
    const secret = authenticator.generateSecret();
    
    // Store secret (in production, encrypt and store in database)
    userTOTPSecrets.set(userId, secret);
    
    // Generate OTP Auth URL
    const otpAuthUrl = authenticator.keyuri(
      `user_${userId}`,
      "SONORA Dashboard",
      secret
    );
    
    // Generate QR Code
    const qrCode = await QRCode.toDataURL(otpAuthUrl);
    
    return NextResponse.json({
      secret,
      qrCode,
      message: "Scan QR code with your authenticator app"
    });
  } catch (error: any) {
    console.error("TOTP setup error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to setup authenticator" },
      { status: 500 }
    );
  }
}
