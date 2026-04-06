import { AuthProvider } from '@/lib/types/auth';

export class StaticTokenAuth implements AuthProvider {
  async getAccessToken(): Promise<string> {
    const token = process.env.WITHINGS_ACCESS_TOKEN;
    if (!token) {
      throw new Error(
        'WITHINGS_ACCESS_TOKEN environment variable is not set. ' +
        'Add it to .env.local to authenticate with the Withings API.'
      );
    }
    return token;
  }
}
