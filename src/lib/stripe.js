import { loadStripe } from '@stripe/stripe-js'
import { supabase } from './supabase'

const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

let stripePromise = null

export function getStripe() {
  if (!stripePromise && stripePublicKey) {
    stripePromise = loadStripe(stripePublicKey)
  }
  return stripePromise
}

// Pricing configuration
export const PRICING = {
  pro: {
    name: 'Cheat Code Pro',
    price: 1.99,
    regularPrice: 9.99,
    introLabel: 'first month',
    priceId: import.meta.env.VITE_STRIPE_PRICE_ID, // Set this in your env
    features: [
      'Real-time valuation signal',
      'Buy/Sell/Hold gauge',
      'Fair value gap analysis',
      'AI stock assistant',
      'Signal change email alerts',
      'Full candlestick chart',
    ],
  },
  free: {
    name: 'Free Plan',
    price: 0,
    features: [
      'Current price only',
      'Basic valuation tier',
    ],
  },
}

function parseFunctionError(status, bodyText, fallbackMessage) {
  let errorMessage = fallbackMessage
  try {
    const payload = JSON.parse(bodyText)
    errorMessage = payload.error || payload.message || fallbackMessage
  } catch {
    if (bodyText) {
      errorMessage = bodyText.slice(0, 180)
    }
  }

  if (status === 401) {
    return 'Session expired. Please sign in again and retry checkout.'
  }
  if (status === 403) {
    return 'Permission denied. Please sign out and sign in again.'
  }
  if (status === 404) {
    return 'Checkout service is unavailable. Edge function may not be deployed.'
  }

  return errorMessage
}

async function getAuthToken({ forceRefresh = false } = {}) {
  if (!supabase) {
    throw new Error('Supabase client not configured')
  }

  if (forceRefresh) {
    const { data, error } = await supabase.auth.refreshSession()
    if (error || !data?.session?.access_token) {
      throw new Error('Session expired. Please sign in again.')
    }
    return data.session.access_token
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) {
    throw new Error('Unable to read auth session. Please sign in again.')
  }

  if (sessionData?.session?.access_token) {
    return sessionData.session.access_token
  }

  const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession()
  if (refreshError || !refreshed?.session?.access_token) {
    throw new Error('Please sign in to continue.')
  }

  return refreshed.session.access_token
}

async function invokeProtectedFunction(path, payload, fallbackMessage) {
  if (!supabaseUrl) {
    throw new Error('Supabase URL not configured')
  }

  const invoke = async (token) => {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    }

    if (supabaseAnonKey) {
      headers.apikey = supabaseAnonKey
    }

    return fetch(`${supabaseUrl}/functions/v1/${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })
  }

  let accessToken = await getAuthToken()
  let response = await invoke(accessToken)

  // Retry once with an explicit refresh if token is stale.
  if (response.status === 401) {
    accessToken = await getAuthToken({ forceRefresh: true })
    response = await invoke(accessToken)
  }

  const responseText = await response.text()

  if (!response.ok) {
    throw new Error(parseFunctionError(response.status, responseText, fallbackMessage))
  }

  try {
    return JSON.parse(responseText)
  } catch {
    throw new Error('Invalid function response format')
  }
}

// Create checkout session
export async function createCheckoutSession(userId, userEmail) {
  const priceId = PRICING.pro.priceId
  
  // Validate configuration
  if (!priceId) {
    throw new Error('Stripe Price ID not configured (VITE_STRIPE_PRICE_ID)')
  }

  console.log('Creating checkout session...', { userId, userEmail, priceId })

  const data = await invokeProtectedFunction(
    'create-checkout',
    {
      // Keep fields for backward compatibility with function versions.
      userId,
      userEmail,
      priceId,
      successUrl: `${window.location.origin}/dashboard?success=true`,
      cancelUrl: `${window.location.origin}/pricing?canceled=true`,
    },
    'Failed to create checkout session'
  )

  if (!data?.sessionId) {
    throw new Error('Checkout session was created without a session id')
  }

  return data.sessionId
}

// Redirect to Stripe Checkout
export async function redirectToCheckout(userId, userEmail) {
  const stripe = await getStripe()
  if (!stripe) {
    throw new Error('Stripe not configured')
  }
  
  const sessionId = await createCheckoutSession(userId, userEmail)
  
  const { error } = await stripe.redirectToCheckout({ sessionId })
  if (error) {
    throw error
  }
}

// Create customer portal session for managing subscription
export async function createPortalSession(customerId) {
  const data = await invokeProtectedFunction(
    'create-portal',
    {
      customerId,
      returnUrl: `${window.location.origin}/dashboard`,
    },
    'Failed to create billing portal session'
  )

  if (!data?.url) {
    throw new Error('Billing portal URL was not returned')
  }

  return data.url
}

