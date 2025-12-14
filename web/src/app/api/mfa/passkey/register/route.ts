import { NextRequest, NextResponse } from "next/server";

const BOT_API_URL = process.env.BOT_API_URL || "http://localhost:5000";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        
        // Proxy to Bot API
        const response = await fetch(`${BOT_API_URL}/api/auth/mfa/passkey/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            return NextResponse.json(
                { error: data.error || "Failed to generate registration options" },
                { status: response.status }
            );
        }
        
        return NextResponse.json(data);
    } catch (error: any) {
        console.error("Passkey register proxy error:", error);
        return NextResponse.json(
            { error: "Failed to connect to authentication service" },
            { status: 500 }
        );
    }
}
