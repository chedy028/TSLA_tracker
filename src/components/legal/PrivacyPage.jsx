import { useNavigate } from 'react-router-dom'

export default function PrivacyPage() {
  const navigate = useNavigate()

  return (
    <div className="app">
      <div className="background-grid" />

      <header className="header">
        <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <span className="logo-emoji">🎮</span>
          <span className="logo-text">TSLA CHEAT CODE</span>
        </div>
        <button className="back-btn" onClick={() => navigate(-1)}>
          ← Back
        </button>
      </header>

      <main className="main policy-main">
        <div className="policy-content">
          <h1>Privacy Policy</h1>
          <p className="policy-updated">Last updated: February 2026</p>

          <section className="policy-section">
            <h2>Information We Store</h2>
            <p>
              We store your account identity, subscription status, and alert preferences needed to
              operate the product. Payment details are handled by Stripe.
            </p>
          </section>

          <section className="policy-section">
            <h2>How Information Is Used</h2>
            <p>
              Account data is used to authenticate users, enforce subscription access, and deliver
              product features like alerts and daily summaries.
            </p>
          </section>

          <section className="policy-section">
            <h2>Third-Party Services</h2>
            <p>
              We rely on providers including Supabase for authentication and storage, Stripe for
              billing, and market data sources for TSLA price information.
            </p>
          </section>

          <section className="policy-section">
            <h2>Your Controls</h2>
            <p>
              You can update account-related settings in the app and contact support for additional
              requests at <a href="mailto:support@tslacheatcode.com">support@tslacheatcode.com</a>.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}

