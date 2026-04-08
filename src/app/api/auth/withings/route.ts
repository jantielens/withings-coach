import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { getSession } from '@/lib/auth/session';

const WITHINGS_AUTHORIZE_URL = 'https://account.withings.com/oauth2_user/authorize2';

export async function GET() {
  const clientId = process.env.WITHINGS_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: 'WITHINGS_CLIENT_ID is not configured.' },
      { status: 500 }
    );
  }

  // Generate cryptographic state for CSRF protection
  const state = randomBytes(16).toString('hex');

  // Store state in session so we can validate it in the callback
  const session = await getSession();
  session.oauthState = state;
  await session.save();

  const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'}/api/auth/withings/callback`;

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'user.metrics',
    state,
  });

  return NextResponse.redirect(`${WITHINGS_AUTHORIZE_URL}?${params.toString()}`);
}
