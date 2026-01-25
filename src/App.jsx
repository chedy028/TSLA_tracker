import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { PriceChart } from './components/PriceChart'
import { PriceHero } from './components/PriceHero'
import { RulesLegend } from './components/RulesLegend'
import { LoginPage } from './components/auth/LoginPage'
import { AuthCallback } from './components/auth/AuthCallback'
import { PayWall } from './components/payment/PayWall'
import { PricingSection } from './components/payment/PricingCard'
import { SubscriptionStatus } from './components/payment/SubscriptionStatus'
import { InlineChatBox } from './components/chat/InlineChatBox'
import { AlertSettings } from './components/alerts/AlertSettings'
import { useStockData } from './hooks/useStockData'
import { useCompanyFinancials } from './hooks/useCompanyFinancials'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { signOut } from './lib/supabase'
import { calculateRevenueMultiple, getValuationTier } from './config/constants'

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

  // Check for success parameter from Stripe
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const isSuccess = params.get('success') === 'true'
    if (!isSuccess) {
      setSubscriptionSyncing(false)
      setSubscriptionSyncError(null)
      return
    }

    let attempts = 0
    let active = true

    const pollSubscription = async () => {
      attempts += 1
      try {
        await refreshProfile()
      } catch (err) {
        if (active) {
          setSubscriptionSyncError(err.message || 'Unable to refresh subscription status.')
        }
      }

      if (attempts >= 10 && active && !isPro) {
        setSubscriptionSyncError('Subscription update is taking longer than expected.')
        setSubscriptionSyncing(false)
      }
    }

    setSubscriptionSyncing(true)
    setSubscriptionSyncError(null)
    pollSubscription()
    const interval = setInterval(pollSubscription, 3000)

    return () => {
      active = false
      clearInterval(interval)
    }
  }, [location.search, refreshProfile])

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

  // Calculate current valuation for chat context
  const revenueMultiple = quote && financials 
    ? calculateRevenueMultiple(quote.current, financials)
    : 0
  const valuationTier = revenueMultiple ? getValuationTier(revenueMultiple)?.label : null

  return (
    <div className="app">
      <div className="background-grid" />
      
      <header className="header">
        <div className="logo">
          <span className="logo-icon">T</span>
          <span className="logo-text">TSLA Tracker</span>
        </div>
        <div className="header-actions">
          <span className="data-source-badge live">LIVE</span>
          {isPro && (
            <span className="pro-badge">PRO</span>
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
                    <span className="user-plan">{isPro ? 'Pro Plan' : 'Free Plan'}</span>
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
        {/* AI Chat Box at the top */}
        <InlineChatBox
          currentPrice={quote?.current}
          valuationTier={valuationTier}
          revenueMultiple={revenueMultiple}
        />

        <div className="content-stack">
          <PriceHero 
            quote={quote} 
            lastUpdated={lastUpdated} 
            loading={loading} 
          />
        </div>

        <PayWall feature="Pro Features">
          <RulesLegend currentPrice={quote?.current} financials={financials} />
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
          <span className="logo-icon">T</span>
          <span className="logo-text">TSLA Tracker</span>
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
          <span className="logo-icon">T</span>
          <span className="logo-text">TSLA Tracker</span>
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

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
