import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';

const WITHINGS_TOKEN_URL = 'https://wbsapi.withings.net/v2/oauth2';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';

  if (error) {
    return NextResponse.redirect(`${baseUrl}/login?error=${encodeURIComponent(error)}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${baseUrl}/login?error=missing_code`);
  }

  // Validate CSRF state
  const session = await getSession();
  if (session.oauthState !== state) {
    return NextResponse.redirect(`${baseUrl}/login?error=state_mismatch`);
  }

  // Clear the one-time state
  session.oauthState = undefined;

  const clientId = process.env.WITHINGS_CLIENT_ID;
  const clientSecret = process.env.WITHINGS_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${baseUrl}/login?error=missing_config`);
  }

  const redirectUri = `${baseUrl}/api/auth/withings/callback`;

  // Exchange authorization code for tokens
  const body = new URLSearchParams({
    action: 'requesttoken',
    grant_type: 'authorization_code',
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
  });

  try {
    const response = await fetch(WITHINGS_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    const result = await response.json();

    if (result.status !== 0) {
      console.error('[Auth] Withings token exchange failed:', result);
      return NextResponse.redirect(`${baseUrl}/login?error=token_exchange_failed`);
    }

    const { access_token, refresh_token, expires_in, userid } = result.body;

    // Save tokens to session
    session.accessToken = access_token;
    session.refreshToken = refresh_token;
    session.tokenExpiresAt = Math.floor(Date.now() / 1000) + (expires_in ?? 10800);
    session.withingsUserId = String(userid);
    session.isLoggedIn = true;
    await session.save();

    return NextResponse.redirect(`${baseUrl}/`);
  } catch (err) {
    console.error('[Auth] Token exchange error:', err);
    return NextResponse.redirect(`${baseUrl}/login?error=token_exchange_error`);
  }
}
