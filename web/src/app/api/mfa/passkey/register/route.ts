import { NextRequest, NextResponse } from "next/server";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";

// In production, these should be in env variables
const RP_NAME = "SONORA Dashboard";
const RP_ID = process.env.NEXT_PUBLIC_RP_ID || "localhost";
const ORIGIN = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// In-memory store (replace with database in production)
const userCredentials = new Map<string, any[]>();
const challenges = new Map<string, string>();

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    const existingCredentials = userCredentials.get(userId) || [];
    
    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: RP_ID,
      userID: new TextEncoder().encode(userId),
      userName: `user_${userId}`,
      attestationType: "none",
      excludeCredentials: existingCredentials.map((cred) => ({
        id: cred.id,
        transports: cred.transports,
      })),
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
        authenticatorAttachment: "platform", // Use platform authenticator (fingerprint, Face ID)
      },
    });

    // Store challenge for verification
    challenges.set(userId, options.challenge);

    return NextResponse.json(options);
  } catch (error: any) {
    console.error("Passkey register error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate registration options" },
      { status: 500 }
    );
  }
}
