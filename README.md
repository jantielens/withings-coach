This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### 1. Configure Withings API Credentials

Create a Withings developer account at [developer.withings.com](https://developer.withings.com) and register an application. Set the callback URL to:

```
http://localhost:3000/api/auth/withings/callback
```

### 2. Set Up Environment Variables

Copy the required environment variables into `.env.local`:

```bash
# Withings OAuth credentials (from developer.withings.com)
WITHINGS_CLIENT_ID=your_client_id
WITHINGS_CLIENT_SECRET=your_client_secret

# iron-session encryption key (generate with: openssl rand -base64 32)
IRON_SESSION_PASSWORD=your_32_char_or_longer_secret

# Azure OpenAI (for chat feature)
AZURE_OPENAI_RESOURCE_NAME=your_resource_name
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o

# Auth mode: 'session' (default, uses OAuth) or 'static' (dev fallback using env token)
# AUTH_MODE=static
# WITHINGS_ACCESS_TOKEN=your_token  # only needed if AUTH_MODE=static
```

### 3. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to the login page where you can connect your Withings account via OAuth.

## Authentication

The app uses **Withings OAuth 2.0** with **iron-session** for encrypted cookie sessions:

1. User clicks "Connect with Withings" on `/login`
2. Redirected to Withings authorization page
3. After approval, Withings redirects back to `/api/auth/withings/callback`
4. The callback exchanges the auth code for access + refresh tokens
5. Tokens are stored in an encrypted, HttpOnly session cookie
6. Tokens auto-refresh when expired (server-side)

### Dev Mode (Static Token)

For development without the browser OAuth flow, set `AUTH_MODE=static` in `.env.local` and provide a `WITHINGS_ACCESS_TOKEN`. You can obtain one using:

```bash
npm run get-token
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
