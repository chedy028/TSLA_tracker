# TSLA Tracker - Production Setup Guide

This guide walks you through deploying the TSLA Tracker to production.

## Prerequisites

You should already have:
- [x] Stripe account (you mentioned you have this)
- [x] Google Gemini API key (you mentioned you have this)
- [x] Resend account (you mentioned you have this)

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click **New Project**
3. Choose a name (e.g., `tsla-tracker`)
4. Set a secure database password
5. Select the region closest to your users
6. Wait for project to be created (~2 minutes)

### Get Your Supabase Credentials

1. Go to **Settings > API**
2. Copy these values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIs...`

### Run Database Migration

1. Go to **SQL Editor** in Supabase dashboard
2. Copy the entire contents of `supabase/migrations/001_initial_schema.sql`
3. Paste into the SQL Editor
4. Click **Run** to execute

## Step 2: Configure OAuth Providers

Go to **Authentication > Providers** in Supabase dashboard and enable:

### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Go to **APIs & Services > Credentials**
4. Click **Create Credentials > OAuth client ID**
5. Application type: **Web application**
6. Add authorized redirect URI:
   ```
   https://YOUR_SUPABASE_PROJECT.supabase.co/auth/v1/callback
   ```
7. Copy **Client ID** and **Client Secret**
8. In Supabase: Enable Google, paste credentials

### Apple OAuth
1. Go to [Apple Developer](https://developer.apple.com) (requires $99/year membership)
2. Go to **Certificates, IDs & Profiles > Identifiers**
3. Create a **Services ID** with Sign in with Apple enabled
4. Configure the return URL:
   ```
   https://YOUR_SUPABASE_PROJECT.supabase.co/auth/v1/callback
   ```
5. Generate a private key for Sign in with Apple
6. In Supabase: Enable Apple, add credentials

### Facebook OAuth
1. Go to [Meta for Developers](https://developers.facebook.com)
2. Create a new app (Consumer type)
3. Add **Facebook Login** product
4. In Settings > Basic, copy **App ID** and **App Secret**
5. In Facebook Login settings, add redirect URI:
   ```
   https://YOUR_SUPABASE_PROJECT.supabase.co/auth/v1/callback
   ```
6. In Supabase: Enable Facebook, paste credentials

### X (Twitter) OAuth
1. Go to [Twitter Developer Portal](https://developer.twitter.com)
2. Create a project and app
3. Enable **OAuth 2.0** with these settings:
   - Type: Web App
   - Callback URL:
     ```
     https://YOUR_SUPABASE_PROJECT.supabase.co/auth/v1/callback
     ```
4. Copy **Client ID** and **Client Secret**
5. In Supabase: Enable Twitter, paste credentials

## Step 3: Configure Stripe

### Create Subscription Product
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Go to **Products > Add product**
3. Name: "TSLA Tracker Pro"
4. Price: $1.99/first month (intro), then $9.99/month recurring
5. Copy the **Price ID** (starts with `price_`)

### Configure Webhook (after deploying functions)
1. Go to **Developers > Webhooks**
2. Add endpoint:
   ```
   https://YOUR_SUPABASE_PROJECT.supabase.co/functions/v1/stripe-webhook
   ```
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Copy the **Signing secret** (starts with `whsec_`)

## Step 4: Deploy Supabase Edge Functions

### Install Supabase CLI
```bash
npm install -g supabase
```

### Login and Link Project
```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

(Find your project ref in Supabase dashboard URL: `supabase.com/project/YOUR_PROJECT_REF`)

### Set Secrets
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_xxxxx
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxxxx
supabase secrets set RESEND_API_KEY=re_xxxxx
```

### Deploy Functions
```bash
supabase functions deploy stripe-webhook
supabase functions deploy create-checkout
supabase functions deploy create-portal
supabase functions deploy send-alerts
supabase functions deploy send-daily-digest
```

## Step 5: Deploy to Vercel

### Push to GitHub
```bash
git init
git add .
git commit -m "Initial production deployment"
git remote add origin https://github.com/YOUR_USERNAME/tsla-tracker.git
git push -u origin main
```

### Import to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click **Add New > Project**
3. Import your GitHub repository
4. Vercel will auto-detect Vite

### Add Environment Variables
In Vercel project settings, add:

| Variable | Value |
|----------|-------|
| `VITE_SUPABASE_URL` | `https://xxxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIs...` |
| `VITE_STRIPE_PUBLISHABLE_KEY` | `pk_live_xxxxx` |
| `VITE_STRIPE_PRICE_ID` | `price_xxxxx` |
| `VITE_GEMINI_API_KEY` | `your-gemini-key` |

### Deploy
Click **Deploy** and wait for build to complete.

## Step 6: Update Supabase Redirect URLs

After Vercel deploys, update Supabase:

1. Go to **Authentication > URL Configuration**
2. Set **Site URL**: `https://your-app.vercel.app`
3. Add to **Redirect URLs**:
   ```
   https://your-app.vercel.app/auth/callback
   ```

## Step 6.5: Migration and Deployment Order (Stability Guard)

When shipping new features, always deploy in this order to avoid auth/payment regressions:

1. **Database migrations**
2. **Supabase Edge Functions**
3. **Frontend (Vercel)**

### Canonical migration workflow

Use timestamped migrations going forward (do not hand-number new files):

```bash
supabase migration new your_change_name
```

Then:

1. Add SQL to the generated migration file.
2. Apply to linked project:
   ```bash
   supabase db push
   ```
3. Verify migration history alignment:
   ```bash
   supabase migration list --linked
   ```
4. Commit the migration file with the code change that depends on it.

### Release checks before deploy

Run:

```bash
npm run verify:release
```

This validates:
- Required production env vars
- i18n key coverage parity across `en/es/ko/ja`
- Edge function unauthorized contract for `create-checkout`

## Step 7: Test Everything

1. **Auth Flow**: Try signing in with each OAuth provider
2. **Payment Flow**: Use Stripe test mode first (`pk_test_` key)
3. **AI Chat**: Ask the assistant a question
4. **Alerts**: Configure an alert and verify it saves

## Troubleshooting

### OAuth Not Working
- Check redirect URLs match exactly in both provider console and Supabase
- Ensure your domain is verified in each provider's settings

### Payments Not Working
- Verify webhook is receiving events (check Stripe webhook logs)
- Check Supabase function logs for errors
- Ensure STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET are set correctly

### AI Not Responding
- Verify VITE_GEMINI_API_KEY is set in Vercel
- Check browser console for API errors

## Go Live Checklist

- [ ] Switch from Stripe test keys to live keys
- [ ] Verify all OAuth providers work
- [ ] Test a real payment
- [ ] Set up custom domain (optional)
- [ ] Configure Resend email domain verification




