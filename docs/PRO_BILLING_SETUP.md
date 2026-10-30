# Kharchee Pro billing setup

The application code now supports Razorpay recurring subscriptions with server-side verification. **Payments stay disabled until the secrets and plan IDs below are configured.** Do not paste real credentials into source code, chat, or any `VITE_*` variable.

## 1. Firebase server credentials

1. Use the same Firebase project as the web app.
2. Enable Firestore Database in that project.
3. Create a server service account with the minimum permissions needed for Firebase Authentication token verification and Firestore access.
4. In the deployment provider's private environment settings, set `FIREBASE_SERVICE_ACCOUNT_JSON` to the service-account JSON as a single-line secret. Alternatively, configure `GOOGLE_APPLICATION_CREDENTIALS` to point to the service-account file and set `FIREBASE_PROJECT_ID`.
5. Keep `FIREBASE_SERVICE_ACCOUNT_JSON` server-side only. Never add it to the Vite client environment.

## 2. Razorpay plans

Create these recurring plans in the Razorpay Dashboard (use Test Mode first):

- **Kharchee Pro Monthly:** ₹30 every month (approximately ₹1/day equivalent; billed monthly, not daily).
- **Kharchee Pro Quarterly:** ₹99 every 3 months.

Copy each plan's ID into the server environment:

- `RAZORPAY_MONTHLY_PLAN_ID`
- `RAZORPAY_QUARTERLY_PLAN_ID`

The server expects the monthly plan to be exactly ₹30 (3000 paise) every month and the quarterly plan to be exactly ₹99 (9900 paise) every 3 months. The ₹1/day wording is an affordability comparison only; customers are charged monthly. The configured subscription cycle limits are 120 monthly cycles and 40 quarterly cycles.

Set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` from the same Razorpay mode. Only the public Key ID is sent to the browser; the secret must remain private.

## 3. Webhook

In the Razorpay Dashboard, add a webhook pointing to:

`https://YOUR-DEPLOYED-DOMAIN/api/billing/webhook`

Set a strong webhook secret and copy the same value into `RAZORPAY_WEBHOOK_SECRET`. Enable the subscription events:

- `subscription.authenticated`
- `subscription.activated`
- `subscription.charged`
- `subscription.cancelled`
- `subscription.halted`
- `subscription.completed`
- `subscription.expired`

The webhook uses the raw request body for signature verification. Do not route it through a proxy that rewrites the request body.

## 4. Client and server configuration

The client still needs the four Firebase Web App variables in `.env.local`:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`

The server needs the billing secrets above. Restart/redeploy the server after changing environment variables. Use Test Mode end-to-end before switching to live keys.

## Security behavior

- The client sends its Firebase ID token; the server verifies it before creating, checking, or cancelling a subscription.
- The server creates the subscription and binds it to the Firebase UID in Firestore.
- A UTR, local-storage flag, or client-side success message cannot unlock Pro.
- The server verifies the Razorpay checkout signature and fetches the subscription from Razorpay before granting access.
- Webhook signatures are verified before subscription state is updated.
- Pro status is loaded from the server; imported backups cannot grant paid access.
- Auto-renewal cancellation is sent to the server and should leave access available until the current paid period ends where the provider supplies a valid period end.

## Before launch

Add and publish clear Terms, Privacy, refund/cancellation, and support information. Test successful payment, declined payment, closing checkout, duplicate webhook delivery, renewal, cancellation, and expiry in Test Mode. Review the provider's current requirements before taking live payments. Merchant onboarding, identity/KYC, and settlement details must be handled by an eligible adult account holder if the app owner is under 18; do not bypass provider age or identity checks.
