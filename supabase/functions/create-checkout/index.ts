// Supabase Edge Function: Create Stripe Checkout Session
// Deploy with: supabase functions deploy create-checkout

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.10.0'

const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Check if Stripe key is configured
    if (!stripeKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured')
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
    })

    const body = await req.json()
    console.log('Received request:', JSON.stringify(body))
    
    const { userId, userEmail, priceId, successUrl, cancelUrl } = body

    if (!userId) {
      throw new Error('Missing userId')
    }
    if (!priceId) {
      throw new Error('Missing priceId')
    }

    console.log('Creating checkout session for:', { userId, userEmail, priceId })

    // Create or retrieve customer first (required for Stripe Accounts V2)
    let customer
    const existingCustomers = await stripe.customers.list({
      email: userEmail,
      limit: 1,
    })

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0]
      console.log('Found existing customer:', customer.id)
    } else {
      customer = await stripe.customers.create({
        email: userEmail,
        metadata: { userId },
      })
      console.log('Created new customer:', customer.id)
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      customer: customer.id,
      metadata: {
        userId,
      },
      success_url: successUrl || `${req.headers.get('origin')}/dashboard?success=true`,
      cancel_url: cancelUrl || `${req.headers.get('origin')}/pricing?canceled=true`,
      subscription_data: {
        metadata: {
          userId,
        },
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
    console.error('Checkout error:', error.message, error.stack)
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error occurred' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})






