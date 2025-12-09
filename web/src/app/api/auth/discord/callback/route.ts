import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    console.log('Discord OAuth callback received');
    console.log('Code:', code ? 'present' : 'missing');
    console.log('Error:', error || 'none');

    // Handle OAuth errors
    if (error) {
        console.error('Discord OAuth error:', error);
        return NextResponse.redirect(new URL('/login?error=oauth_denied', request.url));
    }

    // Validate code
    if (!code) {
        return NextResponse.redirect(new URL('/login?error=no_code', request.url));
    }

    try {
        // Exchange code for access token
        const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || '1443855259536461928';
        const clientSecret = process.env.DISCORD_CLIENT_SECRET;
        
        // Use NEXT_PUBLIC_APP_URL for the redirect URI (for server deployment with public domain)
        // Fallback to request.url.origin for local development
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
        const redirectUri = `${appUrl}/api/auth/discord/callback`;

        console.log('Client ID:', clientId);
        console.log('Client Secret:', clientSecret ? 'configured' : 'MISSING');
        console.log('App URL:', appUrl);
        console.log('Redirect URI:', redirectUri);

        if (!clientSecret) {
            console.error('DISCORD_CLIENT_SECRET not configured');
            return NextResponse.redirect(new URL('/login?error=server_config', request.url));
        }

        console.log('Exchanging code for token...');
        const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: redirectUri,
            }),
        });

        if (!tokenResponse.ok) {
            const errorData = await tokenResponse.text();
            console.error('Token exchange failed:', tokenResponse.status, errorData);
            return NextResponse.redirect(new URL('/login?error=token_exchange', request.url));
        }

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;
        console.log('Token received successfully');

        // Fetch user info from Discord
        console.log('Fetching user info...');
        const userResponse = await fetch('https://discord.com/api/users/@me', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        if (!userResponse.ok) {
            console.error('User fetch failed:', userResponse.status);
            return NextResponse.redirect(new URL('/login?error=user_fetch', request.url));
        }

        const userData = await userResponse.json();
        console.log('User:', userData.username);

        // Fetch user's guilds
        console.log('Fetching guilds...');
        const guildsResponse = await fetch('https://discord.com/api/users/@me/guilds', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        const guildsData = guildsResponse.ok ? await guildsResponse.json() : [];
        console.log('Guilds count:', guildsData.length);

        // Create session data
        const sessionData = {
            user: {
                id: userData.id,
                username: userData.username,
                discriminator: userData.discriminator,
                avatar: userData.avatar,
                email: userData.email,
            },
            guilds: guildsData.filter((guild: { permissions: number }) => 
                // Filter guilds where user has MANAGE_GUILD permission (0x20)
                (guild.permissions & 0x20) === 0x20
            ),
            accessToken: accessToken,
            timestamp: Date.now(),
        };

        // Create response - redirect based on environment
        // For server deployment: use verification flow
        // For Vercel (cloud): skip verification (no access to local bot)
        const isVercelDeployment = process.env.VERCEL === '1';
        const redirectUrl = isVercelDeployment ? '/admin' : '/login?verify=true';
        const response = NextResponse.redirect(new URL(redirectUrl, request.url));

        // Set session cookie (readable by client-side for session context)
        const encodedSession = Buffer.from(JSON.stringify(sessionData)).toString('base64');
        response.cookies.set('sonora-admin-session', encodedSession, {
            httpOnly: false, // Allow client-side access for session display
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: '/',
        });

        // Also set admin auth in localStorage-compatible cookie for auth.ts
        const adminAuthData = {
            role: 'admin',
            timestamp: Date.now(),
            discordUser: {
                id: userData.id,
                username: userData.username,
                avatar: userData.avatar,
            }
        };
        response.cookies.set('sonora-admin-auth', Buffer.from(JSON.stringify(adminAuthData)).toString('base64'), {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: '/',
        });

        console.log(`Session created, redirecting to ${redirectUrl}`);
        return response;

    } catch (err) {
        console.error('Discord OAuth callback error:', err);
        return NextResponse.redirect(new URL('/login?error=server_error', request.url));
    }
}
