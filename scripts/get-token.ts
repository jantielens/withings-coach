import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createInterface } from "node:readline";

// ──────────────────────────────────────────────────────────────────────────────
// DEV/DEBUG TOOL ONLY
// The app now handles OAuth in the browser via /api/auth/withings.
// This script is for local development when using AUTH_MODE=static.
// ──────────────────────────────────────────────────────────────────────────────

const ENV_FILE = resolve(process.cwd(), ".env.local");
const CALLBACK_PATH = "/api/auth/callback";
const PORT = 3000;
const REDIRECT_URI = `http://localhost:${PORT}${CALLBACK_PATH}`;
const STATE = "withings-coach";

// ─── Helpers ────────────────────────────────────────────────────────────────

function log(emoji: string, msg: string) {
  console.log(`${emoji}  ${msg}`);
}

function readEnvFile(): Record<string, string> {
  if (!existsSync(ENV_FILE)) return {};
  const content = readFileSync(ENV_FILE, "utf-8");
  const env: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    env[key] = value;
  }
  return env;
}

function writeEnvValue(key: string, value: string) {
  let content = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, "utf-8") : "";
  const regex = new RegExp(`^${key}=.*$`, "m");
  if (regex.test(content)) {
    content = content.replace(regex, `${key}=${value}`);
  } else {
    content = content.trimEnd() + `\n${key}=${value}\n`;
  }
  writeFileSync(ENV_FILE, content);
}

async function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function openBrowser(url: string) {
  const { exec } = await import("node:child_process");
  const platform = process.platform;
  const cmd =
    platform === "darwin" ? "open" : platform === "win32" ? "start" : "xdg-open";
  exec(`${cmd} "${url}"`);
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  🔑  Withings OAuth2 Token Helper");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Step 1: Get client credentials
  const env = readEnvFile();

  let clientId = env.WITHINGS_CLIENT_ID;
  let clientSecret = env.WITHINGS_CLIENT_SECRET;

  if (!clientId || clientId === "your_client_id_here") {
    clientId = await prompt("Enter your Withings Client ID: ");
    if (!clientId) {
      log("❌", "Client ID is required. Get it from https://developer.withings.com");
      process.exit(1);
    }
    writeEnvValue("WITHINGS_CLIENT_ID", clientId);
    log("💾", "Saved WITHINGS_CLIENT_ID to .env.local");
  } else {
    log("✅", "Found WITHINGS_CLIENT_ID in .env.local");
  }

  if (!clientSecret || clientSecret === "your_client_secret_here") {
    clientSecret = await prompt("Enter your Withings Client Secret: ");
    if (!clientSecret) {
      log("❌", "Client Secret is required. Get it from https://developer.withings.com");
      process.exit(1);
    }
    writeEnvValue("WITHINGS_CLIENT_SECRET", clientSecret);
    log("💾", "Saved WITHINGS_CLIENT_SECRET to .env.local");
  } else {
    log("✅", "Found WITHINGS_CLIENT_SECRET in .env.local");
  }

  // Step 2: Start local callback server
  log("🌐", `Starting callback server on http://localhost:${PORT}${CALLBACK_PATH}`);

  const { code, server } = await waitForCallback(clientId);

  // Step 3: Exchange code for tokens
  log("🔄", "Exchanging authorization code for tokens...");

  const body = new URLSearchParams({
    action: "requesttoken",
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: REDIRECT_URI,
  });

  const response = await fetch("https://wbsapi.withings.net/v2/oauth2", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const result = await response.json();

  if (result.status !== 0) {
    log("❌", `Withings API error (status ${result.status}): ${result.error ?? "Unknown error"}`);
    log("💡", "Common issues: expired code, wrong client_id/secret, or redirect_uri mismatch");
    server.close();
    process.exit(1);
  }

  const { access_token, refresh_token } = result.body;

  // Step 4: Save tokens to .env.local
  writeEnvValue("WITHINGS_ACCESS_TOKEN", access_token);
  log("💾", "Saved WITHINGS_ACCESS_TOKEN to .env.local");

  writeEnvValue("WITHINGS_REFRESH_TOKEN", refresh_token);
  log("💾", "Saved WITHINGS_REFRESH_TOKEN to .env.local");

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  log("🎉", "All done! Your Withings tokens are saved in .env.local");
  log("🚀", "You can now run `npm run dev` to start the app");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  server.close();
  process.exit(0);
}

function waitForCallback(clientId: string): Promise<{ code: string; server: ReturnType<typeof createServer> }> {
  return new Promise((resolvePromise, rejectPromise) => {
    const server = createServer((req: IncomingMessage, res: ServerResponse) => {
      const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);

      if (url.pathname !== CALLBACK_PATH) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Not found");
        return;
      }

      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");

      if (state !== STATE) {
        res.writeHead(400, { "Content-Type": "text/html" });
        res.end("<h1>❌ State mismatch — possible CSRF attack. Please try again.</h1>");
        rejectPromise(new Error("State mismatch"));
        return;
      }

      if (!code) {
        const error = url.searchParams.get("error") ?? "unknown";
        res.writeHead(400, { "Content-Type": "text/html" });
        res.end(`<h1>❌ Authorization failed: ${error}</h1>`);
        rejectPromise(new Error(`Authorization failed: ${error}`));
        return;
      }

      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(`
        <html>
          <body style="font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;">
            <div style="text-align: center;">
              <h1>✅ Authorization successful!</h1>
              <p>You can close this tab and return to your terminal.</p>
            </div>
          </body>
        </html>
      `);

      log("✅", "Received authorization code");
      resolvePromise({ code, server });
    });

    server.listen(PORT, () => {
      const authorizeUrl =
        `https://account.withings.com/oauth2_user/authorize2` +
        `?response_type=code` +
        `&client_id=${encodeURIComponent(clientId)}` +
        `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
        `&scope=user.metrics` +
        `&state=${STATE}`;

      log("🌍", "Opening browser for Withings authorization...");
      console.log(`\n   If the browser doesn't open, visit this URL manually:\n`);
      console.log(`   ${authorizeUrl}\n`);

      openBrowser(authorizeUrl);
      log("⏳", "Waiting for you to authorize in the browser...");
    });
  });
}

main().catch((err) => {
  console.error("\n❌ Unexpected error:", err.message);
  process.exit(1);
});
