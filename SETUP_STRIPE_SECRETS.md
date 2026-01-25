# Fix Payment System - Set Up Stripe Secrets

## Problem
Your edge functions need Stripe secrets that aren't currently configured. Without these, the payment system cannot:
- Create checkout sessions
- Verify webhook signatures
- Update subscription status

## Step 1: Get Your Stripe Secret Key

1. Go to: https://dashboard.stripe.com/test/apikeys
2. Copy your **Secret key** (starts with `sk_test_...`)
3. **DO NOT share this key or commit it to git!**

## Step 2: Get Your Webhook Secret

1. Go to: https://dashboard.stripe.com/test/webhooks
2. Find your webhook endpoint or create a new one:
   - Click "Add endpoint"
   - URL: `https://aiqpmtroekgrzyjcqkbl.supabase.co/functions/v1/stripe-webhook`
   - Events to listen: Select these:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_failed`
3. After creating, click on the webhook and find **Signing secret** (starts with `whsec_...`)
4. Copy this secret

## Step 3: Set Secrets in Supabase

Run these commands in your terminal:

```bash
# Login to Supabase (if not already logged in)
supabase login

# Link to your project
supabase link --project-ref aiqpmtroekgrzyjcqkbl

# Set the Stripe secret key
supabase secrets set STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE

# Set the webhook secret
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET_HERE

# If you plan to use email alerts, also set:
# supabase secrets set RESEND_API_KEY=your_resend_key
```

## Step 4: Redeploy Edge Functions

After setting secrets, redeploy the functions so they pick up the new environment variables:

```bash
# Deploy payment functions
supabase functions deploy create-checkout
supabase functions deploy create-portal
supabase functions deploy stripe-webhook
```

## Step 5: Test the Payment Flow

1. Clear your browser cache and refresh the app
2. Click "Get Started" on the pricing page
3. You should be redirected to Stripe checkout
4. Use test card: `4242 4242 4242 4242` (any future date, any CVC)
5. Complete payment
6. You should be redirected back and see Pro subscription activated within 10 seconds

## Troubleshooting

### "Webhook secret not configured" error
- Make sure you ran `supabase secrets set STRIPE_WEBHOOK_SECRET=...`
- Redeploy the webhook function after setting the secret

### Subscription not activating after payment
- Check webhook logs in Stripe dashboard
- Make sure webhook URL is correct: `https://aiqpmtroekgrzyjcqkbl.supabase.co/functions/v1/stripe-webhook`
- Check that you selected the correct events in Step 2

### "STRIPE_SECRET_KEY is not configured"
- Run `supabase secrets set STRIPE_SECRET_KEY=...`
- Redeploy create-checkout function

## Verify Secrets Are Set

```bash
# List all secrets (shows names only, not values)
supabase secrets list
```

You should see:
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET

---

Once completed, your payment system will be fully functional!
