import { useNavigate } from 'react-router-dom'

export default function TermsPage() {
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
          <h1>Terms of Service</h1>
          <p className="policy-updated">Last updated: February 2026</p>

          <section className="policy-section">
            <h2>Service Scope</h2>
            <p>
              TSLA Cheat Code provides educational market analysis tools and automated summaries for
              Tesla stock. Content is informational and does not constitute financial advice.
            </p>
          </section>

          <section className="policy-section">
            <h2>Accounts and Access</h2>
            <p>
              You are responsible for maintaining access to your account and ensuring the
              information associated with your account is accurate.
            </p>
          </section>

          <section className="policy-section">
            <h2>Subscription Billing</h2>
            <p>
              Paid access is billed on a recurring basis until cancellation. You can manage or
              cancel your subscription from the settings page.
            </p>
          </section>

          <section className="policy-section">
            <h2>Liability</h2>
            <p>
              Market outcomes are uncertain. You remain solely responsible for your investment
              decisions and any gains or losses from those decisions.
            </p>
          </section>

          <section className="policy-section">
            <h2>Contact</h2>
            <p>
              For questions about these terms, email{' '}
              <a href="mailto:support@tslacheatcode.com">support@tslacheatcode.com</a> or visit our{' '}
              <a href="/contact">Contact page</a>.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}

