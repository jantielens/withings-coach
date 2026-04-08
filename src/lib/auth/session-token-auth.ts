import { AuthProvider } from '@/lib/types/auth';

const WITHINGS_TOKEN_URL = 'https://wbsapi.withings.net/v2/oauth2';

// Buffer: refresh 60 seconds before actual expiry
const EXPIRY_BUFFER_SECONDS = 60;

interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: number; // epoch seconds
}

interface TokenSaveCallback {
  (tokens: { accessToken: string; refreshToken: string; tokenExpiresAt: number }): Promise<void>;
}

export class WithingsTokenRefreshError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WithingsTokenRefreshError';
  }
}

export class SessionTokenAuth implements AuthProvider {
  private tokens: SessionTokens;
  private readonly onTokensRefreshed: TokenSaveCallback;

  constructor(tokens: SessionTokens, onTokensRefreshed: TokenSaveCallback) {
    this.tokens = tokens;
    this.onTokensRefreshed = onTokensRefreshed;
  }

  async getAccessToken(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    if (now >= this.tokens.tokenExpiresAt - EXPIRY_BUFFER_SECONDS) {
      await this.refreshAccessToken();
    }
    return this.tokens.accessToken;
  }

  private async refreshAccessToken(): Promise<void> {
    const clientId = process.env.WITHINGS_CLIENT_ID;
    const clientSecret = process.env.WITHINGS_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new WithingsTokenRefreshError(
        'Cannot refresh token: WITHINGS_CLIENT_ID or WITHINGS_CLIENT_SECRET not configured.'
      );
    }

    const body = new URLSearchParams({
      action: 'requesttoken',
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: this.tokens.refreshToken,
    });

    const response = await fetch(WITHINGS_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    const result = await response.json();

    if (result.status !== 0) {
      console.error('[Auth] Token refresh failed:', result);
      throw new WithingsTokenRefreshError(
        'Withings token refresh failed. Please re-authorize.'
      );
    }

    const { access_token, refresh_token, expires_in } = result.body;

    this.tokens = {
      accessToken: access_token,
      refreshToken: refresh_token,
      tokenExpiresAt: Math.floor(Date.now() / 1000) + (expires_in ?? 10800),
    };

    // Persist refreshed tokens back to the session
    await this.onTokensRefreshed(this.tokens);
  }
}
