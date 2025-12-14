import { NextRequest, NextResponse } from "next/server";

const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY;

export async function POST(request: NextRequest) {
    try {
        const { token } = await request.json();

        if (!token) {
            return NextResponse.json(
                { success: false, error: "CAPTCHA token required" },
                { status: 400 }
            );
        }

        if (!TURNSTILE_SECRET_KEY) {
            console.error("[Turnstile] Secret key not configured");
            // In development, allow bypass if no secret key
            if (process.env.NODE_ENV === "development") {
                return NextResponse.json({ success: true });
            }
            return NextResponse.json(
                { success: false, error: "CAPTCHA not configured" },
                { status: 500 }
            );
        }

        // Verify with Cloudflare
        const formData = new URLSearchParams();
        formData.append("secret", TURNSTILE_SECRET_KEY);
        formData.append("response", token);

        // Get client IP
        const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || 
                   request.headers.get("x-real-ip") || 
                   "unknown";
        formData.append("remoteip", ip);

        const verifyResponse = await fetch(
            "https://challenges.cloudflare.com/turnstile/v0/siteverify",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: formData.toString(),
            }
        );

        const result = await verifyResponse.json();

        console.log("[Turnstile] Verification result:", result);

        if (result.success) {
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json(
                { 
                    success: false, 
                    error: "CAPTCHA verification failed",
                    codes: result["error-codes"]
                },
                { status: 400 }
            );
        }
    } catch (error: any) {
        console.error("[Turnstile] Verification error:", error);
        return NextResponse.json(
            { success: false, error: "Verification failed" },
            { status: 500 }
        );
    }
}
