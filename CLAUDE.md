# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server at http://localhost:3000
npm run build        # Production build
npm run preview      # Preview production build
```

### Supabase Edge Functions

```bash
supabase login
supabase link --project-ref <project-ref>
supabase functions deploy <function-name>   # Deploy single function
supabase secrets set KEY=value              # Set environment secrets
```

Functions to deploy: `stripe-webhook`, `create-checkout`, `create-portal`, `send-alerts`, `send-daily-digest`

## Architecture

This is a React SaaS application for tracking TSLA stock with a freemium model (Free vs Pro at $1.99/first month, then $9.99/month).

### Frontend (React + Vite)

- **Entry**: `src/main.jsx` → `src/App.jsx` (routes defined here)
- **Routes**: `/dashboard` (main), `/login`, `/auth/callback`, `/settings`, `/pricing`
- **Auth Context**: `src/hooks/useAuth.jsx` - provides `AuthProvider` wrapper and `useAuth()` hook with `user`, `profile`, `isPro`, `loading` state

### Data Flow

1. **Stock Data**: `useStockData` hook fetches from Yahoo Finance via CORS proxy (no API key needed)
2. **Company Financials**: `useCompanyFinancials` hook provides TTM revenue and shares outstanding for valuation
3. **Valuation**: `src/config/constants.js` contains `calculateRevenueMultiple()` and `getValuationTier()` functions that determine P/S ratio tiers (BARGAIN → OVERPRICED)

### Backend (Supabase)

- **Auth**: Social OAuth providers (Google, Facebook, Apple, Twitter)
- **Database**: PostgreSQL with RLS - schema in `supabase/migrations/001_initial_schema.sql`
  - `profiles`: User data + subscription status + Stripe IDs
  - `alert_settings`: Per-user price/valuation alert preferences
  - `alert_history`: Sent notifications log
- **Edge Functions** (Deno/TypeScript in `supabase/functions/`):
  - `stripe-webhook`: Handles subscription lifecycle events
  - `create-checkout` / `create-portal`: Stripe checkout/portal session creation
  - `send-alerts` / `send-daily-digest`: Email notification cron jobs (via Resend)

### Payment Integration

- `src/lib/stripe.js`: Stripe client, checkout/portal session creation
- `PRICING` object defines Pro features and price ID
- Webhook updates `profiles.subscription_status` on subscription changes

### AI Chat

- `src/lib/gemini.js`: Google Gemini integration with system prompt for stock analysis
- Has demo mode fallback when API key not configured
- Chat context includes current price and valuation tier

## Environment Variables

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_STRIPE_PUBLISHABLE_KEY
VITE_STRIPE_PRICE_ID
VITE_GEMINI_API_KEY
```

Edge function secrets: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`

## Key Patterns

- Components in `src/components/` organized by feature (auth/, payment/, chat/, alerts/)
- Hooks in `src/hooks/` handle all data fetching and state management
- `PayWall` component wraps Pro-only features and handles gating
- Stock data auto-refreshes every 15 minutes
- All styles in `src/App.css` (single CSS file)
