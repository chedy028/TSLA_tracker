// Supabase Edge Function: Stripe Webhook Handler
// Deploy with: supabase functions deploy stripe-webhook

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.10.0'

const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
const supabaseUrl = Deno.env.get('SUPABASE_URL')
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

// Validate required secrets are configured
if (!stripeSecretKey) {
  console.error('STRIPE_SECRET_KEY is not configured')
}
if (!endpointSecret) {
  console.error('STRIPE_WEBHOOK_SECRET is not configured')
}

const stripe = new Stripe(stripeSecretKey || '', {
  apiVersion: '2023-10-16',
})

async function ensureProfileExists(
  supabase: any,
  userId: string,
  email?: string | null
) {
  const { error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: userId,
        email: email ?? null,
      },
      { onConflict: 'id' }
    )

  if (error) {
    throw new Error(`Failed to ensure profile for user ${userId}: ${error.message}`)
  }

  const { error: alertError } = await supabase
    .from('alert_settings')
    .upsert({ user_id: userId }, { onConflict: 'user_id' })

  if (alertError) {
    throw new Error(`Failed to ensure alert settings for user ${userId}: ${alertError.message}`)
  }
}

function assertProfileUpdated(
  rows: { id: string }[] | null,
  context: string
) {
  if (!rows || rows.length === 0) {
    throw new Error(`${context}: no matching profile row was updated`)
  }
}

serve(async (req) => {
  // Validate secrets before processing
  if (!stripeSecretKey) {
    console.error('STRIPE_SECRET_KEY not configured')
    return new Response(JSON.stringify({ error: 'Stripe secret key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!endpointSecret) {
    console.error('STRIPE_WEBHOOK_SECRET not configured - cannot verify webhook')
    return new Response(JSON.stringify({ error: 'Webhook secret not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    console.error('Missing stripe-signature header')
    return new Response(JSON.stringify({ error: 'Missing signature' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const body = await req.text()

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, endpointSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return new Response(JSON.stringify({ error: 'Invalid signature' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Supabase environment variables are not configured')
    return new Response(JSON.stringify({ error: 'Supabase service role is not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.userId
        const customerId = session.customer as string
        const subscriptionId = session.subscription as string

        if (!userId) {
          throw new Error('checkout.session.completed missing metadata.userId')
        }

        await ensureProfileExists(
          supabase,
          userId,
          session.customer_details?.email ?? session.customer_email ?? null
        )

        const { data, error } = await supabase
            .from('profiles')
            .update({
              subscription_status: 'active',
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
            })
            .eq('id', userId)
            .select('id')

        if (error) {
          throw new Error(`Failed to activate subscription for user ${userId}: ${error.message}`)
        }
        assertProfileUpdated(data, `Activation write failed for user ${userId}`)
        console.log(`Subscription activated for user ${userId}`)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        const status = subscription.status === 'active' ? 'active' : 
                       subscription.status === 'past_due' ? 'past_due' :
                       subscription.cancel_at_period_end ? 'canceled' : 'active'

        const { data, error } = await supabase
          .from('profiles')
          .update({
            subscription_status: status,
            subscription_end_date: subscription.current_period_end 
              ? new Date(subscription.current_period_end * 1000).toISOString()
              : null,
          })
          .eq('stripe_customer_id', customerId)
          .select('id')

        if (error) {
          throw new Error(`Failed to update subscription for customer ${customerId}: ${error.message}`)
        }
        assertProfileUpdated(data, `Subscription update failed for customer ${customerId}`)

        console.log(`Subscription updated for customer ${customerId}: ${status}`)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        const { data, error } = await supabase
          .from('profiles')
          .update({
            subscription_status: 'canceled',
            subscription_end_date: new Date().toISOString(),
          })
          .eq('stripe_customer_id', customerId)
          .select('id')

        if (error) {
          throw new Error(`Failed to cancel subscription for customer ${customerId}: ${error.message}`)
        }
        assertProfileUpdated(data, `Subscription cancellation failed for customer ${customerId}`)

        console.log(`Subscription canceled for customer ${customerId}`)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        const { data, error } = await supabase
          .from('profiles')
          .update({ subscription_status: 'past_due' })
          .eq('stripe_customer_id', customerId)
          .select('id')

        if (error) {
          throw new Error(`Failed to mark payment as past due for customer ${customerId}: ${error.message}`)
        }
        assertProfileUpdated(data, `Payment failure update failed for customer ${customerId}`)

        console.log(`Payment failed for customer ${customerId}`)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook handler failed'
    console.error('Webhook handler error:', message)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})




