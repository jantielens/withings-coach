import { getIronSession, type IronSession, type SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';

export interface SessionData {
  withingsUserId: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: number; // epoch seconds
  isLoggedIn: boolean;
  // CSRF state for OAuth flow
  oauthState?: string;
}

export const sessionOptions: SessionOptions = {
  password: process.env.IRON_SESSION_PASSWORD ?? '',
  cookieName: 'withings-coach-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax' as const,
  },
};

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}
