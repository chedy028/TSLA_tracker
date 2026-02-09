# TSLA Stock Price Tracker - SaaS Edition

A full-featured Tesla stock price tracker with social authentication, AI assistant, payment integration, and automated email alerts.

![TSLA Tracker](https://img.shields.io/badge/TSLA-Tracker-00d4aa?style=for-the-badge)

## Features

### Free Tier
- Current TSLA price display
- Basic valuation tier indicator

### Pro Tier ($1.99/first month, then $9.99/month)
- **Live Price Updates** - Real-time TSLA stock price with 15-minute auto-refresh
- **Professional Charts** - TradingView-style 90-day candlestick charts
- **Valuation Analysis** - P/S ratio calculation with color-coded status
- **AI Assistant** - Powered by Google Gemini, explains valuations and guides users
- **Email Alerts** - Price thresholds, valuation changes, daily digest

## Valuation Tiers

| Revenue Multiple | Status |
|-----------------|--------|
| >20x | OVERPRICED |
| 13-20x | EXPENSIVE |
| 8-12x | FAIR PRICED |
| 5-7x | CHEAP |
| <5x | BARGAIN BASEMENT |

## Tech Stack

- **Frontend**: React 18 + Vite + React Router
- **Backend**: Supabase (Auth, PostgreSQL, Edge Functions)
- **Charts**: TradingView Lightweight Charts
- **Payments**: Stripe Checkout + Subscriptions
- **AI**: Google Gemini API
- **Email**: Resend
- **Hosting**: Vercel

## Setup Guide

### 1. Clone and Install

```bash
git clone <your-repo>
cd TSLA_tracker
npm install
```

### 2. Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the migration:
   - Copy contents of `supabase/migrations/001_initial_schema.sql`
   - Paste and run in SQL Editor
3. Go to **Authentication > Providers** and enable:
   - Google (requires Google Cloud OAuth credentials)
   - Facebook (requires Facebook App)
   - Apple (requires Apple Developer account)
   - Twitter/X (requires Twitter Developer App)
4. Get your project URL and anon key from **Settings > API**

### 3. Stripe Setup

1. Create account at [stripe.com](https://stripe.com)
2. Create a Product with intro pricing ($1.99/first month, then $9.99/month)
3. Get your publishable key from **Developers > API keys**
4. Get the price ID from your product

### 4. Google Gemini Setup

1. Get API key at [makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)

### 5. Resend Setup (for emails)

1. Create account at [resend.com](https://resend.com)
2. Add and verify your domain
3. Get your API key

### 6. Environment Variables

Create a `.env` file:

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
VITE_STRIPE_PRICE_ID=price_...

# Google Gemini
VITE_GEMINI_API_KEY=your-gemini-key
```

> **Note**: Stock data is fetched from Yahoo Finance via CORS proxy - no API key required.

### 7. Deploy Supabase Edge Functions

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Set secrets for Edge Functions
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set RESEND_API_KEY=re_...

# Deploy functions
supabase functions deploy stripe-webhook
supabase functions deploy create-checkout
supabase functions deploy create-portal
supabase functions deploy send-alerts
supabase functions deploy send-daily-digest
```

### 8. Configure Stripe Webhook

1. Go to Stripe Dashboard > Developers > Webhooks
2. Add endpoint: `https://your-project.supabase.co/functions/v1/stripe-webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Copy the signing secret and add to Supabase secrets

### 9. Schedule Email Alerts (Optional)

In Supabase SQL Editor, enable pg_cron and schedule:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Check price alerts every 15 minutes
SELECT cron.schedule(
  'check-price-alerts',
  '*/15 * * * *',
  $$SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/send-alerts',
    headers := '{"Authorization": "Bearer your-service-role-key"}'::jsonb
  )$$
);

-- Send daily digest at 8 AM UTC
SELECT cron.schedule(
  'daily-digest',
  '0 8 * * *',
  $$SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/send-daily-digest',
    headers := '{"Authorization": "Bearer your-service-role-key"}'::jsonb
  )$$
);
```

### 10. Run Locally

```bash
npm run dev
```

Visit `http://localhost:3000`

### 11. Deploy to Vercel

```bash
npm i -g vercel
vercel
```

Add all environment variables in Vercel dashboard.

## Project Structure

```
TSLA_tracker/
├── src/
│   ├── components/
│   │   ├── auth/           # Login, social buttons
│   │   ├── payment/        # PayWall, pricing, subscription
│   │   ├── chat/           # AI chat widget
│   │   ├── alerts/         # Alert settings
│   │   └── ...             # Price, chart, valuation components
│   ├── hooks/              # useAuth, useSubscription, useChat, etc.
│   ├── lib/                # Supabase, Stripe, Gemini clients
│   └── config/             # Constants, valuation tiers
├── supabase/
│   ├── migrations/         # Database schema
│   └── functions/          # Edge functions for webhooks & emails
└── ...
```

## License

MIT
