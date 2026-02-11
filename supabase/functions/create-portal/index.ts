// Supabase Edge Function: Create Stripe Customer Portal Session
// Deploy with: supabase functions deploy create-portal

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

  return { user, authClient }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    requireEnv()
    const { user, authClient } = await getAuthenticatedUser(req)

    const stripe = new Stripe(stripeKey as string, {
      apiVersion: '2023-10-16',
    })

    const { customerId, returnUrl } = await req.json()
    if (!customerId) {
      throw new HttpError(400, 'Customer ID is required')
    }

    // Validate this customer id belongs to the signed-in user.
    const { data: profile, error: profileError } = await authClient
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    if (profileError) {
      throw new HttpError(400, `Failed to fetch user profile: ${profileError.message}`)
    }

    if (!profile?.stripe_customer_id || profile.stripe_customer_id !== customerId) {
      throw new HttpError(403, 'Customer does not belong to the authenticated user')
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl || `${req.headers.get('origin')}/dashboard`,
    })

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 400
    const message = error instanceof Error ? error.message : 'Unknown error occurred'
    console.error('Portal error:', message)
    return new Response(
      JSON.stringify({ error: message }),
      {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
