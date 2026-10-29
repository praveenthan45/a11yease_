> Current testing mode: live website keys can be generated and validated without
> payment. Registered origin, administrator authorization and revocation checks still apply.
> Payment expiry does not disable keys in this mode. The Razorpay documentation
> below describes the retained payment integration for later use.

# Website keys and billing

Admin dashboard: `/admin`. The existing playground and widget remain at `/`.
Login opens the dashboard. The same existing admin account manages all client
websites. This is an owner-managed portal, not a multi-tenant customer login system.

Public registration and client-account login are disabled. Database cleanup is
explicitly opt-in: `REMOVE_CLIENT_ACCOUNTS=true` permanently removes legacy client
account records from that instance after validating the administrator credential
file. Existing websites, keys and payment records are retained under the
administrator. Without this flag, stored account records are not deleted. A local
cleanup does not change the live database.

## Local setup

1. Configure the existing admin credentials as described in the project README.
2. Run the existing server or Docker launcher. Register a website using its exact
   origin. `www`, subdomains, schemes and ports are distinct origins.
3. For a free local integration check, register `http://localhost:1435` and generate
   a **test** website key. Serve a client page at that origin and insert the snippet.
   Test keys cannot be used on public domains.
4. A client page must permit this server in its CSP `script-src`, `connect-src`,
   `img-src`, `font-src`, and allow the widget's inline styles. Cross-origin video
   captions depend on the media host's own CORS configuration.

## Razorpay

Copy `.env.example` to `.env` and set the Razorpay key ID, key secret and webhook
secret. Docker Compose reads these values. For a direct Node launch, load the file
with `node --env-file=.env server/admin.mjs`. Never commit `.env`.

Set the INR price and access duration under **Billing & payments**. The requested
default price is ₹2,000; access defaults to 30 days and is editable. Access is a one-time payment for that duration; renewals are
manual. No subscription or automatic debit is configured.

Use Razorpay test credentials to exercise checkout. Test payments are recorded
as test payments and **never grant live access**. Live access requires a captured
payment from live credentials. Verification checks the HMAC signature and fetches
the payment from Razorpay to check order, amount, currency and captured status.
Use automatic capture in Razorpay. A checkout success message by itself cannot
grant access. Retry verification if the capture is delayed.

Configure a public HTTPS webhook at `/api/razorpay/webhook` for
`payment.captured` and `refund.processed`. Signature validation is required.
Captured live payments activate access idempotently even if the browser closes.
A processed refund removes that order's access duration; partial refunds also
remove the full duration. The current policy must be communicated to clients.
Paid orders and keys persist in the Docker `platform_data` volume, or
`.local/platform/platform.json` for direct Node launches. Back up this data.

## Website integration

Generate a live key after payment, then copy the one-time snippet. Keys are
random 256-bit values, stored only as SHA-256 hashes, and shown once. There is no
retrieval endpoint: generate a replacement and revoke the old key if lost.
The installed website key is a **publishable identifier**, not a private API
credential. It must never be used to authenticate admin operations.

The loader validates the browser Origin against the registered origin, checks
payment expiry and revocation, and then loads the existing widget. Revocation and
expiry take effect on the next page load. Origin checks enforce normal browser
embedding; they are not DRM against someone downloading the public frontend.

Before a live client installation, deploy the server on a public HTTPS address
and enable secure cookies using `COOKIE_SECURE=true`. Open the dashboard from
that address to generate HTTPS embed snippets. Localhost snippets cannot serve
remote visitors. Restrict server access, back up the volume and configure the
webhook before charging clients. No real payment has been made by the agent.

Reference: https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/
