import { NextRequest, NextResponse } from "next/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";

const RP_ID = process.env.NEXT_PUBLIC_RP_ID || "localhost";
const ORIGIN = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// In-memory stores (replace with database in production)
const userCredentials = new Map<string, any[]>();
const challenges = new Map<string, string>();

export async function POST(request: NextRequest) {
  try {
    const { userId, credential } = await request.json();
    
    if (!userId || !credential) {
      return NextResponse.json(
        { error: "User ID and credential required" },
        { status: 400 }
      );
    }

    const expectedChallenge = challenges.get(userId);
    if (!expectedChallenge) {
      return NextResponse.json(
        { error: "Challenge not found. Please try again." },
        { status: 400 }
      );
    }

    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json(
        { error: "Verification failed" },
        { status: 400 }
      );
    }

    // Store credential
    const existingCredentials = userCredentials.get(userId) || [];
    existingCredentials.push({
      id: verification.registrationInfo.credential.id,
      publicKey: verification.registrationInfo.credential.publicKey,
      counter: verification.registrationInfo.credential.counter,
      transports: credential.response.transports,
    });
    userCredentials.set(userId, existingCredentials);

    // Clean up challenge
    challenges.delete(userId);

    return NextResponse.json({ 
      verified: true,
      message: "Passkey registered successfully"
    });
  } catch (error: any) {
    console.error("Passkey verify error:", error);
    return NextResponse.json(
      { error: error.message || "Verification failed" },
      { status: 500 }
    );
  }
}
