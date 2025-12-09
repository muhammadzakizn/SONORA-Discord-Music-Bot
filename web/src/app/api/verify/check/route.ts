import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { userId, code } = await request.json();
        
        if (!userId || !code) {
            return NextResponse.json(
                { verified: false, error: 'User ID and code are required' },
                { status: 400 }
            );
        }

        console.log(`Verifying code for user ${userId}: ${code}`);

        // Call bot API to verify the code
        try {
            const botResponse = await fetch('http://localhost:5000/api/verify/check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, code }),
            });

            const data = await botResponse.json();
            console.log('Bot API response:', data);

            // Forward the response from bot API directly
            if (data.verified) {
                return NextResponse.json({
                    verified: true,
                    message: data.message || 'Verification successful',
                });
            } else {
                return NextResponse.json(
                    { verified: false, error: data.error || 'Verification failed' },
                    { status: 400 }
                );
            }
        } catch (botError) {
            console.error('Bot API error:', botError);
            return NextResponse.json(
                { verified: false, error: 'Could not connect to verification server. Please try again.' },
                { status: 503 }
            );
        }
    } catch (error) {
        console.error('Check verification error:', error);
        return NextResponse.json(
            { verified: false, error: 'Failed to verify code' },
            { status: 500 }
        );
    }
}
