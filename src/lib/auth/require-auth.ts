import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { SessionTokenAuth, WithingsTokenRefreshError } from '@/lib/auth/session-token-auth';
import { StaticTokenAuth } from '@/lib/auth/static-token-auth';
import type { AuthProvider } from '@/lib/types/auth';

export interface AuthResult {
  auth: AuthProvider;
  userId: string;
}

/**
 * Checks authentication and returns an AuthProvider + userId.
 *
 * - In `AUTH_MODE=static` mode, uses StaticTokenAuth with userId 'default' (dev fallback).
 * - Otherwise, reads the iron-session and creates a SessionTokenAuth with auto-refresh.
 *
 * Returns null if authenticated, or a NextResponse (401) if not.
 */
export async function requireAuth(): Promise<
  { result: AuthResult; error: null } | { result: null; error: NextResponse }
> {
  // Dev fallback: static token mode
  if (process.env.AUTH_MODE === 'static') {
    return {
      result: {
        auth: new StaticTokenAuth(),
        userId: 'default',
      },
      error: null,
    };
  }

  const session = await getSession();

  if (!session.isLoggedIn || !session.accessToken) {
    return {
      result: null,
      error: NextResponse.json(
        { error: 'Not authenticated. Please log in with Withings.' },
        { status: 401 }
      ),
    };
  }

  const auth = new SessionTokenAuth(
    {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      tokenExpiresAt: session.tokenExpiresAt,
    },
    async (tokens) => {
      // Persist refreshed tokens back to the session cookie
      session.accessToken = tokens.accessToken;
      session.refreshToken = tokens.refreshToken;
      session.tokenExpiresAt = tokens.tokenExpiresAt;
      await session.save();
    }
  );

  return {
    result: {
      auth,
      userId: session.withingsUserId,
    },
    error: null,
  };
}

/**
 * Re-export for catch blocks that need to detect refresh failures.
 */
export { WithingsTokenRefreshError };
