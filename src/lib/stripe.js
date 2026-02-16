import { loadStripe } from '@stripe/stripe-js'
import { supabase } from './supabase'

const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

let stripePromise = null

export const PAYMENT_ERROR_CODES = {
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  FUNCTION_UNAVAILABLE: 'FUNCTION_UNAVAILABLE',
  CHECKOUT_FAILED: 'CHECKOUT_FAILED',
  PORTAL_FAILED: 'PORTAL_FAILED',
  CONFIG_ERROR: 'CONFIG_ERROR',
  INVALID_RESPONSE: 'INVALID_RESPONSE',
}

class PaymentError extends Error {
  constructor({
    code,
    messageKey,
    message,
    status,
    details,
  }) {
    super(message)
    this.name = 'PaymentError'
    this.code = code
    this.messageKey = messageKey
    this.status = status || null
    this.details = details || null
  }
}

export function isPaymentError(error) {
  return error instanceof PaymentError
}

function createPaymentError({
  code,
  messageKey,
  message,
  status,
  details,
}) {
  return new PaymentError({
    code,
    messageKey,
    message,
    status,
    details,
  })
}

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

function parseFunctionError({
  status,
  bodyText,
  fallbackCode,
  fallbackMessageKey,
  fallbackMessage,
}) {
  let errorMessage = fallbackMessage
  let payload = null
  try {
    payload = JSON.parse(bodyText)
    errorMessage = payload.error || payload.message || fallbackMessage
  } catch {
    if (bodyText) {
      errorMessage = bodyText.slice(0, 180)
    }
  }

  if (status === 401) {
    return createPaymentError({
      code: PAYMENT_ERROR_CODES.AUTH_REQUIRED,
      messageKey: 'paymentErrors.authRequired',
      message: errorMessage,
      status,
      details: payload,
    })
  }
  if (status === 403) {
    return createPaymentError({
      code: PAYMENT_ERROR_CODES.PERMISSION_DENIED,
      messageKey: 'paymentErrors.permissionDenied',
      message: errorMessage,
      status,
      details: payload,
    })
  }
  if (status === 404) {
    return createPaymentError({
      code: PAYMENT_ERROR_CODES.FUNCTION_UNAVAILABLE,
      messageKey: 'paymentErrors.functionUnavailable',
      message: errorMessage,
      status,
      details: payload,
    })
  }

  return createPaymentError({
    code: fallbackCode,
    messageKey: fallbackMessageKey,
    message: errorMessage,
    status,
    details: payload,
  })
}

async function getAuthToken({ forceRefresh = false } = {}) {
  if (!supabase) {
    throw createPaymentError({
      code: PAYMENT_ERROR_CODES.CONFIG_ERROR,
      messageKey: 'paymentErrors.configError',
      message: 'Supabase client not configured',
    })
  }

  if (forceRefresh) {
    const { data, error } = await supabase.auth.refreshSession()
    if (error || !data?.session?.access_token) {
      throw createPaymentError({
        code: PAYMENT_ERROR_CODES.AUTH_REQUIRED,
        messageKey: 'paymentErrors.authRequired',
        message: 'Session expired. Please sign in again.',
      })
    }
    return data.session.access_token
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) {
    throw createPaymentError({
      code: PAYMENT_ERROR_CODES.AUTH_REQUIRED,
      messageKey: 'paymentErrors.authRequired',
      message: 'Unable to read auth session. Please sign in again.',
    })
  }

  if (sessionData?.session?.access_token) {
    return sessionData.session.access_token
  }

  const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession()
  if (refreshError || !refreshed?.session?.access_token) {
    throw createPaymentError({
      code: PAYMENT_ERROR_CODES.AUTH_REQUIRED,
      messageKey: 'paymentErrors.authRequired',
      message: 'Please sign in to continue.',
    })
  }

  return refreshed.session.access_token
}

async function invokeProtectedFunction(
  path,
  payload,
  {
    fallbackCode,
    fallbackMessageKey,
    fallbackMessage,
  }
) {
  if (!supabaseUrl) {
    throw createPaymentError({
      code: PAYMENT_ERROR_CODES.CONFIG_ERROR,
      messageKey: 'paymentErrors.configError',
      message: 'Supabase URL not configured',
    })
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
    try {
      accessToken = await getAuthToken({ forceRefresh: true })
      response = await invoke(accessToken)
    } catch (refreshError) {
      if (isPaymentError(refreshError) && refreshError.code === PAYMENT_ERROR_CODES.AUTH_REQUIRED) {
        throw refreshError
      }
      throw createPaymentError({
        code: PAYMENT_ERROR_CODES.AUTH_REQUIRED,
        messageKey: 'paymentErrors.authRequired',
        message: 'Session expired. Please sign in again and retry checkout.',
      })
    }
  }

  const responseText = await response.text()

  if (!response.ok) {
    throw parseFunctionError({
      status: response.status,
      bodyText: responseText,
      fallbackCode,
      fallbackMessageKey,
      fallbackMessage,
    })
  }

  try {
    return JSON.parse(responseText)
  } catch {
    throw createPaymentError({
      code: PAYMENT_ERROR_CODES.INVALID_RESPONSE,
      messageKey: 'paymentErrors.invalidResponse',
      message: 'Invalid function response format',
    })
  }
}

// Create checkout session
export async function createCheckoutSession(userId, userEmail) {
  const priceId = PRICING.pro.priceId
  
  // Validate configuration
  if (!priceId) {
    throw createPaymentError({
      code: PAYMENT_ERROR_CODES.CONFIG_ERROR,
      messageKey: 'paymentErrors.priceIdMissing',
      message: 'Stripe Price ID not configured (VITE_STRIPE_PRICE_ID)',
    })
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
    {
      fallbackCode: PAYMENT_ERROR_CODES.CHECKOUT_FAILED,
      fallbackMessageKey: 'paymentErrors.checkoutFailed',
      fallbackMessage: 'Failed to create checkout session',
    }
  )

  if (!data?.sessionId) {
    throw createPaymentError({
      code: PAYMENT_ERROR_CODES.INVALID_RESPONSE,
      messageKey: 'paymentErrors.invalidResponse',
      message: 'Checkout session was created without a session id',
    })
  }

  return data.sessionId
}

// Redirect to Stripe Checkout
export async function redirectToCheckout(userId, userEmail) {
  const stripe = await getStripe()
  if (!stripe) {
    throw createPaymentError({
      code: PAYMENT_ERROR_CODES.CONFIG_ERROR,
      messageKey: 'paymentErrors.stripeUnavailable',
      message: 'Stripe not configured',
    })
  }
  
  const sessionId = await createCheckoutSession(userId, userEmail)
  
  const { error } = await stripe.redirectToCheckout({ sessionId })
  if (error) {
    throw createPaymentError({
      code: PAYMENT_ERROR_CODES.CHECKOUT_FAILED,
      messageKey: 'paymentErrors.checkoutRedirectFailed',
      message: error.message || 'Failed to redirect to checkout',
      details: error,
    })
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
    {
      fallbackCode: PAYMENT_ERROR_CODES.PORTAL_FAILED,
      fallbackMessageKey: 'paymentErrors.portalFailed',
      fallbackMessage: 'Failed to create billing portal session',
    }
  )

  if (!data?.url) {
    throw createPaymentError({
      code: PAYMENT_ERROR_CODES.INVALID_RESPONSE,
      messageKey: 'paymentErrors.invalidResponse',
      message: 'Billing portal URL was not returned',
    })
  }

  return data.url
}
