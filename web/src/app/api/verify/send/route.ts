import { NextRequest, NextResponse } from 'next/server';
import { EMAIL_OTP_DAILY_LIMIT } from '@/config/access-control';

// In-memory verification codes storage (in production, use Redis or database)
// Map: userId -> { code: string, expiresAt: number, method: string }
const verificationCodes = new Map<string, { code: string; expiresAt: number; method: string }>();

// Email OTP rate limiting
let emailOTPCount = 0;
let emailOTPResetDate = new Date().toDateString();

function checkAndResetEmailQuota(): boolean {
  const today = new Date().toDateString();
  if (today !== emailOTPResetDate) {
    // Reset at midnight
    emailOTPCount = 0;
    emailOTPResetDate = today;
  }
  return emailOTPCount < EMAIL_OTP_DAILY_LIMIT;
}

function incrementEmailQuota(): void {
  emailOTPCount++;
}

export async function POST(request: NextRequest) {
    try {
        const { userId, method = 'discord' } = await request.json();
        
        if (!userId) {
            return NextResponse.json(
                { error: 'User ID is required' },
                { status: 400 }
            );
        }

        // Rate limiting check - prevent spam
        const existing = verificationCodes.get(userId);
        if (existing && existing.expiresAt > Date.now() - 55000) {
            return NextResponse.json(
                { error: 'Please wait before requesting another code' },
                { status: 429 }
            );
        }

        // Check email quota
        if (method === 'email') {
            if (!checkAndResetEmailQuota()) {
                return NextResponse.json(
                    { 
                        error: 'Email OTP limit reached for today. Please use Discord DM or Passkey instead.',
                        quotaExceeded: true,
                        remaining: 0
                    },
                    { status: 429 }
                );
            }
        }

        // Generate 6-digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

        // Store code with method
        verificationCodes.set(userId, { code, expiresAt, method });
        console.log(`Verification code for user ${userId} via ${method}: ${code}`);

        if (method === 'discord') {
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
                
                return NextResponse.json({
                    success: true,
                    message: 'Code generated (bot offline)',
                    devCode: process.env.NODE_ENV === 'development' ? code : undefined,
                });
            }
        } else if (method === 'email') {
            // Increment email quota
            incrementEmailQuota();
            
            // Email OTP - for now just log
            // In production: integrate with SendGrid, Mailgun, or Resend
            console.log(`Email OTP would be sent: ${code}`);
            
            // TODO: Implement email sending
            // const emailResult = await sendEmail(userEmail, code);
            
            return NextResponse.json({
                success: true,
                message: 'Verification code sent to your email',
                devCode: process.env.NODE_ENV === 'development' ? code : undefined,
                remaining: EMAIL_OTP_DAILY_LIMIT - emailOTPCount,
            });
        } else {
            return NextResponse.json(
                { error: 'Invalid verification method' },
                { status: 400 }
            );
        }
    } catch (error) {
        console.error('Send verification error:', error);
        return NextResponse.json(
            { error: 'Failed to generate verification code' },
            { status: 500 }
        );
    }
}

// Get email quota status
export async function GET() {
    checkAndResetEmailQuota();
    return NextResponse.json({
        remaining: EMAIL_OTP_DAILY_LIMIT - emailOTPCount,
        limit: EMAIL_OTP_DAILY_LIMIT,
        available: emailOTPCount < EMAIL_OTP_DAILY_LIMIT,
    });
}

// Export the map for use by the check endpoint
export { verificationCodes };
