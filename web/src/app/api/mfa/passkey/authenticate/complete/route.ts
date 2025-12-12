import { NextRequest, NextResponse } from "next/server";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";

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

    const existingCredentials = userCredentials.get(userId) || [];
    const authenticator = existingCredentials.find(
      (cred) => cred.id === credential.id
    );

    if (!authenticator) {
      return NextResponse.json(
        { error: "Authenticator not found" },
        { status: 400 }
      );
    }

    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      credential: {
        id: authenticator.id,
        publicKey: authenticator.publicKey,
        counter: authenticator.counter,
        transports: authenticator.transports,
      }
    });

    if (!verification.verified) {
      return NextResponse.json(
        { error: "Authentication failed" },
        { status: 400 }
      );
    }

    // Update counter
    authenticator.counter = verification.authenticationInfo.newCounter;
    
    // Clean up challenge
    challenges.delete(userId);

    return NextResponse.json({ 
      verified: true,
      message: "Authentication successful"
    });
  } catch (error: any) {
    console.error("Passkey auth verify error:", error);
    return NextResponse.json(
      { error: error.message || "Authentication failed" },
      { status: 500 }
    );
  }
}
