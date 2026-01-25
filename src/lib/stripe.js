import { loadStripe } from '@stripe/stripe-js'
import { supabase } from './supabase'

const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY

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
    name: 'Pro Plan',
    price: 9.99,
    priceId: import.meta.env.VITE_STRIPE_PRICE_ID, // Set this in your env
    features: [
      'Live TSLA price tracking',
      'Full candlestick chart',
      'Valuation analysis',
      'AI assistant',
      'Price alerts via email',
      'Daily digest emails',
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

// Create checkout session
export async function createCheckoutSession(userId, userEmail) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const priceId = PRICING.pro.priceId
  
  // Validate configuration
  if (!supabaseUrl) {
    throw new Error('Supabase URL not configured')
  }
  
  if (!priceId) {
    throw new Error('Stripe Price ID not configured (VITE_STRIPE_PRICE_ID)')
  }
  
  // Get the user's session token for authorization
  const { data: { session } } = await supabase.auth.getSession()
  const accessToken = session?.access_token
  
  if (!accessToken) {
    throw new Error('Please sign in to subscribe')
  }
  
  console.log('Creating checkout session...', { userId, userEmail, priceId })
  
  const response = await fetch(`${supabaseUrl}/functions/v1/create-checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      userId,
      userEmail,
      priceId,
      successUrl: `${window.location.origin}/dashboard?success=true`,
      cancelUrl: `${window.location.origin}/pricing?canceled=true`,
    }),
  })
  
  const responseText = await response.text()
  console.log('Checkout response:', response.status, responseText)
  
  if (!response.ok) {
    let errorMessage = 'Failed to create checkout session'
    try {
      const errorData = JSON.parse(responseText)
      errorMessage = errorData.error || errorMessage
    } catch {
      // If response isn't JSON, it might be a 404 or server error
      if (response.status === 404) {
        errorMessage = 'Checkout service not found. Edge function may not be deployed.'
      } else {
        errorMessage = `Server error (${response.status}): ${responseText.substring(0, 100)}`
      }
    }
    throw new Error(errorMessage)
  }
  
  const data = JSON.parse(responseText)
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
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  
  // Get the user's session token for authorization
  const { data: { session } } = await supabase.auth.getSession()
  const accessToken = session?.access_token
  
  if (!accessToken) {
    throw new Error('Please sign in to manage subscription')
  }
  
  const response = await fetch(`${supabaseUrl}/functions/v1/create-portal`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      customerId,
      returnUrl: `${window.location.origin}/dashboard`,
    }),
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(error.error || 'Failed to create portal session')
  }
  
  const { url } = await response.json()
  return url
}


