import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import LandingPage from './components/landing/LandingPage'
import { LoginPage } from './components/auth/LoginPage'
import { AuthCallback } from './components/auth/AuthCallback'
import { PricingSection } from './components/payment/PricingCard'
import { SubscriptionStatus } from './components/payment/SubscriptionStatus'
import { InlineChatBox } from './components/chat/InlineChatBox'
import { AlertSettings } from './components/alerts/AlertSettings'
import ValuationGauge from './components/gauge/ValuationGauge'
import { useStockData } from './hooks/useStockData'
import { useCompanyFinancials } from './hooks/useCompanyFinancials'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { signOut } from './lib/supabase'
import { calculateRevenueMultiple, getValuationTier } from './config/constants'
import RefundPolicy from './components/legal/RefundPolicy'
import ContactPage from './components/legal/ContactPage'
import TermsPage from './components/legal/TermsPage'
import PrivacyPage from './components/legal/PrivacyPage'
import { LanguageProvider, useLanguage } from './i18n/LanguageContext'

function Dashboard() {
  const [showSettings, setShowSettings] = useState(false)
  const [subscriptionSyncing, setSubscriptionSyncing] = useState(false)
  const [subscriptionSyncError, setSubscriptionSyncError] = useState(null)
  const { user, profile, isPro, loading: authLoading, refreshProfile } = useAuth()
  const { lang, setLang, t, languageOptions } = useLanguage()
  const navigate = useNavigate()
  const location = useLocation()

  const {
    quote,
    loading,
    error,
    refetch,
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
          setSubscriptionSyncError(err.message || 'dashboard.subscriptionRefreshError')
          setSubscriptionSyncing(false)
          stopped = true
          if (intervalId) clearInterval(intervalId)
        }
        return
      }

      if (attempts >= maxAttempts && !stopped) {
        setSubscriptionSyncError('dashboard.subscriptionSlow')
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
  const resolvedSyncError = subscriptionSyncError?.startsWith('dashboard.')
    ? t(subscriptionSyncError)
    : subscriptionSyncError

  return (
    <div className="app">
      <div className="background-grid" />

      <header className="header">
        <div className="logo">
          <span className="logo-emoji">🎮</span>
          <span className="logo-text">TSLA CHEAT CODE</span>
        </div>
        <div className="header-actions">
          <select
            className="lang-toggle-dashboard"
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            aria-label="Language"
          >
            {languageOptions.map((option) => (
              <option key={option.code} value={option.code}>
                {option.short}
              </option>
            ))}
          </select>
          {isPro && (
            <span className="pro-badge">{t('dashboard.proActive')}</span>
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
                    <span className="user-plan">{isPro ? t('dashboard.userPlanPro') : t('dashboard.userPlanFree')}</span>
                  </div>
                  <hr />
                  <button onClick={() => { setShowSettings(false); navigate('/settings') }}>
                    {t('dashboard.alertSettings')}
                  </button>
                  {!isPro && (
                    <button onClick={() => { setShowSettings(false); navigate('/pricing') }}>
                      {t('dashboard.upgradeToPro')}
                    </button>
                  )}
                  <hr />
                  <button onClick={handleSignOut}>{t('dashboard.signOut')}</button>
                </div>
              )}
            </div>
          ) : (
            <button className="login-btn" onClick={() => navigate('/login')}>
              {t('dashboard.signIn')}
            </button>
          )}
        </div>
      </header>

      <main className="main">
        {subscriptionSyncing && !subscriptionSyncError && !isPro && (
          <div className="alert-message">
            {t('dashboard.finalizingSubscription')}
          </div>
        )}
        {subscriptionSyncError && (
          <div className="alert-message error">{resolvedSyncError}</div>
        )}
        {isPro && new URLSearchParams(location.search).get('success') === 'true' && (
          <div className="alert-message success">
            {t('dashboard.subscriptionActive')}
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

        {isPro ? (
          <InlineChatBox
            currentPrice={quote?.current}
            valuationTier={valuationTier}
            revenueMultiple={revenueMultiple}
          />
        ) : (
          /* Free authenticated: locked gauge + CTA */
          <div className="free-cta-section">
            <button
              className="cta-unlock-dashboard"
              onClick={() => navigate('/pricing')}
            >
              {t('dashboard.unlockCta')}
            </button>
            <p className="free-cta-subtext">{t('dashboard.unlockSubtext')}</p>
          </div>
        )}
      </main>

      <footer className="footer">
        <p>
          <span className="disclaimer">
            {t('dashboard.disclaimer')}
          </span>
        </p>
      </footer>
    </div>
  )
}

function SettingsPage() {
  const { user, loading } = useAuth()
  const { t } = useLanguage()
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
          ← {t('pages.backToDashboard')}
        </button>
      </header>

      <main className="main settings-main">
        <div className="settings-grid">
          <div className="settings-section">
            <h2>{t('pages.settingsTitle')}</h2>
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
  const { t } = useLanguage()
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
          ← {t('pages.backToDashboard')}
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
      <LanguageProvider>
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
      </LanguageProvider>
    </BrowserRouter>
  )
}

export default App
