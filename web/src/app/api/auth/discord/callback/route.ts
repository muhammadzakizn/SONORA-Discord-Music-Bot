import { NextRequest, NextResponse } from 'next/server';

const BOT_API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:5000';

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
        const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || process.env.DISCORD_CLIENT_ID || '1448899538499928137';
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

        // Check if user exists in auth database (via Bot API)
        let authState: 'new' | 'existing' | 'mfa_required' | 'trusted' = 'new';
        let authUserId: number | null = null;
        let mfaMethods: string[] = [];

        try {
            console.log('Checking auth database for user:', userData.id);
            const authCheckResponse = await fetch(`${BOT_API_URL}/api/auth/user/check`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ discord_id: userData.id }),
            });

            if (authCheckResponse.ok) {
                const authData = await authCheckResponse.json();
                console.log('Auth check result:', authData);

                if (authData.exists && authData.user) {
                    authUserId = authData.user.id;
                    mfaMethods = authData.mfa_methods || [];

                    if (authData.user.mfa_enabled && mfaMethods.length > 0) {
                        // Check if current device is trusted
                        const deviceCheckResponse = await fetch(`${BOT_API_URL}/api/auth/trusted-devices/check`, {
                            method: 'POST',
                            headers: { 
                                'Content-Type': 'application/json',
                                'User-Agent': request.headers.get('user-agent') || 'Unknown',
                                'X-Forwarded-For': request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '',
                            },
                            body: JSON.stringify({ user_id: authUserId }),
                        });

                        if (deviceCheckResponse.ok) {
                            const deviceData = await deviceCheckResponse.json();
                            authState = deviceData.is_trusted ? 'trusted' : 'mfa_required';
                        } else {
                            authState = 'mfa_required';
                        }
                    } else {
                        // User exists but no MFA - treat as trusted
                        authState = 'trusted';
                    }
                } else {
                    // New user - register them
                    console.log('Registering new user...');
                    const registerResponse = await fetch(`${BOT_API_URL}/api/auth/user/register`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            discord_id: userData.id,
                            username: userData.username,
                            email: userData.email,
                            avatar_url: userData.avatar 
                                ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png`
                                : null,
                        }),
                    });

                    if (registerResponse.ok) {
                        const registerData = await registerResponse.json();
                        authUserId = registerData.user_id;
                        authState = 'new';
                        console.log('User registered with ID:', authUserId);
                    }
                }
            }
        } catch (authError) {
            console.warn('Auth database check failed (bot may be offline):', authError);
            // Continue without auth database - fallback to session-only auth
            authState = 'trusted'; // Skip MFA if bot is offline
        }

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
            // Auth state for login page
            authState: authState,
            authUserId: authUserId,
            mfaMethods: mfaMethods,
        };

        // Create response - redirect based on auth state
        const isSecure = appUrl.startsWith('https://');
        const encodedSession = Buffer.from(JSON.stringify(sessionData)).toString('base64');
        
        // Determine redirect path based on auth state
        let redirectPath: string;
        if (authState === 'trusted') {
            // Trusted device or no MFA - go directly to admin
            redirectPath = '/admin';
        } else if (authState === 'new') {
            // New user - go to login for MFA setup
            redirectPath = `/login?verify=true&session=${encodeURIComponent(encodedSession)}&flow=setup`;
        } else {
            // Existing user with MFA - go to login for verification
            redirectPath = `/login?verify=true&session=${encodeURIComponent(encodedSession)}&flow=verify`;
        }
        
        const response = NextResponse.redirect(new URL(redirectPath, appUrl));
        
        // Set session cookie
        response.cookies.set('sonora-admin-session', encodedSession, {
            httpOnly: false, // Allow client-side access for session display
            secure: isSecure,
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: '/',
        });

        // Also set admin auth cookie
        const adminAuthData = {
            role: 'admin',
            timestamp: Date.now(),
            discordUser: {
                id: userData.id,
                username: userData.username,
                avatar: userData.avatar,
            },
            authState: authState,
            authUserId: authUserId,
        };
        response.cookies.set('sonora-admin-auth', Buffer.from(JSON.stringify(adminAuthData)).toString('base64'), {
            httpOnly: false,
            secure: isSecure,
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: '/',
        });

        console.log(`Auth state: ${authState}, redirecting to ${redirectPath.substring(0, 50)}...`);
        return response;

    } catch (err) {
        console.error('Discord OAuth callback error:', err);
        return NextResponse.redirect(new URL('/login?error=server_error', request.url));
    }
}

