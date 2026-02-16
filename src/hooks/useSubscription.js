import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './useAuth'
import {
  redirectToCheckout,
  createPortalSession,
  PRICING,
  PAYMENT_ERROR_CODES,
  isPaymentError,
} from '../lib/stripe'
import { signOut } from '../lib/supabase'
import { useLanguage } from '../i18n/LanguageContext'

export function useSubscription() {
  const { user, profile, isPro, refreshProfile } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const redirectToPricingLogin = useCallback(() => {
    navigate('/login?next=%2Fpricing', {
      replace: true,
      state: {
        from: { pathname: '/pricing' },
        reason: 'auth_required',
      },
    })
  }, [navigate])

  const resolveLocalizedError = useCallback((err, fallbackKey) => {
    if (isPaymentError(err)) {
      if (err.messageKey) return t(err.messageKey)
      return t(fallbackKey)
    }
    if (err instanceof Error && err.message) return err.message
    return t(fallbackKey)
  }, [t])

  const handleAuthRequired = useCallback(async () => {
    const message = t('paymentErrors.authRequired')
    setError(message)
    alert(message)
    try {
      await signOut()
    } catch (signOutError) {
      console.warn('Failed to sign out stale session:', signOutError)
    }
    redirectToPricingLogin()
  }, [redirectToPricingLogin, t])

  const subscribe = useCallback(async () => {
    if (!user) {
      const message = t('paymentErrors.signInRequired')
      setError(message)
      alert(message)
      redirectToPricingLogin()
      return
    }

    setLoading(true)
    setError(null)

    try {
      console.log('Starting checkout for user:', user.id, user.email)
      await redirectToCheckout(user.id, user.email)
    } catch (err) {
      console.error('Subscription error:', err)
      if (isPaymentError(err) && err.code === PAYMENT_ERROR_CODES.AUTH_REQUIRED) {
        await handleAuthRequired()
        return
      }

      const message = resolveLocalizedError(err, 'paymentErrors.checkoutFailed')
      setError(message)
      alert(`${t('pricing.checkoutErrorPrefix')}: ${message}`)
    } finally {
      setLoading(false)
    }
  }, [user, t, redirectToPricingLogin, handleAuthRequired, resolveLocalizedError])

  const manageSubscription = useCallback(async () => {
    if (!profile?.stripe_customer_id) {
      setError(t('subscription.noSubscription'))
      return
    }

    setLoading(true)
    setError(null)

    try {
      const url = await createPortalSession(profile.stripe_customer_id)
      window.location.href = url
    } catch (err) {
      console.error('Portal error:', err)
      if (isPaymentError(err) && err.code === PAYMENT_ERROR_CODES.AUTH_REQUIRED) {
        await handleAuthRequired()
        return
      }

      setError(resolveLocalizedError(err, 'paymentErrors.portalFailed'))
    } finally {
      setLoading(false)
    }
  }, [profile, t, handleAuthRequired, resolveLocalizedError])

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




