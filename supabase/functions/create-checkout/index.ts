// Supabase Edge Function: Create Stripe Checkout Session
// Deploy with: supabase functions deploy create-checkout

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.10.0'

const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

class HttpError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

function requireEnv() {
  if (!stripeKey) throw new HttpError(500, 'STRIPE_SECRET_KEY is not configured')
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new HttpError(500, 'SUPABASE_URL or SUPABASE_ANON_KEY is not configured')
  }
}

async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) {
    throw new HttpError(401, 'Missing authorization header')
  }

  const authClient = createClient(supabaseUrl as string, supabaseAnonKey as string, {
    global: { headers: { Authorization: authHeader } },
  })

  const { data: { user }, error } = await authClient.auth.getUser()
  if (error || !user) {
    throw new HttpError(401, 'Unauthorized')
  }
  if (!user.email) {
    throw new HttpError(400, 'Authenticated user is missing an email')
  }

  return user
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    requireEnv()

    const stripe = new Stripe(stripeKey as string, {
      apiVersion: '2023-10-16',
    })

    const user = await getAuthenticatedUser(req)
    const body = await req.json()
    const { priceId, successUrl, cancelUrl } = body

    if (!priceId) {
      throw new HttpError(400, 'Missing priceId')
    }

    console.log('Creating checkout session for:', { userId: user.id, email: user.email, priceId })

    let customer
    const existingCustomers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    })

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0]
      console.log('Found existing customer:', customer.id)
    } else {
      customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id },
      })
      console.log('Created new customer:', customer.id)
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      customer: customer.id,
      metadata: { userId: user.id },
      success_url: successUrl || `${req.headers.get('origin')}/dashboard?success=true`,
      cancel_url: cancelUrl || `${req.headers.get('origin')}/pricing?canceled=true`,
      subscription_data: {
        metadata: { userId: user.id },
      },
    })

    console.log('Checkout session created:', session.id)

    return new Response(
      JSON.stringify({ sessionId: session.id }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 400
    const message = error instanceof Error ? error.message : 'Unknown error occurred'
    console.error('Checkout error:', message)
    return new Response(
      JSON.stringify({ error: message }),
      {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
