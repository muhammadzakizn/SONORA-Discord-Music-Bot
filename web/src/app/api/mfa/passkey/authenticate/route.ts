import { NextRequest, NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";

const RP_ID = process.env.NEXT_PUBLIC_RP_ID || "localhost";

// In-memory stores (replace with database in production)  
const userCredentials = new Map<string, any[]>();
const challenges = new Map<string, string>();

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    const existingCredentials = userCredentials.get(userId) || [];
    
    if (existingCredentials.length === 0) {
      return NextResponse.json(
        { error: "No passkey registered. Please set up a passkey first." },
        { status: 400 }
      );
    }

    const options = await generateAuthenticationOptions({
      rpID: RP_ID,
      allowCredentials: existingCredentials.map((cred) => ({
        id: cred.id,
        transports: cred.transports,
      })),
      userVerification: "preferred",
    });

    // Store challenge
    challenges.set(userId, options.challenge);

    return NextResponse.json(options);
  } catch (error: any) {
    console.error("Passkey auth error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate authentication options" },
      { status: 500 }
    );
  }
}
