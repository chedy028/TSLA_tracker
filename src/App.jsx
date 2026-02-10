import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { PriceChart } from './components/PriceChart'
import LandingPage from './components/landing/LandingPage'
import { LoginPage } from './components/auth/LoginPage'
import { AuthCallback } from './components/auth/AuthCallback'
import { PayWall } from './components/payment/PayWall'
import { PricingSection } from './components/payment/PricingCard'
import { SubscriptionStatus } from './components/payment/SubscriptionStatus'
import { InlineChatBox } from './components/chat/InlineChatBox'
import { AlertSettings } from './components/alerts/AlertSettings'
import ValuationGauge from './components/gauge/ValuationGauge'
import DataCards from './components/dashboard/DataCards'
import { useStockData } from './hooks/useStockData'
import { useCompanyFinancials } from './hooks/useCompanyFinancials'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { signOut } from './lib/supabase'
import { calculateRevenueMultiple, getValuationTier } from './config/constants'
import RefundPolicy from './components/legal/RefundPolicy'
import ContactPage from './components/legal/ContactPage'
import TermsPage from './components/legal/TermsPage'
import PrivacyPage from './components/legal/PrivacyPage'

function Dashboard() {
  const [showSettings, setShowSettings] = useState(false)
  const [subscriptionSyncing, setSubscriptionSyncing] = useState(false)
  const [subscriptionSyncError, setSubscriptionSyncError] = useState(null)
  const { user, profile, isPro, loading: authLoading, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const {
    quote,
    candles,
    loading,
    candlesLoading,
    lastUpdated,
    error,
    refetch,
    selectedRange,
    changeRange,
    availableRanges,
  } = useStockData()
  const { financials, loading: financialsLoading, refetch: refetchFinancials } = useCompanyFinancials()

  // Check for success parameter from Stripe and keep polling bounded.
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const isSuccess = params.get('success') === 'true'
    if (!isSuccess || !user) {
      setSubscriptionSyncing(false)
      setSubscriptionSyncError(null)
      return
    }

    if (isPro) {
      setSubscriptionSyncing(false)
      setSubscriptionSyncError(null)
      return
    }

    let attempts = 0
    let stopped = false
    let intervalId = null
    const maxAttempts = 10

    const pollSubscription = async () => {
      if (stopped) return
      attempts += 1

      try {
        const latestProfile = await refreshProfile()
        if (latestProfile?.subscription_status === 'active') {
          setSubscriptionSyncing(false)
          setSubscriptionSyncError(null)
          stopped = true
          if (intervalId) clearInterval(intervalId)
          return
        }
      } catch (err) {
        if (!stopped) {
          setSubscriptionSyncError(err.message || 'Unable to refresh subscription status.')
          setSubscriptionSyncing(false)
          stopped = true
          if (intervalId) clearInterval(intervalId)
        }
        return
      }

      if (attempts >= maxAttempts && !stopped) {
        setSubscriptionSyncError('Subscription update is taking longer than expected.')
        setSubscriptionSyncing(false)
        stopped = true
        if (intervalId) clearInterval(intervalId)
      }
    }

    setSubscriptionSyncing(true)
    setSubscriptionSyncError(null)
    pollSubscription()
    intervalId = setInterval(pollSubscription, 3000)

    return () => {
      stopped = true
      if (intervalId) clearInterval(intervalId)
    }
  }, [location.search, user, isPro, refreshProfile])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const isSuccess = params.get('success') === 'true'
    if (isSuccess && isPro) {
      setSubscriptionSyncing(false)
      setSubscriptionSyncError(null)
      const timeout = setTimeout(() => {
        navigate('/dashboard', { replace: true })
      }, 1200)
      return () => clearTimeout(timeout)
    }
  }, [isPro, location.search, navigate])

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  // Calculate current valuation
  const revenueMultiple = quote && financials
    ? calculateRevenueMultiple(quote.current, financials)
    : 0
  const tier = revenueMultiple ? getValuationTier(revenueMultiple) : null
  const valuationTier = tier?.label || null

  return (
    <div className="app">
      <div className="background-grid" />

      <header className="header">
        <div className="logo">
          <span className="logo-emoji">🎮</span>
          <span className="logo-text">TSLA CHEAT CODE</span>
        </div>
        <div className="header-actions">
          {isPro && (
            <span className="pro-badge">Pro Active</span>
          )}
          {user ? (
            <div className="user-menu">
              <button className="user-btn" onClick={() => setShowSettings(!showSettings)}>
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="user-avatar" />
                ) : (
                  <div className="user-avatar-placeholder">
                    {user.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
              </button>
              {showSettings && (
                <div className="user-dropdown">
                  <div className="user-info">
                    <span className="user-email">{user.email}</span>
                    <span className="user-plan">{isPro ? 'Cheat Code Pro' : 'Free Plan'}</span>
                  </div>
                  <hr />
                  <button onClick={() => { setShowSettings(false); navigate('/settings') }}>
                    Alert Settings
                  </button>
                  {!isPro && (
                    <button onClick={() => { setShowSettings(false); navigate('/pricing') }}>
                      Upgrade to Pro
                    </button>
                  )}
                  <hr />
                  <button onClick={handleSignOut}>Sign Out</button>
                </div>
              )}
            </div>
          ) : (
            <button className="login-btn" onClick={() => navigate('/login')}>
              Sign In
            </button>
          )}
        </div>
      </header>

      <main className="main">
        {subscriptionSyncing && !subscriptionSyncError && !isPro && (
          <div className="alert-message">
            Finalizing your subscription. This can take a few seconds.
          </div>
        )}
        {subscriptionSyncError && (
          <div className="alert-message error">{subscriptionSyncError}</div>
        )}
        {isPro && new URLSearchParams(location.search).get('success') === 'true' && (
          <div className="alert-message success">
            Subscription active. Thanks for upgrading!
          </div>
        )}

        {/* Gauge — shown for all users */}
        <div className="gauge-section">
          <ValuationGauge
            multiple={revenueMultiple}
            locked={!isPro}
            tier={tier}
          />
        </div>

        {/* Pro: signal text + data cards + chat + chart */}
        {isPro ? (
          <>
            {tier && (
              <div className="signal-section">
                <span className="signal-label">SIGNAL:</span>
                <span className="signal-text" style={{ color: tier.signalColor }}>
                  {tier.signal}
                </span>
              </div>
            )}

            <DataCards
              quote={quote}
              revenueMultiple={revenueMultiple}
              financials={financials}
            />

            <InlineChatBox
              currentPrice={quote?.current}
              valuationTier={valuationTier}
              revenueMultiple={revenueMultiple}
            />

            <PayWall feature="Pro Features">
              <PriceChart
                candles={candles}
                loading={loading}
                candlesLoading={candlesLoading}
                financials={financials}
                currentPrice={quote?.current}
                selectedRange={selectedRange}
                onRangeChange={changeRange}
                availableRanges={availableRanges}
              />
            </PayWall>
          </>
        ) : (
          /* Free authenticated: locked gauge + CTA */
          <div className="free-cta-section">
            <button
              className="cta-unlock-dashboard"
              onClick={() => navigate('/pricing')}
            >
              UNLOCK SIGNAL — $1.99
            </button>
            <p className="free-cta-subtext">Less than a coffee. Cancel anytime.</p>
          </div>
        )}
      </main>

      <footer className="footer">
        <p>
          <span className="disclaimer">
            Not financial advice. Do your own research before investing.
          </span>
        </p>
      </footer>
    </div>
  )
}

function SettingsPage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login', { state: { from: { pathname: '/settings' } } })
    }
  }, [user, loading, navigate])

  if (loading) {
    return (
      <div className="app">
        <div className="auth-loading-screen">
          <div className="loading-spinner" />
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <div className="background-grid" />

      <header className="header">
        <div className="logo" onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer' }}>
          <span className="logo-emoji">🎮</span>
          <span className="logo-text">TSLA CHEAT CODE</span>
        </div>
        <button className="back-btn" onClick={() => navigate('/dashboard')}>
          ← Back to Dashboard
        </button>
      </header>

      <main className="main settings-main">
        <div className="settings-grid">
          <div className="settings-section">
            <h2>Settings</h2>
            <SubscriptionStatus />
          </div>
          <div className="settings-section">
            <AlertSettings />
          </div>
        </div>
      </main>
    </div>
  )
}

function PricingPage() {
  const navigate = useNavigate()

  return (
    <div className="app">
      <div className="background-grid" />

      <header className="header">
        <div className="logo" onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer' }}>
          <span className="logo-emoji">🎮</span>
          <span className="logo-text">TSLA CHEAT CODE</span>
        </div>
        <button className="back-btn" onClick={() => navigate('/dashboard')}>
          ← Back to Dashboard
        </button>
      </header>

      <main className="main pricing-main">
        <PricingSection />
      </main>
    </div>
  )
}

function HomeRoute() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="app">
        <div className="auth-loading-screen">
          <div className="loading-spinner" />
        </div>
      </div>
    )
  }

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  return <LandingPage />
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomeRoute />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/refund" element={<RefundPolicy />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
