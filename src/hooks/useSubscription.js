import { useState, useCallback } from 'react'
import { useAuth } from './useAuth'
import { redirectToCheckout, createPortalSession, PRICING } from '../lib/stripe'

export function useSubscription() {
  const { user, profile, isPro, refreshProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const subscribe = useCallback(async () => {
    if (!user) {
      setError('Please sign in to subscribe')
      alert('Please sign in to subscribe')
      return
    }

    setLoading(true)
    setError(null)

    try {
      console.log('Starting checkout for user:', user.id, user.email)
      await redirectToCheckout(user.id, user.email)
    } catch (err) {
      console.error('Subscription error:', err)
      setError(err.message)
      // Show error to user
      alert(`Checkout error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }, [user])

  const manageSubscription = useCallback(async () => {
    if (!profile?.stripe_customer_id) {
      setError('No subscription found')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const url = await createPortalSession(profile.stripe_customer_id)
      window.location.href = url
    } catch (err) {
      console.error('Portal error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [profile])

  return {
    isPro,
    loading,
    error,
    subscribe,
    manageSubscription,
    refreshProfile,
    pricing: PRICING,
    subscriptionStatus: profile?.subscription_status || 'free',
    subscriptionEndDate: profile?.subscription_end_date,
  }
}






