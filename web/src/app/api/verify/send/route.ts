import { NextRequest, NextResponse } from 'next/server';

// In-memory verification codes storage (in production, use Redis or database)
// Map: userId -> { code: string, expiresAt: number }
const verificationCodes = new Map<string, { code: string; expiresAt: number }>();

export async function POST(request: NextRequest) {
    try {
        const { userId } = await request.json();
        
        if (!userId) {
            return NextResponse.json(
                { error: 'User ID is required' },
                { status: 400 }
            );
        }

        // Generate 6-digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

        // Store code
        verificationCodes.set(userId, { code, expiresAt });
        console.log(`Verification code for user ${userId}: ${code}`);

        // Send code via Discord bot API
        try {
            const botResponse = await fetch('http://localhost:5000/api/verify/send-dm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, code }),
            });

            if (!botResponse.ok) {
                const errorData = await botResponse.json();
                console.error('Bot API error:', errorData);
                
                // Still return success but with warning
                // In development, the code is logged to console
                return NextResponse.json({
                    success: true,
                    message: 'Code generated (bot DM may have failed)',
                    devCode: process.env.NODE_ENV === 'development' ? code : undefined,
                });
            }

            return NextResponse.json({
                success: true,
                message: 'Verification code sent to your Discord DM',
            });
        } catch (botError) {
            console.error('Failed to reach bot API:', botError);
            
            // In development, return the code anyway
            return NextResponse.json({
                success: true,
                message: 'Code generated (bot offline)',
                devCode: process.env.NODE_ENV === 'development' ? code : undefined,
            });
        }
    } catch (error) {
        console.error('Send verification error:', error);
        return NextResponse.json(
            { error: 'Failed to generate verification code' },
            { status: 500 }
        );
    }
}

// Export the map for use by the check endpoint
export { verificationCodes };
