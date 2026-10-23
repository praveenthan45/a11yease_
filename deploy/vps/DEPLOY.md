# VPS migration from Render (same widget and backend)

This deployment runs the existing `Dockerfile`, Node server and committed `dist/`
assets. It does not modify settings, registered website origins or widget behavior.
One backend instance owns the persistent JSON store. Do not scale it to multiple workers.

## 1. Requirements

Use a Linux VPS with Docker Engine and Docker Compose v2 installed. The dedicated
hostname must resolve to this VPS (A and any AAAA records). Incoming TCP ports 80
and 443 must reach this stack. Do not run this proxy on ports already occupied by
another website's Nginx/Apache/Caddy. In that case ask the host administrator to
route the dedicated hostname to this backend through the existing HTTPS proxy.

Do not delete Render yet. First record its currently deployed Git commit and verify
that the fixes you expect are included in this repository's `main` history.

## 2. Clone the new repository

```sh
git clone https://github.com/praveenthan45/a11yease_.git accessease
cd accessease
git switch main
cp deploy/vps/.env.example deploy/vps/.env
```

Edit `deploy/vps/.env`: set `ACCESSEASE_DOMAIN` to the real hostname without a
scheme/path. Set the two private absolute paths. `PUBLIC_ORIGIN` is constructed as
`https://` plus this hostname; secure cookies are enabled. Do not paste actual
credentials into Git-tracked examples.

## 3. Migrate Render data privately

The source code does not contain live accounts, websites, key hashes or admin
credentials. Back these up from Render before deleting its service:

- `PLATFORM_DATA_DIR/platform.json` (usually `/app/data/platform.json`).
- The existing admin credential file (`ADMIN_CREDENTIAL_FILE`; Render commonly
  uses `/etc/secrets/admin_auth`).
- Existing payment/webhook environment values if used.

Create `/srv/accessease-private/data` on the VPS. Transfer the existing
`platform.json` into it and the credential file to
`/srv/accessease-private/admin-auth.json` using a private transfer channel.
Do not print their contents in support tickets or commit them. Copy a consistent
snapshot: pause admin registrations/key changes/payments during the final copy.
The old widget may continue validating existing keys while migrating; stop
creating new data in the old dashboard after the copy. Do not copy the instance
lock file; let the new server create its own lock.

The container runs as UID/GID 1000. On the VPS, grant that identity ownership:

```sh
sudo chown -R 1000:1000 /srv/accessease-private
sudo chmod 700 /srv/accessease-private /srv/accessease-private/data
sudo chmod 600 /srv/accessease-private/admin-auth.json /srv/accessease-private/data/platform.json
```

Only apply these commands to the named private migration directory. If using
other paths, adjust them intentionally. Existing keys continue to validate when
their original database entries and registered client origins are preserved.
Data already lost on Render cannot be reconstructed from GitHub. If starting
fresh, configure an admin using the README credential setup and re-register
websites/keys; copying source alone does not migrate data.

## 4. Build and start on the VPS

From the repository root:

```sh
docker compose --env-file deploy/vps/.env -f deploy/vps/compose.yaml config --quiet
docker compose --env-file deploy/vps/.env -f deploy/vps/compose.yaml up -d --build
docker compose --env-file deploy/vps/.env -f deploy/vps/compose.yaml ps
```

Caddy obtains HTTPS certificates for the configured public hostname. The Node
port is internal to the Compose network. Open `https://YOUR_HOSTNAME/health`:
expect `{"ok":true}`. Then open `/login`, sign in with the existing admin and
check the dashboard, websites and keys. HTTPS and microphone permissions are
needed for the voice features just as they were on Render.

## 5. Switch the installed embed URLs

On every client website, change only the script server URL to the new HTTPS
hostname. Keep its existing publishable key if the database was migrated:

```html
<script src="https://YOUR_HOSTNAME/embed.js" data-key="EXISTING_WEBSITE_KEY" defer></script>
```

Do not load both Render and VPS snippets together. Snippets generated from the
new dashboard automatically use its origin. If the client has a Content Security
Policy allowlist, add the new hostname wherever the old Render origin was
allowed. Update payment webhooks to `/api/razorpay/webhook` on the new hostname
when payments are in use. Customer website origins remain unchanged.

## 6. Verify before removing Render

- Test admin login, embedded widget and the already-fixed settings on each site.
- Verify there are no script/CORS errors and all requests use the new hostname.
- Restart the backend and confirm websites/key records remain:
  `docker compose --env-file deploy/vps/.env -f deploy/vps/compose.yaml restart web`.
  Admin sessions are in memory, so sign in again after a restart.
- Back up the private data and credential file outside the VPS. Keep a consistent
  database snapshot by stopping `web` briefly during backup, then starting it.
- Keep Render available until all embeds/webhooks have switched and testing passes.
  Only then retire the old service. Never delete its last data copy first.

## Updates

The checked-in `dist` contains the release assets, so a VPS update only needs:

```sh
git pull --ff-only origin main
docker compose --env-file deploy/vps/.env -f deploy/vps/compose.yaml up -d --build
```

For source changes, run `npm ci` and `npm run build` before committing the
updated `dist/team-features.js`. `dist/widget.js` is maintained directly and is not
rebuilt by Vite. Do not overwrite the private paths with an empty data directory
on updates, run multiple backends against the same file, or remove Caddy's
certificate volumes. Platform data is stored at `PLATFORM_DATA_PATH` outside Git.

References:
- https://caddyserver.com/docs/automatic-https
- https://caddyserver.com/docs/caddyfile/directives/reverse_proxy
- https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/
