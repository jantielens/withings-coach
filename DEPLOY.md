# Deploying Withings Coach to Proxmox

This guide walks you through deploying Withings Coach on a Proxmox LXC container, step by step.

## Overview

```
Proxmox LXC (Debian/Ubuntu)
  ├─ Node.js 20 + pm2
  ├─ Withings Coach (Next.js on port 3000)
  ├─ SQLite database (local filesystem)
  ├─ Service Principal → Azure AI Foundry
  └─ (optional) Reverse proxy for HTTPS
```

**Azure resources needed:** Only Azure AI Foundry (pre-existing). No App Service, no database, no storage accounts.

---

## Step 1: Create the LXC Container

In the Proxmox web UI:

1. Click **Create CT** (top right)
2. Choose a **Debian 12** or **Ubuntu 24.04** template
3. Recommended specs:
   - **CPU:** 2 cores
   - **RAM:** 1024 MB (1 GB)
   - **Disk:** 8 GB
4. Enable **Start at boot** under Options
5. Start the container

> 💡 **Tip:** If your Proxmox host uses ZFS, the LXC filesystem is automatically snapshotted — free backups of your diary database.

---

## Step 2: Run the Install Script

SSH into the LXC container and run:

```bash
apt-get update && apt-get install -y curl && bash -c "$(curl -fsSL https://raw.githubusercontent.com/jantielens/withings-coach/main/scripts/install.sh)"
```

> ⚠️ If the repo is private, you'll need to authenticate. Clone manually instead:

```bash
git clone https://github.com/jantielens/withings-coach.git /opt/withings-coach
cd /opt/withings-coach
bash scripts/install.sh
```

The script installs Node.js 20, pm2, clones the repo, builds the app, and generates a `.env` template.

---

## Step 3: Create an Azure Service Principal

The app uses Azure AI Foundry for the chat feature. Since we're not running on Azure, we authenticate with a service principal.

### 3a. Create the App Registration

1. Go to [Azure Portal → Entra ID → App registrations](https://portal.azure.com/#view/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/~/RegisteredApps)
2. Click **New registration**
3. Name: `withings-coach`
4. Supported account types: **Single tenant**
5. Click **Register**
6. Note the **Application (client) ID** and **Directory (tenant) ID** from the overview page

### 3b. Create a Client Secret

1. In the app registration, go to **Certificates & secrets**
2. Click **New client secret**
3. Description: `withings-coach-prod`
4. Expiry: 24 months (set a calendar reminder to rotate)
5. Click **Add**
6. **Copy the secret value immediately** — it won't be shown again

### 3c. Grant Access to AI Foundry

1. Go to your **Azure AI Foundry** resource in the Azure Portal
2. Go to **Access control (IAM)**
3. Click **Add → Add role assignment**
4. Role: **Cognitive Services OpenAI User**
5. Members: Select the `withings-coach` app registration
6. Click **Review + assign**

---

## Step 4: Configure Withings OAuth

1. Go to [Withings Developer Dashboard](https://developer.withings.com/dashboard/)
2. Select your application (or create one)
3. Under **OAuth 2.0 settings**, add a callback URL:
   - If using a domain: `https://your-domain.com/api/auth/withings/callback`
   - If using Tailscale: `https://your-machine.tailnet-name.ts.net:3000/api/auth/withings/callback`
   - For testing (HTTP): `http://<lxc-ip>:3000/api/auth/withings/callback`
4. Note your **Client ID** and **Client Secret**

> ⚠️ Withings requires HTTPS for production callback URLs. See Step 6 for TLS options.

---

## Step 5: Fill in the .env File

Edit the environment file:

```bash
nano /opt/withings-coach/.env
```

Fill in all values:

```bash
NODE_ENV=production

# ━━━ App URL (IMPORTANT — set this first) ━━━━━━━━━━━━━━━━━━━━━━━━━━
# The URL where you access the app. Must match the Withings callback URL.
# ⚠️ BUILD-TIME variable — you MUST run "npm run build" after changing this.
#
# Examples:
#   http://192.168.1.50:3000          (local network)
#   https://coach.example.com         (custom domain)
#   https://mybox.tail1234.ts.net     (Tailscale)
NEXT_PUBLIC_BASE_URL=http://<lxc-ip>:3000

# ━━━ Iron Session ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Generate with: openssl rand -base64 32
IRON_SESSION_PASSWORD=<paste-generated-value>

# ━━━ Withings OAuth (from Step 4) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WITHINGS_CLIENT_ID=<your-withings-client-id>
WITHINGS_CLIENT_SECRET=<your-withings-client-secret>

# ━━━ Azure AI Foundry ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AZURE_OPENAI_RESOURCE_NAME=<your-ai-foundry-resource-name>
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o

# ━━━ Azure Service Principal (from Step 3) ━━━━━━━━━━━━━━━━━━━━━━━━━
AZURE_CLIENT_ID=<application-client-id>
AZURE_CLIENT_SECRET=<client-secret-value>
AZURE_TENANT_ID=<directory-tenant-id>
```

Generate the iron-session password:

```bash
openssl rand -base64 32
```

After saving, **rebuild and restart** (needed because `NEXT_PUBLIC_BASE_URL` is a build-time variable):

```bash
cd /opt/withings-coach && npm run build && pm2 restart withings-coach
```

> 💡 For future `.env` changes that don't touch `NEXT_PUBLIC_BASE_URL`, a simple `pm2 restart withings-coach` is enough — no rebuild needed.

---

## Step 6: Set Up HTTPS (TLS)

Withings OAuth requires HTTPS for callback URLs. Choose one option:

### Option A: Cloudflare Tunnel (recommended — free, no ports opened)

Exposes your LXC to the internet via an outbound tunnel. No open ports, no public IP needed — just a domain on Cloudflare (free plan).

**Install cloudflared:**

```bash
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg \
  | gpg --dearmor -o /usr/share/keyrings/cloudflare.gpg
echo "deb [signed-by=/usr/share/keyrings/cloudflare.gpg] https://pkg.cloudflare.com/cloudflared $(lsb_release -cs) main" \
  > /etc/apt/sources.list.d/cloudflared.list
apt-get update && apt-get install -y cloudflared
```

**Authenticate and create tunnel:**

```bash
cloudflared tunnel login                    # opens a URL to authorize
cloudflared tunnel create withings-coach    # creates the tunnel
```

**Route your subdomain to the tunnel:**

```bash
cloudflared tunnel route dns withings-coach coach.yourdomain.com
```

**Create the config file** at `/etc/cloudflared/config.yml`:

```yaml
tunnel: withings-coach
credentials-file: /root/.cloudflared/<tunnel-id>.json

ingress:
  - hostname: coach.yourdomain.com
    service: http://localhost:3000
  - service: http_status:404
```

**Install as a system service (starts on boot):**

```bash
cloudflared service install
systemctl enable cloudflared
systemctl start cloudflared
```

**Update your .env and rebuild:**

```bash
# In /opt/withings-coach/.env, set:
NEXT_PUBLIC_BASE_URL=https://coach.yourdomain.com

cd /opt/withings-coach && npm run build && pm2 restart withings-coach
```

**Update Withings dashboard** callback URL to: `https://coach.yourdomain.com/api/auth/withings/callback`

### Option B: Tailscale Funnel (free, no domain needed, no ports opened)

Gives you a stable `https://<machine>.<tailnet>.ts.net` URL accessible from the internet. No domain required.

**⚠️ Proxmox LXC prerequisite:** Tailscale needs TUN device access. On the **Proxmox host** (not inside the LXC), run:

```bash
# Replace 100 with your LXC container ID
pct set 100 -features nesting=1
echo "lxc.cgroup2.devices.allow: c 10:200 rwm" >> /etc/pve/lxc/100.conf
echo "lxc.mount.entry: /dev/net/tun dev/net/tun none bind,create=file" >> /etc/pve/lxc/100.conf
pct restart 100
```

**Then inside the LXC:**

```bash
curl -fsSL https://tailscale.com/install.sh | sh
tailscale up
tailscale funnel 3000
```

This gives you a URL like `https://withings-coach.tailb857c.ts.net`.

**Update your .env and rebuild:**

```bash
# In /opt/withings-coach/.env, set (no trailing slash!):
NEXT_PUBLIC_BASE_URL=https://withings-coach.tailb857c.ts.net

cd /opt/withings-coach && npm run build && pm2 restart withings-coach
```

**Update Withings dashboard** callback URL to: `https://withings-coach.tailb857c.ts.net/api/auth/withings/callback`

### Option C: Caddy Reverse Proxy (requires open port 443 + a domain)

If you have a domain pointing to your home IP:

```bash
apt-get install -y caddy
```

Edit `/etc/caddy/Caddyfile`:

```
your-domain.com {
    reverse_proxy localhost:3000
}
```

```bash
systemctl restart caddy
```

Caddy automatically obtains and renews Let's Encrypt certificates.

### Option D: Nginx + Let's Encrypt (requires open port 80+443 + a domain)

```bash
apt-get install -y nginx certbot python3-certbot-nginx
```

Create `/etc/nginx/sites-available/withings-coach`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/withings-coach /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d your-domain.com
```

---

## Step 7: Verify the Deployment

1. **Check the app is running:**
   ```bash
   pm2 status
   curl -s http://localhost:3000 | head -5
   ```

2. **Open in browser:**
   - `http://<lxc-ip>:3000` (local network)
   - `https://your-domain.com` (if TLS is set up)

3. **Log in with Withings** — click the login button, authorize with your Withings account

4. **Test the chat** — open the chat panel, ask "how's my blood pressure this week?"

5. **Check logs if something's wrong:**
   ```bash
   pm2 logs withings-coach
   ```

---

## Updating

When you want to deploy the latest version:

```bash
cd /opt/withings-coach
./scripts/update.sh
```

This pulls the latest code, rebuilds, and restarts — takes about 30 seconds.

---

## Useful Commands

| Command | What it does |
|---------|-------------|
| `pm2 status` | Check if the app is running |
| `pm2 logs withings-coach` | View app logs |
| `pm2 restart withings-coach` | Restart the app |
| `pm2 stop withings-coach` | Stop the app |
| `cd /opt/withings-coach && ./scripts/update.sh` | Pull latest + rebuild + restart |

---

## Troubleshooting

### "Security check failed (state mismatch)"
The session cookie wasn't sent back during the OAuth callback. Common causes:
- **`NEXT_PUBLIC_BASE_URL` doesn't match** the URL in your browser — the cookie is set on one origin but the callback comes back on another. Ensure it matches exactly.
- **You changed `NEXT_PUBLIC_BASE_URL` but didn't rebuild** — this is a build-time variable baked into the JavaScript bundle. You **must** run `npm run build && pm2 restart withings-coach` after changing it (just restarting pm2 is not enough).
- **Trailing slash mismatch** — use `https://myhost.ts.net` not `https://myhost.ts.net/`.

### "Session expired" after login
The `IRON_SESSION_PASSWORD` may have changed, or cookies are stale. Clear browser cookies and try again.

### Chat returns "Authentication failed"
Check that `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, and `AZURE_TENANT_ID` are correct in `.env`, and that the service principal has the "Cognitive Services OpenAI User" role on your AI Foundry resource.

### Withings OAuth callback fails
- Ensure the callback URL in the Withings dashboard matches exactly (including `https://`)
- Ensure TLS is working (Withings rejects HTTP callbacks in production)
- Check `pm2 logs` for the specific error

### Tailscale won't start in LXC ("failed to connect to local tailscaled")
The LXC needs TUN device access. See the Proxmox host commands in [Step 6 Option B](#option-b-tailscale-funnel-free-no-domain-needed-no-ports-opened).

### Changed .env but nothing happened
- **`NEXT_PUBLIC_*` variables** are build-time — run `npm run build && pm2 restart withings-coach`
- **All other variables** are runtime — just `pm2 restart withings-coach`

### Build fails on update
```bash
cd /opt/withings-coach
rm -rf .next node_modules
npm ci
npm run build
pm2 restart withings-coach
```
