# A11yease — cPanel deployment

This package serves the built website and its Node.js backend. Live website keys
currently work without payment. No Razorpay credentials are required.

## Hosting requirements

- Node.js 22 or 24 with Passenger / Setup Node.js App.
- HTTPS at the root of a domain or subdomain, e.g. https://app.example.com/.
- One application worker only. JSON storage and sessions are process-local.
  The data lock rejects simultaneous writers. Ask the host to set Passenger's
  maximum instances for this app to 1; stop the old instance before restarting.
- A private, writable directory for persistent platform data; include it in backups.

## Install

1. Extract this ZIP to /home/CPANEL_USER/accessease, outside public_html.
   Do not point a plain static document root at this directory or at dist/.
2. Upload your existing .local/admin-auth.json separately to the app's .local/
   directory. It is deliberately excluded from the ZIP. Keep it private (600).
   Alternatively run server/configure-admin.mjs with a JSON object containing
   username and password supplied through standard input from a private tool.
   Never put the password in a public file, shell history or frontend source.
3. If migrating existing accounts and website keys, stop the local backend and
   privately copy .local/platform/platform.json to the configured data directory.
   Do not copy .platform.lock. For a fresh installation, leave the directory empty.
4. In Setup Node.js App: Production mode, root accessease, URL domain root /,
   Node 22/24, startup file app.js. In Application Manager, register that app path.
   Use THIS package.json (no type:module); the backend uses .mjs internally.
5. Add environment variables (replace CPANEL_USER and the example domain):

   NODE_ENV=production
   COOKIE_SECURE=true
   PUBLIC_ORIGIN=https://app.example.com
   ADMIN_CREDENTIAL_FILE=/home/CPANEL_USER/accessease/.local/admin-auth.json
   PLATFORM_DATA_DIR=/home/CPANEL_USER/accessease-data

   Let Passenger manage the port. A standalone Node host may supply PORT and
   BIND_HOST. No npm dependencies or server-side build are needed for this ZIP.
6. Start the application, then open https://app.example.com/health: expect
   {"ok":true}. Open /login and sign in. Check logs if startup fails.

## Verify after upload

- HTTPS works and /admin redirects signed-out visitors to /login.
- Only the configured administrator can sign in. The login page has no account
  registration form, and `/api/auth/register` returns 404. Former client accounts
  cannot sign in. Removing their stored credentials requires an explicitly
  authorized `REMOVE_CLIENT_ACCOUNTS=true` startup; websites, keys and payment
  records are retained. Leave this flag unset to preserve the live database.
- Register the exact live client HTTPS origin, including www if used.
- Generate a Live key without payment and copy the snippet. Its script URL must
  use your public HTTPS domain, never localhost.
- Install it on that client page. Verify widget loading and settings behavior.
  The client's CSP must allow this host's scripts, requests, images and fonts,
  plus the widget's injected styles. Third-party frames remain outside its reach.
- Revoke the key; a new client page load must no longer load through embed.js.
- Stop/start the app: accounts, sites and keys persist. Sign-in is required again.

Sessions expire after 8 hours and on backend restart. If login
starts returning 429 behind Passenger, ask your host about the actual client IP
exposed to Node; the app deliberately does not trust arbitrary forwarded headers.

Back up PLATFORM_DATA_DIR and the admin credential file privately. On updates,
replace dist/ and server/, preserving data and credentials. Stop/start the app.
Do not delete a lock for a running process. Crash-stale locks are recovered on
the same host when the previous PID no longer exists.

## Scope and limits

This is a testing release with payment-free keys. Billing integration is retained
but not configured or payment-tested. Public widget assets can be downloaded;
origin checks are not DRM. Browser speech/microphone, video captions, third-party
CSP and actual hosting configuration need testing on the deployed domain.

Guidance: https://docs.cpanel.net/cpanel/software/application-manager/
