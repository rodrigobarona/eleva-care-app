# AuthKit Environment Variables

## Required Environment Variables

Add these to your `.env.local` file:

```env
# WorkOS Core
WORKOS_API_KEY="sk_test_..."
WORKOS_CLIENT_ID="client_..."

# AuthKit Next.js (Required)
WORKOS_REDIRECT_URI="http://localhost:3000/api/auth/callback"
WORKOS_COOKIE_PASSWORD="kKrr/dtGJ6MiQ3Ds83aoGxBcfXArlA42nfDnv/FRJTw="
```

## Generate Cookie Password

The `WORKOS_COOKIE_PASSWORD` must be at least 32 characters. Generate a new one:

```bash
openssl rand -base64 32
```

## Production Configuration

For production (Vercel), update:

```env
WORKOS_REDIRECT_URI="https://eleva.care/api/auth/callback"
WORKOS_COOKIE_DOMAIN="eleva.care"
```

Make sure to register the production callback URL in your WorkOS dashboard.
